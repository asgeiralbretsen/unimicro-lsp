# Change Log

All notable changes to the "uni-lsp" extension will be documented in this file.

## [0.2.0] - 09/07/2025

### Added
- **Automatic Updates**: Hover tooltips and completions update immediately when files change
- **Manual Reload**: Use the command palette (`Cmd/Ctrl+Shift+P`) and search for "Uni LSP: Reload Translations"

## [0.1.0] - 08/07/2025

### Added
- **Hover Translations**: See all language translations when hovering over `t()` function calls
- **Go to Definition**: Cmd/Ctrl+click to jump to translation source files
- **Configuration Support**: Customizable language codes, file paths, and feature toggles
- **Error Handling**: Graceful degradation when translation files are missing or malformed
- **Multi-language Support**: Default support for English (en), Norwegian Bokmål (nb), and Norwegian Nynorsk (nn)
- **Quick Edit Links**: Click links in hover tooltips to edit translations directly

### Configuration Options
- `uniLsp.languages`: Array of language codes to support
- `uniLsp.generatedPath`: Path to generated translation files
- `uniLsp.localesPath`: Path to editable locale files
- `uniLsp.translationFileName`: Name of translation files
- `uniLsp.enableHover`: Enable/disable hover tooltips
- `uniLsp.enableCompletion`: Enable/disable code completion
- `uniLsp.enableGoToDefinition`: Enable/disable go-to-definition

### Technical Improvements
- TypeScript compilation with strict mode
- ESLint configuration for code quality
- LSP client/server architecture for better performance
- Graceful error handling throughout the extension