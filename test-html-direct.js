// Test the parser from the HTML file directly
const fs = require('fs');

// Read and extract the parser from HTML
const htmlContent = fs.readFileSync('./dist/index.html', 'utf8');

// Extract the BpmnLiteParser class - it's in the first script tag
const scriptMatches = htmlContent.match(/<script>([\s\S]*?)<\/script>/g);
if (!scriptMatches || scriptMatches.length === 0) {
  console.error('Could not find script tags');
  process.exit(1);
}

// The parser is in the first script tag
const parserScript = scriptMatches[0].replace(/<script>|<\/script>/g, '');

// Check if it contains BpmnLiteParser
if (!parserScript.includes('class BpmnLiteParser')) {
  console.error('Could not find BpmnLiteParser class');
  process.exit(1);
}

// Evaluate the script content
try {
  eval(parserScript);
  console.log('Parser script evaluated successfully');
  console.log('BpmnLiteParser available:', typeof BpmnLiteParser !== 'undefined');
} catch (error) {
  console.error('Error evaluating parser script:', error.message);
  console.log('Script length:', parserScript.length);
  console.log('First 200 chars:', parserScript.substring(0, 200));
  process.exit(1);
}

// Now test it
console.log('\nTesting Fixed Parser from dist/index.html\n');

const testBPL = `:Sprint Development Process
@Developer
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features`;

const parser = new BpmnLiteParser();
const ast = parser.parse(testBPL);

// Find specific tasks
let receiveReviewFeedback = null;
let demoFeatures = null;
let testsPassGateway = null;
let deployToStaging = null;

Object.values(parser.tasks).forEach(task => {
  if (task.name === 'receive: Review Feedback') {
    receiveReviewFeedback = task;
  } else if (task.name === 'demo features') {
    demoFeatures = task;
  } else if (task.name === 'Tests Pass') {
    testsPassGateway = task;
  } else if (task.name === 'deploy to staging') {
    deployToStaging = task;
  }
});

console.log('Checking connections...\n');

// Check for the problematic connection
const hasDirectConnection = ast.connections.some(conn => 
  conn.sourceRef === receiveReviewFeedback.id && 
  conn.targetRef === demoFeatures.id
);

console.log(`Direct connection (receive -> demo): ${hasDirectConnection ? '❌ EXISTS (BUG)' : '✅ FIXED!'}`);

// Check expected connections
const expectedConnections = [
  { from: receiveReviewFeedback, to: testsPassGateway, name: 'receive -> gateway' },
  { from: testsPassGateway, to: deployToStaging, name: 'gateway -> deploy' },
  { from: deployToStaging, to: demoFeatures, name: 'deploy -> demo' }
];

console.log('\nExpected connections:');
expectedConnections.forEach(({ from, to, name }) => {
  const exists = ast.connections.some(conn => 
    conn.sourceRef === from.id && conn.targetRef === to.id
  );
  console.log(`  ${name}: ${exists ? '✅' : '❌'}`);
});

// Show all connections
console.log('\nAll connections:');
ast.connections.forEach(conn => {
  if (conn.type === 'sequenceFlow') {
    const source = Object.values(parser.tasks).find(t => t.id === conn.sourceRef);
    const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
    console.log(`  ${source?.name || conn.sourceRef} → ${target?.name || conn.targetRef}`);
  }
});