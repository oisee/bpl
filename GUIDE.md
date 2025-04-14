# BPMN-lite DSL Editor - Installation and Usage Guide

This guide will help you install and use the BPMN-lite DSL Editor.

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd bpmn-lite-dsl-editor
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

4. Start the development server:

```bash
npm start
```

This will open the editor in your default browser.

## Usage

### Editor Interface

The editor interface consists of two main panels:

- **Left Panel**: The code editor where you write your BPMN-lite DSL code.
- **Right Panel**: The preview panel that shows the rendered diagram or AST.

### Writing BPMN-lite DSL

Here's a simple example to get you started:

```
:Order Process

@Customer
  place order
  send: Payment Information
  receive: Order Confirmation

@System
  receive: Payment Information
  process order
  validate payment
  ship order
  send: Order Confirmation
```

### Previewing the Diagram

As you type, the diagram will automatically update in the preview panel. You can switch between different preview formats using the dropdown menu at the top:

- **Mermaid**: The default format, shows a flowchart diagram.
- **DOT**: Shows the diagram in DOT format (not yet fully implemented).
- **BPMN**: Shows the diagram in BPMN format (not yet fully implemented).

### Viewing the AST

You can toggle between the diagram view and the AST view using the "Toggle AST View" button at the top. The AST view shows the internal representation of your BPMN-lite DSL code, which can be useful for debugging.

## Running Tests

To run the test script that demonstrates the parser and transpiler:

```bash
npm test
```

This will parse a sample DSL, generate an AST, and transpile it to Mermaid syntax.

## Syntax Reference

For a complete syntax reference, please refer to the [README.md](README.md) file.

## Troubleshooting

If you encounter any issues:

1. Make sure you have the latest version of Node.js installed.
2. Try clearing your browser cache.
3. Check the console for any error messages.
4. If the diagram doesn't render, check your DSL syntax for errors.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.