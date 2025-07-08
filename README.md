# Polyglot LSP

A VS Code extension that brings localization support to the Unimicro app.

## What It Does

Polyglot LSP detects `t()` function calls in your code and provides:

- **Hover Translations**: See all language translations when hovering over translation keys
- **Go to Definition**: Cmd/Ctrl+click to jump directly to the translation source
- **Quick Edit**: Click links in hover tooltips to go to definition

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

## Setup

### 1. Install the Extension
Build Polyglot LSP from source.

### 2. Project Structure
The extension expects your translation files to follow this structure:

```
root/
├── app/i18n/
│   ├── generated/          # Generated flat translation files
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
  "polyglotLsp.languages": ["en", "nb", "nn"],
  "polyglotLsp.generatedPath": "app/i18n/generated",
  "polyglotLsp.localesPath": "app/i18n/locales",
  "polyglotLsp.translationFileName": "translations.json",
  "polyglotLsp.enableHover": true,
  "polyglotLsp.enableCompletion": true,
  "polyglotLsp.enableGoToDefinition": true
}
```

## Usage Examples

### Basic Translation Key
```javascript
// Hover over this to see all translations
const greeting = t('user.welcome');

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
git clone https://github.com/your-username/polyglot-lsp.git
cd polyglot-lsp
npm install
npm run compile
```

### Debugging
1. Open the project in VS Code
2. Press F5 to start debugging
3. Open a new VS Code window with the extension loaded
4. Check the Debug Console for LSP logs

## Future Implementation Ideas

### Planned Features

**Fix code completion**

**File Watching & Auto-Reload**

**Handle white labeled keys**