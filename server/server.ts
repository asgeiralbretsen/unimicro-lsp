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

interface UniConfig {
  languages: string[];
  generatedPath: string;
  localesPath: string;
  translationFileName: string;
}

let config: UniConfig = {
  languages: ['en', 'nb', 'nn'],
  generatedPath: 'app/i18n/generated',
  localesPath: 'app/i18n/locales',
  translationFileName: 'translations.json'
};

const translations: Record<string, Record<string, string>> = {};
let workspaceRoot: string = '';
let fileWatchers: fs.FSWatcher[] = [];
let reloadTimeout: NodeJS.Timeout | null = null;

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

async function loadConfiguration(): Promise<void> {
  try {
    const result = await connection.sendRequest(ConfigurationRequest.type, {
      items: [{ section: 'uniLsp' }]
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

async function reloadTranslations(): Promise<void> {
  try {
    // Clear existing translations
    Object.keys(translations).forEach(key => delete translations[key]);
    
    let totalKeys = 0;
    
    for (const lang of config.languages) {
      const fullPath = path.join(workspaceRoot, `${config.generatedPath}/${lang}/${config.translationFileName}`);
      try {
        if (fs.existsSync(fullPath)) {
          const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          translations[lang] = flatten(raw);
          totalKeys += Object.keys(translations[lang]).length;
          connection.console.log(`[LSP] Reloaded ${lang}: ${Object.keys(translations[lang]).length} keys`);
        } else {
          connection.console.log(`[LSP] No translation file found for ${lang}: ${fullPath}`);
        }
      } catch (err) {
        connection.console.log(`[LSP] Failed to reload ${lang}: ${err}`);
      }
    }

    connection.console.log(`[LSP] Total translation keys reloaded: ${totalKeys}`);
  } catch (e) {
    connection.console.log(`[LSP] Reload error: ${e}`);
  }
}

function debouncedReload(): void {
  if (reloadTimeout) {
    clearTimeout(reloadTimeout);
  }
  reloadTimeout = setTimeout(() => {
    reloadTranslations();
    reloadTimeout = null;
  }, 100);
}

function setupFileWatchers(): void {
  // Clear existing watchers
  fileWatchers.forEach(watcher => watcher.close());
  fileWatchers = [];

  // Watch generated translation files
  for (const lang of config.languages) {
    const genPath = path.join(workspaceRoot, `${config.generatedPath}/${lang}/${config.translationFileName}`);
    const locPath = path.join(workspaceRoot, `${config.localesPath}/${lang}/${config.translationFileName}`);
    
    // Watch generated files
    if (fs.existsSync(path.dirname(genPath))) {
      const genWatcher = fs.watch(path.dirname(genPath), (eventType, filename) => {
        if (filename === config.translationFileName) {
          connection.console.log(`[LSP] Generated translation file changed for ${lang}`);
          debouncedReload();
        }
      });
      fileWatchers.push(genWatcher);
    }
    
    // Watch locale files
    if (fs.existsSync(path.dirname(locPath))) {
      const locWatcher = fs.watch(path.dirname(locPath), (eventType, filename) => {
        if (filename === config.translationFileName) {
          connection.console.log(`[LSP] Locale translation file changed for ${lang}`);
          debouncedReload();
        }
      });
      fileWatchers.push(locWatcher);
    }
  }
  
  connection.console.log(`[LSP] Set up ${fileWatchers.length} file watchers`);
}

connection.onInitialize(async (params: InitializeParams) => {
  try {
    await loadConfiguration();
    
    workspaceRoot = params.rootUri!.replace('file://', '');

    await reloadTranslations();
    setupFileWatchers();
  } catch (e) {
    connection.console.log(`[LSP] Initialization error: ${e}`);
  }

  return { capabilities: {} };
});

// Handle manual reload requests from the extension
connection.onNotification('uni/reloadTranslations', async () => {
  connection.console.log('[LSP] Manual reload requested');
  await reloadTranslations();
});

connection.onShutdown(() => {
  // Clean up file watchers
  fileWatchers.forEach(watcher => watcher.close());
  fileWatchers = [];
  
  // Clean up reload timeout
  if (reloadTimeout) {
    clearTimeout(reloadTimeout);
    reloadTimeout = null;
  }
});

documents.listen(connection);
connection.listen();
