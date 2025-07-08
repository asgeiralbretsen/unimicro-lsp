import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

import { parseTree, findNodeAtLocation } from 'jsonc-parser';

interface UniConfig {
  languages: string[];
  generatedPath: string;
  localesPath: string;
  translationFileName: string;
  enableHover: boolean;
  enableCompletion: boolean;
  enableGoToDefinition: boolean;
}

function getConfig(): UniConfig {
  const config = vscode.workspace.getConfiguration('uniLsp');
  return {
    languages: config.get('languages', ['en', 'nb', 'nn']),
    generatedPath: config.get('generatedPath', 'app/i18n/generated'),
    localesPath: config.get('localesPath', 'app/i18n/locales'),
    translationFileName: config.get('translationFileName', 'translations.json'),
    enableHover: config.get('enableHover', true),
    enableCompletion: config.get('enableCompletion', true),
    enableGoToDefinition: config.get('enableGoToDefinition', true),
  };
}

function hasI18nStructure(workspaceRoot: string): boolean {
  const config = getConfig();
  
  try {
    // Check if at least one language has the expected structure
    for (const lang of config.languages) {
      const genPath = path.join(workspaceRoot, config.generatedPath, lang, config.translationFileName);
      const locPath = path.join(workspaceRoot, config.localesPath, lang, config.translationFileName);
      
      if (fs.existsSync(genPath) || fs.existsSync(locPath)) {
        return true;
      }
    }
    
    // Also check for common alternative structures
    const alternativePaths = [
      'src/i18n',
      'i18n',
      'locales',
      'translations',
      'lang'
    ];
    
    for (const altPath of alternativePaths) {
      for (const lang of config.languages) {
        const genPath = path.join(workspaceRoot, altPath, lang, config.translationFileName);
        const locPath = path.join(workspaceRoot, altPath, lang, config.translationFileName);
        
        if (fs.existsSync(genPath) || fs.existsSync(locPath)) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    // If we can't check the file system, assume it's not a relevant workspace
    return false;
  }
}

function findKeyLine(file: string, flatKey: string): number | null {
  try {
    const text = fs.readFileSync(file, 'utf8');
    const root = parseTree(text);
    if (!root) {return null;}

    const valueNode = findNodeAtLocation(root, flatKey.split('.'));
    if (!valueNode) {return null;}

    const propNode = valueNode.parent?.children?.[0] ?? valueNode;
    const offset   = propNode.offset;

    const line = text.slice(0, offset).split(/\r\n|\r|\n/).length;
    return line;                       
  } catch {
    return null;
  }
}

function getTranslationKeys(workspaceRoot: string): string[] {
  const config = getConfig();
  const keys: string[] = [];
  
  try {
    for (const lang of config.languages) {
      const genFile = path.join(workspaceRoot, `${config.generatedPath}/${lang}/${config.translationFileName}`);
      if (fs.existsSync(genFile)) {
        const flatten = (o: any, p=''): Record<string,string> =>
          Object.entries(o).reduce((a,[k,v]) => {
            const f = p + k;
            return typeof v === 'string'
              ? (a[f]=v,a)
              : Object.assign(a, flatten(v, f + '.'));
          }, {} as Record<string,string>);
        
        const translations = flatten(JSON.parse(fs.readFileSync(genFile,'utf8')));
        keys.push(...Object.keys(translations));
      }
    }
  } catch (error) {
    // Silently fail - this is expected when files don't exist
  }
  
  return [...new Set(keys)]; // Remove duplicates
}

export function activate(ctx: vscode.ExtensionContext) {
  // Check if this workspace has the expected i18n structure
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder || !hasI18nStructure(workspaceFolder.uri.fsPath)) {
    // Don't activate the extension if no i18n structure is found
    return;
  }

  const config = getConfig();

  const serverModule = ctx.asAbsolutePath(path.join('out', 'server', 'server.js'));
  const serverOpts: ServerOptions = {
    run  : { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc,
             options: { execArgv: ['--nolazy', '--inspect=6009'] } },
  };
  const clientOpts: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'javascript'      },
      { scheme: 'file', language: 'typescript'      },
      { scheme: 'file', language: 'javascriptreact' },
      { scheme: 'file', language: 'typescriptreact' }
    ],
  };

  const client = new LanguageClient('uni', 'Uni LSP', serverOpts, clientOpts);
  client.start();
  ctx.subscriptions.push(client);

  const openCmd = 'uni.openLocale';
  
  ctx.subscriptions.push(
    vscode.commands.registerCommand(openCmd,
      async (uriStr: string, line: number) => {
        try {
          const uri = vscode.Uri.parse(uriStr);
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc, {
            selection: new vscode.Range(line - 1, 0, line - 1, 0)
          });
        } catch (error) {
          // Gracefully handle errors without showing to user
        }
      })
  );

  // Hover Provider
  if (config.enableHover) {
    ctx.subscriptions.push(
      vscode.languages.registerHoverProvider(
        [
          { scheme: 'file', language: 'javascript'      },
          { scheme: 'file', language: 'typescript'      },
          { scheme: 'file', language: 'javascriptreact' },
          { scheme: 'file', language: 'typescriptreact' }
        ],
        {
          provideHover(doc, pos) {
            try {
              const text = doc.lineAt(pos.line).text;
              const callRe = /t\s*\(\s*['"]([^'"\)]+)['"]\s*\)/g;
              let m: RegExpExecArray | null;

              while ((m = callRe.exec(text))) {
                const key   = m[1];
                const start = m.index + m[0].indexOf(key);
                const end   = start + key.length;
                if (pos.character < start || pos.character > end) {continue;}

                const ws = vscode.workspace.getWorkspaceFolder(doc.uri);
                if (!ws) {return null;}
                const root = ws.uri.fsPath;

                const md = new vscode.MarkdownString(undefined, true);

                for (const lang of config.languages) {
                  /* value from generated flat file */
                  const genFile = path.join(root, `${config.generatedPath}/${lang}/${config.translationFileName}`);
                  let value: string | undefined;
                  try {
                    const flatten = (o: any, p=''): Record<string,string> =>
                      Object.entries(o).reduce((a,[k,v]) => {
                        const f = p + k;
                        return typeof v === 'string'
                          ? (a[f]=v,a)
                          : Object.assign(a, flatten(v, f + '.'));
                      }, {} as Record<string,string>);
                    value = flatten(JSON.parse(fs.readFileSync(genFile,'utf8')))[key];
                  } catch { /* ignore */ }

                  /* link to editable locale file */
                  const locFile = path.join(root, `${config.localesPath}/${lang}/${config.translationFileName}`);
                  const lineNum = findKeyLine(locFile, key) ?? 1;

                  const args  = encodeURIComponent(JSON.stringify([vscode.Uri.file(locFile).toString(), lineNum]));
                  const link  = `command:${openCmd}?${args}`;

                  md.appendMarkdown(`**${lang}**: ${value ?? '_missing_'} – [edit](${link})  \n`);
                }

                md.isTrusted = { enabledCommands: [openCmd] };
                return new vscode.Hover(md);
              }
              return null;
            } catch (error) {
              // Gracefully handle errors without showing broken hover
              return null;
            }
          }
        }
      )
    );
  }

  // Code Completion Provider
  if (config.enableCompletion) {
    ctx.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        [
          { scheme: 'file', language: 'javascript'      },
          { scheme: 'file', language: 'typescript'      },
          { scheme: 'file', language: 'javascriptreact' },
          { scheme: 'file', language: 'typescriptreact' }
        ],
        {
          provideCompletionItems(document, position) {
            try {
              const linePrefix = document.lineAt(position).text.substr(0, position.character);
              const match = linePrefix.match(/t\s*\(\s*['"]([^'"]*)$/);
              
              if (!match) {return [];}

              const ws = vscode.workspace.getWorkspaceFolder(document.uri);
              if (!ws) {return [];}

              const keys = getTranslationKeys(ws.uri.fsPath);
              const partialKey = match[1];
              
              return keys
                .filter(key => key.toLowerCase().includes(partialKey.toLowerCase()))
                .map(key => {
                  const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Text);
                  item.insertText = key;
                  item.detail = 'Translation key';
                  return item;
                });
            } catch (error) {
              return [];
            }
          }
        },
        '"', "'" // Trigger on quote characters
      )
    );
  }

  // Go to Definition Provider
  if (config.enableGoToDefinition) {
    ctx.subscriptions.push(
      vscode.languages.registerDefinitionProvider(
        [
          { scheme: 'file', language: 'javascript'      },
          { scheme: 'file', language: 'typescript'      },
          { scheme: 'file', language: 'javascriptreact' },
          { scheme: 'file', language: 'typescriptreact' }
        ],
        {
          provideDefinition(document, position) {
            try {
              const text = document.lineAt(position.line).text;
              const callRe = /t\s*\(\s*['"]([^'"\)]+)['"]\s*\)/g;
              let m: RegExpExecArray | null;

              while ((m = callRe.exec(text))) {
                const key   = m[1];
                const start = m.index + m[0].indexOf(key);
                const end   = start + key.length;
                if (position.character < start || position.character > end) {continue;}

                const ws = vscode.workspace.getWorkspaceFolder(document.uri);
                if (!ws) {return null;}

                // Try to find the key in the first available language file
                for (const lang of config.languages) {
                  const locFile = path.join(ws.uri.fsPath, `${config.localesPath}/${lang}/${config.translationFileName}`);
                  if (fs.existsSync(locFile)) {
                    const lineNum = findKeyLine(locFile, key);
                    if (lineNum) {
                      return new vscode.Location(
                        vscode.Uri.file(locFile),
                        new vscode.Position(lineNum - 1, 0)
                      );
                    }
                  }
                }
              }
              return null;
            } catch (error) {
              return null;
            }
          }
        }
      )
    );
  }
}

export function deactivate() {}
