import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  ConfigurationRequest
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as fs from 'fs';
import * as path from 'path';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

interface PolyglotConfig {
  languages: string[];
  generatedPath: string;
  localesPath: string;
  translationFileName: string;
}

let config: PolyglotConfig = {
  languages: ['en', 'nb', 'nn'],
  generatedPath: 'app/i18n/generated',
  localesPath: 'app/i18n/locales',
  translationFileName: 'translations.json'
};

const translations: Record<string, Record<string, string>> = {};

async function loadConfiguration(): Promise<void> {
  try {
    const result = await connection.sendRequest(ConfigurationRequest.type, {
      items: [{ section: 'polyglotLsp' }]
    });
    
    if (result && result[0]) {
      const settings = result[0];
      config = {
        languages: settings.languages || ['en', 'nb', 'nn'],
        generatedPath: settings.generatedPath || 'app/i18n/generated',
        localesPath: settings.localesPath || 'app/i18n/locales',
        translationFileName: settings.translationFileName || 'translations.json'
      };
    }
  } catch (error) {
    // Use default config if configuration request fails
    connection.console.log('[LSP] Using default configuration');
  }
}

connection.onInitialize(async (params: InitializeParams) => {
  try {
    await loadConfiguration();
    
    const root = params.rootUri!.replace('file://', '');

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

    let totalKeys = 0;
    
    for (const lang of config.languages) {
      const fullPath = path.join(root, `${config.generatedPath}/${lang}/${config.translationFileName}`);
      try {
        if (fs.existsSync(fullPath)) {
          const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          translations[lang] = flatten(raw);
          totalKeys += Object.keys(translations[lang]).length;
          connection.console.log(`[LSP] Loaded ${lang}: ${Object.keys(translations[lang]).length} keys`);
        } else {
          connection.console.log(`[LSP] No translation file found for ${lang}: ${fullPath}`);
        }
      } catch (err) {
        connection.console.log(`[LSP] Failed to load ${lang}: ${err}`);
      }
    }

    connection.console.log(`[LSP] Total translation keys loaded: ${totalKeys}`);
  } catch (e) {
    connection.console.log(`[LSP] Initialization error: ${e}`);
  }

  return { capabilities: {} };
});

documents.listen(connection);
connection.listen();
