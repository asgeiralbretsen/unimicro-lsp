import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  HoverParams,
  Hover,
  TextDocumentPositionParams
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Minimal in-memory translation
const translations: Record<string, string> = {
  'App.back': 'Back',
  'App.confirm': 'Confirm',
  'Home.Widgets.QuickActions.title': 'Quick Actions',
};

connection.onInitialize(() => {
  return {
    capabilities: {
      hoverProvider: true,
    },
  };
});

connection.onHover((params: HoverParams): Hover | null => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const { line, character } = params.position;
  const lineText = doc.getText({
    start: { line, character: 0 },
    end: { line, character: 999 },
  });

  const regex = /t\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = regex.exec(lineText))) {
    const key = match[1];
    const start = match.index + match[0].indexOf(key);
    const end = start + key.length;
    if (character >= start && character <= end) {
      const value = translations[key];
      if (value) {
        return {
          contents: { kind: 'markdown', value: `**${value}**` },
        };
      }
    }
  }

  return null;
});

documents.listen(connection);
connection.listen();
