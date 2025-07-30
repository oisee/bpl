// Extract BpmnLiteParser class from src/index.html

const fs = require('fs');

// Read the HTML file
const html = fs.readFileSync('src/index.html', 'utf8');
const lines = html.split('\n');

// Find the parser class
let inClass = false;
let braceCount = 0;
let classLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('class BpmnLiteParser {')) {
    inClass = true;
    braceCount = 0;
  }
  
  if (inClass) {
    classLines.push(line);
    
    // Count braces
    for (const char of line) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }
    
    // Check if class is complete
    if (braceCount === 0 && classLines.length > 1) {
      break;
    }
  }
}

// Extract just the parser code
const parserCode = classLines.join('\n');

// Convert to TypeScript
let tsCode = parserCode;

// Add TypeScript type annotations
tsCode = tsCode.replace(/constructor\(\)/, 'constructor()');
tsCode = tsCode.replace(/parse\(text\)/, 'parse(text: string): any');
tsCode = tsCode.replace(/(\w+)\s*=\s*\[\];/g, 'private $1: any[] = [];');
tsCode = tsCode.replace(/(\w+)\s*=\s*{};/g, 'private $1: Record<string, any> = {};');
tsCode = tsCode.replace(/(\w+)\s*=\s*null;/g, 'private $1: string | null = null;');
tsCode = tsCode.replace(/(\w+)\s*=\s*'';/g, "private $1: string = '';");
tsCode = tsCode.replace(/(\w+)\s*=\s*0;/g, 'private $1: number = 0;');

// Add export
tsCode = '// This is a TypeScript port of the BpmnLiteParser from the main application\nexport ' + tsCode;

// Save the TypeScript version
fs.writeFileSync('vscode-bpmn-lite/src/parser-new.ts', tsCode);

console.log('Extracted parser from HTML');
console.log(`Lines: ${classLines.length}`);
console.log('Saved to: vscode-bpmn-lite/src/parser-new.ts');