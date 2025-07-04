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

const LANGS = ['en', 'nb', 'nn'] as const;
const GENERATED_BASE_PATH = 'app/i18n/generated';
const LOCALES_BASE_PATH   = 'app/i18n/locales';
const openCmd             = 'polyglot.openLocale';

function findKeyLine(file: string, flatKey: string): number | null {
  try {
    const text = fs.readFileSync(file, 'utf8');
    const root = parseTree(text);
    if (!root) return null;

    const valueNode = findNodeAtLocation(root, flatKey.split('.'));
    if (!valueNode) return null;

    const propNode = valueNode.parent?.children?.[0] ?? valueNode;
    const offset   = propNode.offset;

    const line = text.slice(0, offset).split(/\r\n|\r|\n/).length;
    return line;                       
  } catch {
    return null;
  }
}

export function activate(ctx: vscode.ExtensionContext) {

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

  const client = new LanguageClient('polyglot', 'Polyglot LSP', serverOpts, clientOpts);
  client.start();
  ctx.subscriptions.push(client);

  ctx.subscriptions.push(
    vscode.commands.registerCommand(openCmd,
      async (uriStr: string, line: number) => {
        const uri = vscode.Uri.parse(uriStr);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, {
          selection: new vscode.Range(line - 1, 0, line - 1, 0)
        });
      })
  );

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
          const text = doc.lineAt(pos.line).text;
          const callRe = /t\s*\(\s*['"]([^'"\)]+)['"]\s*\)/g;
          let m: RegExpExecArray | null;

          while ((m = callRe.exec(text))) {
            const key   = m[1];
            const start = m.index + m[0].indexOf(key);
            const end   = start + key.length;
            if (pos.character < start || pos.character > end) continue;

            const ws = vscode.workspace.getWorkspaceFolder(doc.uri);
            if (!ws) return null;
            const root = ws.uri.fsPath;

            const md = new vscode.MarkdownString(undefined, true);

            for (const lang of LANGS) {
              /* value from generated flat file */
              const genFile = path.join(root, `${GENERATED_BASE_PATH}/${lang}/translations.json`);
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
              const locFile = path.join(root, `${LOCALES_BASE_PATH}/${lang}/translations.json`);
              const lineNum = findKeyLine(locFile, key) ?? 1;

              const args  = encodeURIComponent(JSON.stringify([vscode.Uri.file(locFile).toString(), lineNum]));
              const link  = `command:${openCmd}?${args}`;

              md.appendMarkdown(`**${lang}**: ${value ?? '_missing_'} – [edit](${link})  \n`);
            }

            md.isTrusted = { enabledCommands: [openCmd] };
            return new vscode.Hover(md);
          }
          return null;
        }
      }
    )
  );
}

export function deactivate() {}
