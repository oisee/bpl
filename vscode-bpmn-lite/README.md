# BPMN-Lite VS Code Extension

Live preview and syntax highlighting for BPMN-Lite DSL files in Visual Studio Code.

![Version](https://img.shields.io/badge/Version-0.4.27-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-1.74.0+-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## ✨ Features

### 🔴 **Live Preview**
See your BPMN diagram update in real-time as you type - no save required! The preview automatically refreshes with configurable debouncing to ensure smooth performance.

### 📊 **Smart Layout**
- **Split-Screen by Default**: Preview opens to the side, never blocking your text editor
- **Auto-Open**: Automatically shows preview when opening `.bpl` files
- **Persistent State**: Preview maintains zoom and pan position across refreshes

### 🎨 **Rich Editor Experience**
- **Syntax Highlighting**: Full syntax highlighting for all BPMN-Lite DSL elements
- **Error Detection**: Real-time syntax error highlighting with diagnostic messages
- **Auto-Indentation**: Smart indentation for lanes and tasks
- **Code Folding**: Collapse/expand lanes for better navigation

### 📤 **Export Capabilities**
- **PNG Export**: High-quality PNG images with custom DPI settings
- **SVG Export**: Scalable vector graphics for web and print
- **Mermaid Export**: Export to Mermaid diagram syntax
- **JSON Export**: Abstract Syntax Tree for tooling integration
- **BPMN 2.0 Export**: Standard BPMN XML format (coming soon)

### 🖱️ **Interactive Diagram**
- **Pan & Zoom**: Click & drag to pan, Ctrl+scroll to zoom
- **Fit to View**: Auto-fit diagram to preview window
- **Navigation Controls**: Zoom in/out buttons and reset view
- **Responsive Design**: Diagram scales to window size

### ⚡ **Performance Features**
- **Smart Refresh**: Only updates when you stop typing
- **Incremental Parsing**: Efficient parsing for large files
- **Debounced Updates**: Configurable delay prevents flickering
- **Focus Tracking**: Only active document triggers updates

## 📦 Installation

### From VSIX Package (Recommended)
```bash
# Download the latest release
code --install-extension bpmn-lite-0.4.27.vsix
```

### From Source
```bash
# Clone the repository
git clone https://github.com/oisee/bpl.git
cd bpl/vscode-bpmn-lite

# Install dependencies
npm install

# Compile and package
npm run compile
npm run package

# Install the generated VSIX
code --install-extension bpmn-lite-0.4.27.vsix
```

### Development Mode
1. Open the `vscode-bpmn-lite` folder in VS Code
2. Press `F5` to launch Extension Development Host
3. Open any `.bpl` file to test

## 🚀 Usage

### Quick Start
1. Create a new file with `.bpl` extension
2. Start typing - preview opens automatically!
3. Use the toolbar buttons for export options

### Basic Example
```bpl
:My First Process

@Customer
  place order
  send: Payment
  receive: Confirmation

@System
  receive: Payment
  process payment
  send: Confirmation
```

### Keyboard Shortcuts
- `Ctrl+Shift+P` → `BPMN-Lite: Show Preview` - Toggle preview
- `Ctrl+K V` - Show preview to the side (custom binding)

## 📋 Commands

| Command | Description |
|---------|-------------|
| `bpmn-lite.showPreview` | Show preview in current column |
| `bpmn-lite.showPreviewToSide` | Show preview in side column |
| `bpmn-lite.exportMermaid` | Export as Mermaid (.mmd) |
| `bpmn-lite.exportJSON` | Export as JSON AST |
| `bpmn-lite.exportPNG` | Export as PNG image |
| `bpmn-lite.exportSVG` | Export as SVG vector |

## ⚙️ Configuration

Configure the extension via VS Code settings:

```json
{
  // Auto-open preview for .bpl files
  "bpmn-lite.preview.autoOpen": true,
  
  // Always open preview to the side
  "bpmn-lite.preview.openToSide": true,
  
  // Enable auto-refresh on changes
  "bpmn-lite.preview.autoRefresh": true,
  
  // Refresh delay in milliseconds
  "bpmn-lite.preview.refreshDelay": 300,
  
  // Mermaid diagram theme
  "bpmn-lite.preview.theme": "default"
}

## 🎨 Syntax Highlighting

The extension provides comprehensive syntax highlighting with semantic coloring:

### Language Elements
| Element | Syntax | Example |
|---------|--------|---------|
| **Process** | `:Name` | `:Order Process` |
| **Lane/Pool** | `@Name` | `@Customer` |
| **Task** | `  text` | `  validate order` |
| **Send Task** | `send:` | `send: Invoice` |
| **Receive Task** | `receive:` | `receive: Payment` |
| **Gateway** | `?Question` | `?Order Valid` |
| **Positive Branch** | `+text` | `+approve order` |
| **Negative Branch** | `-text` | `-reject order` |
| **Events** | `!Event` | `!Start`, `!End` |
| **Data Object** | `#Name` | `#OrderData` |
| **Comments** | `"text` | `"Check inventory` |
| **Connections** | `->`, `<-` | `task1 -> task2` |

### Advanced Features
- **Cross-lane references**: `@Lane.task`
- **Multiple connections**: `A -> B -> C`
- **Reverse connections**: `A <- B`
- **Custom labels**: `+|Yes| continue`

## 🛠️ Development

### Setup Development Environment
```bash
# Clone and setup
git clone https://github.com/oisee/bpl.git
cd bpl/vscode-bpmn-lite
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch
```

### Testing
1. Press `F5` in VS Code to launch Extension Development Host
2. Create a `.bpl` file and start editing
3. Check console for debug output (`Ctrl+Shift+U`)

### Building & Packaging
```bash
# Build the extension
npm run build

# Create VSIX package
npm run package

# Run tests
npm test
```

### Project Structure
```
vscode-bpmn-lite/
├── src/
│   ├── extension.ts    # Extension entry point
│   ├── parser.ts       # BPL parser implementation
│   └── preview.ts      # Preview panel logic
├── syntaxes/
│   └── bpmn-lite.tmLanguage.json  # Syntax grammar
├── test/
│   └── *.test.js      # Test suites
└── package.json       # Extension manifest
```

## 🚢 Publishing

### Prerequisites
- VS Code Marketplace account
- Personal Access Token
- `vsce` CLI tool

### Publishing Steps
```bash
# Install publishing tool
npm install -g vsce

# Package the extension
vsce package

# Publish to marketplace
vsce publish

# Or publish with version bump
vsce publish minor
```

## 🧪 Testing

The extension includes comprehensive test coverage:

- **Unit Tests**: Parser logic and utilities
- **Integration Tests**: VS Code API integration
- **E2E Tests**: Full workflow validation

Run tests with:
```bash
npm test
npm run test:verbose
```

## 🤝 Contributing

We welcome contributions! Please see the main [Contributing Guide](../README.md#contributing).

### Areas for Contribution
- **Language Features**: Auto-completion, hover info, go-to-definition
- **Diagram Features**: More Mermaid themes, custom styling
- **Export Formats**: Additional export options
- **Performance**: Parser optimizations
- **Documentation**: Tutorials and examples

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

### Recent Updates (v0.4.27)
- ✅ Export uses current .bpl filename by default
- ✅ PNG export with Sharp library
- ✅ Improved cross-lane task resolution
- ✅ Smart End event connections
- ✅ Performance optimizations

## 📄 License

MIT License - Copyright (c) 2025 BPMN-lite DSL Editor Contributors

See [LICENSE](../LICENSE) for full details.

## 🔗 Links

- **Main Repository**: [github.com/oisee/bpl](https://github.com/oisee/bpl)
- **VS Code Marketplace**: [BPMN-Lite](https://marketplace.visualstudio.com/items?itemName=bpmn-lite)
- **Documentation**: [BPMN-Lite Docs](https://docs.bpmn-lite.io)
- **Issue Tracker**: [GitHub Issues](https://github.com/oisee/bpl/issues)

---

<p align="center">
  Made with ❤️ for the VS Code community<br>
  <strong>Happy Process Modeling!</strong>
</p>