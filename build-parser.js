#!/usr/bin/env node

// Extract the browser parser for tools that consume plain JavaScript.
// The typed VS Code parser is maintained separately and checked by its test suite.
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, 'src/index.html'), 'utf8');
const match = html.match(/class BpmnLiteParser \{[\s\S]*?(\n    \})\n/);
if (!match) throw new Error('BpmnLiteParser not found in src/index.html');
fs.writeFileSync(path.join(__dirname, 'shared/parser-original.js'), match[0].trimEnd() + '\n');
console.log('Updated shared/parser-original.js. Keep vscode-bpmn-lite/src/parser.ts in sync and run its tests.');
