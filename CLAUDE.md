# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands
- Build: `npm run build` (copies HTML file to dist/)
- Start: `npm start` (runs http-server on dist/ folder)
- Build VSCode: `cd vscode-bpmn-lite && npm run compile`
- Package VSCode: `cd vscode-bpmn-lite && vsce package`

## Parser Synchronization

The BPL parser exists in two places that must be kept in sync:

1. **Main Application**: `/src/index.html` (JavaScript in HTML)
2. **VSCode Extension**: `/vscode-bpmn-lite/src/parser.ts` (TypeScript)

### Synchronization Process

The parser is synchronized using a semi-automated process:

1. **Primary Development**: Make changes in `/src/index.html` first
2. **Extract and Convert**: Run `node build-parser.js` to:
   - Extract the parser class from index.html
   - Automatically generate a TypeScript version with type annotations
   - Update both locations with the synchronized parser

### How It Works

The `build-parser.js` script:
- Extracts the BpmnLiteParser class from src/index.html
- Adds TypeScript type annotations for properties and methods
- Generates vscode-bpmn-lite/src/parser.ts automatically
- Preserves the exact same logic across both versions

### When to Run Sync

Run `node build-parser.js` after:
- Making any changes to the parser in src/index.html
- Before committing parser changes
- Before creating a release

### Important Files

- Parser in HTML: `/src/index.html` (contains the source parser)
- Parser in VSCode: `/vscode-bpmn-lite/src/parser.ts` (auto-generated)
- Sync script: `/build-parser.js`
- Shared parser code: `/shared/parser-original.js` (extracted copy)

## Code Style Guidelines
- This is a simple HTML/JavaScript project
- The entire application is contained in a single HTML file
- Indentation: 2 spaces
- Naming: camelCase for JavaScript variables and functions
- Error handling: Use try/catch with specific error messages
- JavaScript is vanilla ES6+

## Architecture
- Single page application with a textarea editor and Mermaid diagram renderer
- UI allows switching between diagram view and AST view
- Includes a "Render Diagram" button to update the diagram from the editor content