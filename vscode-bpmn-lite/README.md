# BPMN-Lite VS Code Extension

Live preview and syntax highlighting for BPMN-Lite DSL files in Visual Studio Code.

## Features

- **🔴 Live Preview**: See your BPMN diagram update in real-time as you type
- **📊 Split-Screen by Default**: Preview opens to the side, never blocking your text editor
- **🎨 Syntax Highlighting**: Full syntax highlighting for BPMN-Lite DSL
- **📤 Export Options**: Export to Mermaid or JSON (AST) format
- **⚡ Smart Refresh**: Configurable preview refresh with debouncing
- **🎯 Focus Tracking**: Preview only updates for the active document
- **⚠️ Error Highlighting**: Real-time syntax error detection
- **🔍 Navigation Controls**: Pan, zoom, and fit controls for easy diagram exploration
- **🖱️ Mouse Interactions**: Click & drag to pan, Ctrl+scroll to zoom

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   cd vscode-bpmn-lite
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Open VS Code and press `F5` to launch a new Extension Development Host

## Usage

1. Open any `.bpl` file
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and run:
   - `BPMN-Lite: Show Preview` - Opens preview in the same column
   - `BPMN-Lite: Show Preview to the Side` - Opens preview in a side panel
3. Start typing - the preview updates automatically!

## Commands

- `bpmn-lite.showPreview` - Show preview in current column
- `bpmn-lite.showPreviewToSide` - Show preview in side column
- `bpmn-lite.exportMermaid` - Export current file as Mermaid
- `bpmn-lite.exportJSON` - Export current file as JSON (AST)

## Configuration

- `bpmn-lite.preview.autoOpen` - Automatically open preview for .bpl files (default: true)
- `bpmn-lite.preview.openToSide` - Always open preview in split-screen (default: true)
- `bpmn-lite.preview.autoRefresh` - Enable/disable auto-refresh (default: true)
- `bpmn-lite.preview.refreshDelay` - Delay before refresh in ms (default: 300)
- `bpmn-lite.preview.theme` - Mermaid diagram theme (default/dark/forest/neutral)

## Syntax Highlighting

The extension provides full syntax highlighting for:
- Process definitions (`:Process Name`)
- Lanes (`@Lane Name`)
- Tasks (indented lines)
- Gateways (`?Decision Point`)
- Branches (`+positive` / `-negative`)
- Events (`!Start` / `!End`)
- Messages (`send:` / `receive:`)
- Data objects (`#DataName`)
- Comments (`"Comment text`)
- Connections (`->` / `<-`)

## Development

To modify the extension:

1. Make changes to the TypeScript files in `src/`
2. Run `npm run compile` to rebuild
3. Press `F5` to test in a new VS Code window
4. Run `npm run package` to create a VSIX package

## Publishing

To publish to the VS Code marketplace:

```bash
npm install -g vsce
vsce package
vsce publish
```

## License

MIT