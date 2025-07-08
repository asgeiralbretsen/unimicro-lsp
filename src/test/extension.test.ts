import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Polyglot LSP Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be activated', async () => {
    const extension = vscode.extensions.getExtension('polyglot-lsp');
    assert.ok(extension, 'Extension should be available');
    
    if (!extension.isActive) {
      await extension.activate();
    }
    assert.ok(extension.isActive, 'Extension should be active');
  });

  test('Configuration should be available', async () => {
    const config = vscode.workspace.getConfiguration('polyglotLsp');
    assert.ok(config, 'Configuration should be available');
    
    const languages = config.get('languages', ['en', 'nb', 'nn']);
    assert.deepStrictEqual(languages, ['en', 'nb', 'nn'], 'Should have correct default languages');
  });

  test('Basic functionality test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});
