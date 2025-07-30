// Test the exact example from Issue #4
const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser-fixed.js');

const issueExample = `:Sprint Development Process

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
    -report bugs

#SprintBacklog define user stories
#TestResults run tests`;

console.log('Testing Issue #4 - Exact Example from GitHub Issue\n');
console.log('=' . repeat(60));

const parser = new BpmnLiteParser();
const ast = parser.parse(issueExample);

// Find the specific tasks mentioned in the issue
let receiveReviewFeedback = null;
let demoFeatures = null;
let testsPassGateway = null;

Object.values(parser.tasks).forEach(task => {
  if (task.name === 'receive: Review Feedback') {
    receiveReviewFeedback = task;
  } else if (task.name === 'demo features') {
    demoFeatures = task;
  } else if (task.name === 'Tests Pass' && task.type === 'gateway') {
    testsPassGateway = task;
  }
});

console.log('\nTasks found:');
console.log(`- receive: Review Feedback: ${receiveReviewFeedback ? 'YES' : 'NO'} (ID: ${receiveReviewFeedback?.id})`);
console.log(`- demo features: ${demoFeatures ? 'YES' : 'NO'} (ID: ${demoFeatures?.id})`);
console.log(`- Tests Pass gateway: ${testsPassGateway ? 'YES' : 'NO'} (ID: ${testsPassGateway?.id})`);

// Check for the problematic connection
const hasDirectConnection = ast.connections.some(conn => 
  conn.sourceRef === receiveReviewFeedback?.id && 
  conn.targetRef === demoFeatures?.id
);

console.log('\n' + '=' . repeat(60));
console.log('ISSUE #4 TEST RESULT:');
console.log('=' . repeat(60));
console.log(`\n❓ Is there a direct connection from "receive: Review Feedback" to "demo features"?`);
console.log(`   ${hasDirectConnection ? '❌ YES - BUG STILL EXISTS!' : '✅ NO - BUG IS FIXED!'}`);

// Show the actual connections for these tasks
console.log('\nActual connections from "receive: Review Feedback":');
ast.connections.forEach(conn => {
  if (conn.sourceRef === receiveReviewFeedback?.id) {
    const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
    console.log(`  → ${target?.name}`);
  }
});

console.log('\nActual connections to "demo features":');
ast.connections.forEach(conn => {
  if (conn.targetRef === demoFeatures?.id) {
    const source = Object.values(parser.tasks).find(t => t.id === conn.sourceRef);
    console.log(`  ← ${source?.name}`);
  }
});

console.log('\n' + '=' . repeat(60));
console.log('CONCLUSION:');
if (!hasDirectConnection) {
  console.log('✅ Issue #4 is RESOLVED! The gateway bypass connection has been eliminated.');
  console.log('   Flow now correctly goes through the gateway.');
} else {
  console.log('❌ Issue #4 is NOT resolved. The problematic connection still exists.');
}
console.log('=' . repeat(60));