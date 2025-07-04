import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
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

    const flatten = (obj: any, prefix = ''): Record<string, string> =>
      Object.entries(obj).reduce((acc, [k, v]) => {
        const fullKey = prefix + k;
        if (typeof v === 'string') {
          acc[fullKey] = v;
        } else {
          Object.assign(acc, flatten(v, fullKey + '.'));
        }
        return acc;
      }, {} as Record<string, string>);

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

  return { capabilities: {} };
});

documents.listen(connection);
connection.listen();
