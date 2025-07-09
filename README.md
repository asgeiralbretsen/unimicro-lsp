# Uni LSP

A VS Code extension that brings localization support to the Unimicro app.

## What It Does

Uni LSP detects `t()` function calls in your code and provides:

- **Hover Translations**: See all language translations when hovering over translation keys
- **Go to Definition**: Cmd/Ctrl+click to jump directly to the translation source
- **Quick Edit**: Click links in hover tooltips to go to definition of a specific language
- **Automatic Updates**: Hover tooltips and completions update immediately when files change
- **Manual Reload**: Use the command palette (`Cmd/Ctrl+Shift+P`) and search for "Uni LSP: Reload Translations"

## Features

### Hover Translations
Hover over any `t('key')` call to see translations for all configured languages:

```
t('welcome.message')
```

Shows:
- **en**: Welcome to our app! – [edit]
- **nb**: Velkommen til appen vår! – [edit]  
- **nn**: Velkomen til appen vår! – [edit]

### Go to Definition
Cmd/Ctrl+click on any translation key to jump to its definition in the source translation file.

## Installation

### 1. Install the Extension
Install the latest release from the releases tab in GitHub:
https://github.com/asgeiralbretsen/unimicro-lsp/releases

### 2. Project Structure
The extension expects your translation files to follow this structure (Unimicro App):

```
root/
├── app/i18n/
│   ├── generated/          #  Geneated white-labeled JSON
│   │   ├── en/
│   │   │   └── translations.json
│   │   ├── nb/
│   │   │   └── translations.json
│   │   └── nn/
│   │       └── translations.json
│   └── locales/           # Editable source translation files
│       ├── en/
│       │   └── translations.json
│       ├── nb/
│       │   └── translations.json
│       └── nn/
│           └── translations.json
```

### 3. Configure Settings (Optional)
Customize the extension behavior in VS Code settings:

```json
{
  "uniLsp.languages": ["en", "nb", "nn"],
  "uniLsp.generatedPath": "app/i18n/generated",
  "uniLsp.localesPath": "app/i18n/locales",
  "uniLsp.translationFileName": "translations.json",
  "uniLsp.enableHover": true,
  "uniLsp.enableCompletion": true,
  "uniLsp.enableGoToDefinition": true
}
```

## Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `languages` | `["en", "nb", "nn"]` | Language codes to support |
| `generatedPath` | `"app/i18n/generated"` | Path to generated translation files |
| `localesPath` | `"app/i18n/locales"` | Path to editable locale files |
| `translationFileName` | `"translations.json"` | Name of translation files |
| `enableHover` | `true` | Enable hover tooltips |
| `enableGoToDefinition` | `true` | Enable go-to-definition |

## Development

### Building from Source
```bash
git clone https://github.com/asgeiralbretsen/unimicro-lsp.git
cd unimicro-lsp
npm install
npm run compile

# New release
vsce package
```

### Debugging
1. Open the project in VS Code
2. Press F5 to start debugging
3. Open a new VS Code window with the extension loaded
4. Check the Debug Console for LSP logs

## Future Implementation Ideas

- Fix code completion (TS LSP should assist here when i18n is typed)
- File Watching and Auto-Reload
- Handle white labeled keys