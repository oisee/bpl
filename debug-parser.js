// Debug parser to understand what's happening

const fs = require('fs');
const vm = require('vm');

// Load the parser from index.html
function loadParser() {
  const html = fs.readFileSync('src/index.html', 'utf8');
  
  // Extract the parser class definition
  const classMatch = html.match(/class BpmnLiteParser \{[\s\S]*?(\n    \})\n/);
  if (!classMatch) {
    throw new Error('Could not find BpmnLiteParser class in index.html');
  }
  
  // Create a sandbox with required globals
  const sandbox = {
    console: console,
    mermaid: { initialize: () => {} },
    window: {},
    document: {},
    ConnectivityEngine: undefined // Make sure this is undefined
  };
  
  // Execute the parser class in sandbox
  const script = new vm.Script(classMatch[0]);
  const context = vm.createContext(sandbox);
  script.runInContext(context);
  
  return sandbox.BpmnLiteParser;
}

// Simple test
const BpmnLiteParser = loadParser();
const parser = new BpmnLiteParser();

const testDsl = `@Customer
  Task A
  Task B
  Task C`;

console.log('Parsing test DSL...');
try {
  const ast = parser.parse(testDsl);
  console.log('AST:', JSON.stringify(ast, null, 2));
  console.log('\nTasks:', parser.tasks);
  console.log('\nConnections:', parser.connections);
} catch (error) {
  console.error('Parse error:', error);
  console.error(error.stack);
}