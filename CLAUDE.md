# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands
- Build: `npm run build` (copies HTML file to dist/)
- Start: `npm start` (runs http-server on dist/ folder)
- Build VSCode: `cd vscode-bpmn-lite && npm run compile`
- Package VSCode: `cd vscode-bpmn-lite && vsce package`

## Parser Synchronization

The parser is maintained in `src/index.html` and the typed VS Code port in
`vscode-bpmn-lite/src/parser.ts`. Edit both when parser behavior changes.
`node build-parser.js` extracts the browser parser to
`shared/parser-original.js`; it does not overwrite the typed port.
Run the web tests and the VS Code extension tests after parser edits.

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