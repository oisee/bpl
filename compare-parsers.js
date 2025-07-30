// Compare the two parser implementations to see how out of sync they are

const fs = require('fs');

// Extract parser from HTML
const htmlContent = fs.readFileSync('src/index.html', 'utf8');
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
const jsParserCode = scriptMatch ? scriptMatch[1] : '';

// Extract the BpmnLiteParser class from the JavaScript
const jsClassMatch = jsParserCode.match(/class BpmnLiteParser \{[\s\S]*?^\s{4}\}/m);
const jsMethodNames = [];
const jsMethodRegex = /^\s{6}(\w+)\(/gm;
let match;
while ((match = jsMethodRegex.exec(jsParserCode)) !== null) {
  if (!match[1].startsWith('constructor')) {
    jsMethodNames.push(match[1]);
  }
}

// Read TypeScript parser
const tsContent = fs.readFileSync('vscode-bpmn-lite/src/parser.ts', 'utf8');
const tsMethodNames = [];
const tsMethodRegex = /^\s{4}(?:private\s+)?(\w+)\(/gm;
while ((match = tsMethodRegex.exec(tsContent)) !== null) {
  if (!match[1].startsWith('constructor')) {
    tsMethodNames.push(match[1]);
  }
}

console.log('Parser Comparison Report');
console.log('========================\n');

console.log('JavaScript Parser (src/index.html):');
console.log(`  Total methods: ${jsMethodNames.length}`);
console.log(`  Methods: ${jsMethodNames.slice(0, 10).join(', ')}...`);

console.log('\nTypeScript Parser (vscode-bpmn-lite/src/parser.ts):');
console.log(`  Total methods: ${tsMethodNames.length}`);
console.log(`  Methods: ${tsMethodNames.slice(0, 10).join(', ')}...`);

// Find common methods
const jsSet = new Set(jsMethodNames);
const tsSet = new Set(tsMethodNames);
const common = [...jsSet].filter(m => tsSet.has(m));
const jsOnly = [...jsSet].filter(m => !tsSet.has(m));
const tsOnly = [...tsSet].filter(m => !jsSet.has(m));

console.log('\nMethod Comparison:');
console.log(`  Common methods: ${common.length}`);
console.log(`  JS-only methods: ${jsOnly.length} - ${jsOnly.join(', ')}`);
console.log(`  TS-only methods: ${tsOnly.length} - ${tsOnly.join(', ')}`);

// Check if connectSequentialTasks is the same
console.log('\nChecking connectSequentialTasks method...');
const jsConnectMatch = jsParserCode.match(/connectSequentialTasks\(\) \{[\s\S]*?^\s{4}\}/m);
const tsConnectMatch = tsContent.match(/private connectSequentialTasks\(\): void \{[\s\S]*?^\s{4}\}/m);

if (jsConnectMatch && tsConnectMatch) {
  const jsLines = jsConnectMatch[0].split('\n').length;
  const tsLines = tsConnectMatch[0].split('\n').length;
  console.log(`  JS version: ${jsLines} lines`);
  console.log(`  TS version: ${tsLines} lines`);
  
  // Basic similarity check
  const jsNormalized = jsConnectMatch[0].replace(/\s+/g, ' ').toLowerCase();
  const tsNormalized = tsConnectMatch[0].replace(/\s+/g, ' ').toLowerCase();
  const similarity = jsNormalized.length > 0 ? 
    (jsNormalized.split(' ').filter(word => tsNormalized.includes(word)).length / jsNormalized.split(' ').length * 100).toFixed(1) : 0;
  
  console.log(`  Similarity: ~${similarity}%`);
}

console.log('\nRecommendation:');
console.log('The parsers are largely similar but maintained separately.');
console.log('Consider creating a shared parser module that both can use.');
console.log('This would prevent sync issues like the one we just fixed.');