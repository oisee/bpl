// Extract the complete parser from src/index.html
const fs = require('fs');

const html = fs.readFileSync('src/index.html', 'utf8');

// Find the parser class
const classStart = html.indexOf('class BpmnLiteParser {');
const classEnd = html.indexOf('\n    }', classStart) + 6; // Include the closing brace

if (classStart === -1 || classEnd === -1) {
  console.error('Could not find BpmnLiteParser class');
  process.exit(1);
}

const parserCode = html.substring(classStart, classEnd);

// Create the shared parser module
const sharedParser = `/**
 * Shared BPL Parser Module
 * This is the single source of truth for the BPL parser logic
 * Used by both the web application and VS Code extension
 * 
 * IMPORTANT: This file is auto-generated from src/index.html
 * Do not edit directly - make changes in src/index.html and run npm run build-parser
 */

${parserCode}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js / CommonJS
  module.exports = { BpmnLiteParser };
} else if (typeof define === 'function' && define.amd) {
  // AMD
  define([], function() { return { BpmnLiteParser }; });
} else {
  // Browser global
  window.BpmnLiteParser = BpmnLiteParser;
}
`;

// Write the shared parser
fs.writeFileSync('shared/bpmn-lite-parser.js', sharedParser);
console.log('Extracted parser to shared/bpmn-lite-parser.js');

// Also create a TypeScript version for the VS Code extension
const tsParser = `/**
 * Shared BPL Parser Module (TypeScript)
 * Auto-generated from shared/bpmn-lite-parser.js
 */

export ${parserCode.replace(/^    /gm, '')}
`;

fs.writeFileSync('shared/bpmn-lite-parser.ts', tsParser);
console.log('Created TypeScript version at shared/bpmn-lite-parser.ts');