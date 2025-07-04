import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  Hover,
  HoverParams,
  InitializeParams
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as fs from 'fs';
import * as path from 'path';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

const BASE_PATH = 'app/i18n/generated';

const LANGS = ['en', 'nb', 'nn'] as const;

type Lang = typeof LANGS[number];
const translations: Record<Lang, Record<string, string>> = {
  en: {},
  nb: {},
  nn: {},
};

connection.onInitialize((_params: InitializeParams) => {
  try {
    const root = _params.rootUri!.replace('file://', '');
    const flatten = (obj: any, prefix = ''): Record<string, string> => {
      return Object.entries(obj).reduce((acc, [k, v]) => {
        const fullKey = prefix + k;
        if (typeof v === 'string') {
          acc[fullKey] = v;
        } else {
          Object.assign(acc, flatten(v, fullKey + '.'));
        }
        return acc;
      }, {} as Record<string, string>);
    };

    LANGS.forEach((lang) => {
      const fullPath = path.join(root, `${BASE_PATH}/${lang}/translations.json`);
      try {
        const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        translations[lang] = flatten(raw);
      } catch (err) {
        connection.console.error(`[LSP] Failed to load ${lang}: ${err}`);
      }
    });

    connection.console.log(`[LSP] Loaded translation keys: ${Object.keys(translations.en).length}`);
  } catch (e) {
    connection.console.error(`Cannot load translations: ${e}`);
  }

  return { capabilities: { hoverProvider: true } };
});

connection.onHover((params: HoverParams): Hover | null => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const { line, character } = params.position;
  const lineText = doc.getText({
    start: { line, character: 0 },
    end: { line, character: 9999 }
  });

  const regex = /t\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(lineText))) {
    const key = match[1];
    const start = match.index + match[0].indexOf(key);
    const end = start + key.length;

    if (character >= start && character <= end) {
      const hoverLines = LANGS.map((lang) => {
        const val = translations[lang][key];
        return val ? `**${lang}**: ${val}` : `**${lang}**: _missing_`;
      });

      return {
        contents: {
          kind: 'markdown',
          value: hoverLines.join('\n\n') 
        },
      };
    }
  }

  return null;
});

documents.listen(connection);
connection.listen();
