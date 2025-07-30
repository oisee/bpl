// Node.js test runner for BPL parser connectivity tests

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
    mermaid: { initialize: () => {} }, // Mock mermaid
    window: {},
    document: {}
  };
  
  // Execute the parser class in sandbox
  const script = new vm.Script(classMatch[0]);
  const context = vm.createContext(sandbox);
  script.runInContext(context);
  
  return sandbox.BpmnLiteParser;
}

// Load test cases
const { testCases, runConnectivityTests } = require('./test-connectivity.js');

try {
  // Load parser
  console.log('Loading parser from src/index.html...');
  const BpmnLiteParser = loadParser();
  
  // Run tests
  console.log('Running connectivity tests...\n');
  const results = runConnectivityTests(BpmnLiteParser);
  
  // Display detailed results
  console.log('=== CONNECTIVITY TEST RESULTS ===\n');
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    console.log(`   Expected: ${result.stats.expected}, Actual: ${result.stats.actual}, Correct: ${result.stats.correct}`);
    
    if (result.stats.missing > 0) {
      console.log(`   Missing connections (${result.stats.missing}):`);
      result.missing.forEach(m => {
        console.log(`     - ${m.from} → ${m.to} (${m.type})`);
      });
    }
    
    if (result.stats.extra > 0) {
      console.log(`   Extra connections (${result.stats.extra}):`);
      result.extra.forEach(e => {
        console.log(`     - ${e.from} → ${e.to} (${e.type})`);
      });
    }
    
    console.log('');
  });
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round(passed / total * 100);
  
  console.log('=== SUMMARY ===');
  console.log(`Tests Passed: ${passed}/${total} (${percentage}%)`);
  console.log(`Total Expected Connections: ${results.reduce((sum, r) => sum + r.stats.expected, 0)}`);
  console.log(`Total Actual Connections: ${results.reduce((sum, r) => sum + r.stats.actual, 0)}`);
  console.log(`Total Correct Connections: ${results.reduce((sum, r) => sum + r.stats.correct, 0)}`);
  
  // Exit with error code if tests failed
  if (passed < total) {
    process.exit(1);
  }
  
} catch (error) {
  console.error('Error running tests:', error);
  process.exit(1);
}