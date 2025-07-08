# Change Log

All notable changes to the "polyglot-lsp" extension will be documented in this file.

## [0.1.0] - 08/07/2025

### Added
- **Hover Translations**: See all language translations when hovering over `t()` function calls
- **Go to Definition**: Cmd/Ctrl+click to jump to translation source files
- **Configuration Support**: Customizable language codes, file paths, and feature toggles
- **Error Handling**: Graceful degradation when translation files are missing or malformed
- **Multi-language Support**: Default support for English (en), Norwegian Bokmål (nb), and Norwegian Nynorsk (nn)
- **Quick Edit Links**: Click links in hover tooltips to edit translations directly

### Configuration Options
- `polyglotLsp.languages`: Array of language codes to support
- `polyglotLsp.generatedPath`: Path to generated translation files
- `polyglotLsp.localesPath`: Path to editable locale files
- `polyglotLsp.translationFileName`: Name of translation files
- `polyglotLsp.enableHover`: Enable/disable hover tooltips
- `polyglotLsp.enableCompletion`: Enable/disable code completion
- `polyglotLsp.enableGoToDefinition`: Enable/disable go-to-definition

### Technical Improvements
- TypeScript compilation with strict mode
- ESLint configuration for code quality
- LSP client/server architecture for better performance
- Graceful error handling throughout the extension