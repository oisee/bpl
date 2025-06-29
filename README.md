# BPMN-Lite Editor

A minimal, intuitive domain-specific language (DSL) for describing business process diagrams with visual rendering and export capabilities.

## Overview

BPMN-Lite Editor is a lightweight tool that allows you to create business process diagrams using a simple text-based syntax. The editor parses your DSL code into an Abstract Syntax Tree (AST) and renders it as a Mermaid flowchart. It supports both web-based and desktop (Electron) deployment.

## Current Development Status

- **Parser Implementation**: Custom JavaScript parser (not tree-sitter)
- **Rendering**: Mermaid.js for diagram visualization
- **Platform**: Electron desktop app + web-based editor
- **Export Formats**: BPL (source), JSON (AST), Mermaid, Excel (Visio-compatible)
- **Build Status**: ✅ Working

## Features

- **Simple DSL Syntax**: Write business processes in plain text
- **Live Preview**: See your diagram update as you type
- **Multiple Views**: Switch between Diagram, AST, and Mermaid code views
- **Gateway Support**: XOR gateways with custom branch labels
- **Message Flows**: Automatic connection between send/receive tasks
- **Data Objects**: Attach data to process steps
- **Cross-Lane Flows**: Automatic sequential connectivity
- **Export Options**:
  - `.bpl` - Source code format
  - `.json` - Abstract Syntax Tree
  - `.mmd` - Mermaid diagram code
  - `.xlsx` - Excel format for Visio import

## Installation

### Prerequisites

- Node.js v14+ and npm v6+
- Python 3.6+ (only for Excel export)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd bpl

# Install dependencies
npm install

# Build the project
npm run build

# Start the Electron app
npm start

# Or start web server
npm run start:web
```

### Python Dependencies (for Excel export)

```bash
cd tools
pip install -r requirements.txt
```

## DSL Syntax

### Basic Structure

```
:Process Name

@Lane1
  task 1
  task 2

@Lane2
  task 3
  task 4
```

### Task Types

```
# Regular task
do something

# Send message
send: Message Name

# Receive message
receive: Message Name

# Gateway
?Decision Point
  +positive branch
  -negative branch

# Data object
#DataName task reference

# Comment
"This appears in the diagram
```

### Connections

```
# Sequential (automatic within lanes)
task 1
task 2

# Explicit connections
task A -> task C
task B <- task D

# Message flows
^MessageName @Lane1.task -> @Lane2.task
```

### Example

```
:Order Process

@Customer
  place order
  send: Payment Information
  receive: Order Confirmation

@System
  receive: Payment Information
  validate payment
  ?Payment OK
    +ship order
    -cancel order
  send: Order Confirmation

#OrderData place order
```

## Building from Source

```bash
# Install dependencies
npm install

# Build distribution files
npm run build

# Create portable Windows package
./create-portable.sh

# Build installers for all platforms
npm run dist:all
```

## Testing

Currently, there are no automated tests. The application includes manual test cases in the source code that run on page load.

## Architecture

- **Parser**: `BpmnLiteParser` class in `src/index.html`
- **Main Process**: `main.js` - Electron application entry
- **Build System**: `build.js` - Copies files to dist/
- **Export Tools**: `tools/ast_to_visio.py` - Excel export

## Export to Visio

1. Create your diagram in the editor
2. Click "Save .xlsx" 
3. Open Excel file in Visio:
   - Data → Link Data to Shapes
   - Select the "Visio_01" named range
   - Map columns to shape properties

## Known Issues

- No automated test suite
- Excel export requires Python installation
- Limited to XOR gateways (no AND/OR gateways)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details