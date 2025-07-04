import * as vscode from 'vscode';
import * as path from 'path';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;
console.log('[EXT] Activating extension...');

export function activate(context: vscode.ExtensionContext) {
  const serverModule = context.asAbsolutePath(
  	path.join('out', 'server', 'server.js') 
	);

  const serverOptions: ServerOptions = {
    run:   { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  const clientOptions: LanguageClientOptions = {
  documentSelector: [
    { scheme: 'file', language: 'javascript' },
    { scheme: 'file', language: 'typescript' },
    { scheme: 'file', language: 'javascriptreact' }, 
    { scheme: 'file', language: 'typescriptreact' }, 
  ],
};

  client = new LanguageClient(
    'polyglot-lsp',
    'Polyglot Language Server',
    serverOptions,
    clientOptions
  );

  client.start();
  console.log('[EXT] Language client started');
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
