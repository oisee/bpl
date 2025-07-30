const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser-fixed.js');

// Test the fixed parser with Issue #4 example
console.log('Testing Fixed Parser - Issue #4\n');

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
  const source = Object.values(parser.tasks).find(t => t.id === conn.sourceRef);
  const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
  console.log(`  ${source?.name || conn.sourceRef} → ${target?.name || conn.targetRef}`);
});