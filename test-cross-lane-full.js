// Test cross-lane connections with full example
const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser-fixed.js');

const fullExample = `:Sprint Development Process

@ProductOwner
  define user stories
  prioritize backlog
  send: Sprint Goals
  review demo
  ?Accept Stories
    +update release notes
    -request changes

@Developer
  receive: Sprint Goals
  estimate tasks
  implement features
  send: Code Review Request
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features

@QA
  receive: Code Review Request
  review code
  run tests
  send: Review Feedback
  ?Quality Check
    +approve release
    -report bugs`;

console.log('Testing Cross-Lane Connections\n');
console.log('=' . repeat(60));

const parser = new BpmnLiteParser();
const ast = parser.parse(fullExample);

// Find relevant tasks
const updateReleaseNotes = Object.values(parser.tasks).find(t => t.name === 'update release notes');
const receiveSprintGoals = Object.values(parser.tasks).find(t => t.name === 'receive: Sprint Goals');
const demoFeatures = Object.values(parser.tasks).find(t => t.name === 'demo features');
const receiveCodeReview = Object.values(parser.tasks).find(t => t.name === 'receive: Code Review Request');

console.log('\nExpected Cross-Lane Connections:');
console.log('1. update release notes → receive: Sprint Goals');
console.log('2. demo features → receive: Code Review Request');

// Check connection 1
console.log('\n--- Connection 1 ---');
console.log(`update release notes ID: ${updateReleaseNotes?.id}`);
console.log(`receive: Sprint Goals ID: ${receiveSprintGoals?.id}`);

const hasConnection1 = ast.connections.some(conn =>
  conn.sourceRef === updateReleaseNotes?.id &&
  conn.targetRef === receiveSprintGoals?.id
);

console.log(`Connection exists: ${hasConnection1 ? 'YES ✅' : 'NO ❌'}`);

// Check connection 2
console.log('\n--- Connection 2 ---');
console.log(`demo features ID: ${demoFeatures?.id}`);
console.log(`receive: Code Review Request ID: ${receiveCodeReview?.id}`);

const hasConnection2 = ast.connections.some(conn =>
  conn.sourceRef === demoFeatures?.id &&
  conn.targetRef === receiveCodeReview?.id
);

console.log(`Connection exists: ${hasConnection2 ? 'YES ✅' : 'NO ❌'}`);

// Show all connections for these tasks
console.log('\n' + '=' . repeat(60));
console.log('Actual connections:');

console.log('\nFrom "update release notes":');
ast.connections.forEach(conn => {
  if (conn.sourceRef === updateReleaseNotes?.id) {
    const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
    console.log(`  → ${target?.name}`);
  }
});

console.log('\nFrom "demo features":');
ast.connections.forEach(conn => {
  if (conn.sourceRef === demoFeatures?.id) {
    const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
    console.log(`  → ${target?.name}`);
  }
});

console.log('\n' + '=' . repeat(60));
console.log('SUMMARY:');
console.log(`Cross-lane connections working: ${(hasConnection1 && hasConnection2) ? 'YES ✅' : 'NO ❌'}`);