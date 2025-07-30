// Test for Issue #4: Unnecessary Connection Between Tasks
// Testing the specific example from the GitHub issue

const fs = require('fs');

// Load the BPL parser from the main index.html
const htmlContent = fs.readFileSync('./dist/index.html', 'utf8');

// Extract the BpmnLiteParser class more carefully
const startIndex = htmlContent.indexOf('class BpmnLiteParser {');
if (startIndex === -1) {
  console.error('Could not find BpmnLiteParser in index.html');
  process.exit(1);
}

// Find the end of the class by counting braces
let braceCount = 0;
let inString = false;
let escapeNext = false;
let endIndex = startIndex;

for (let i = startIndex; i < htmlContent.length; i++) {
  const char = htmlContent[i];
  
  if (escapeNext) {
    escapeNext = false;
    continue;
  }
  
  if (char === '\\') {
    escapeNext = true;
    continue;
  }
  
  if (char === '"' || char === "'") {
    inString = !inString;
    continue;
  }
  
  if (!inString) {
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
}

const parserCode = htmlContent.substring(startIndex, endIndex);
eval(parserCode);

// Test the specific example from Issue #4
console.log('Testing Issue #4: Unnecessary Connection Between Tasks');
console.log('=======================================================\n');

const testBPL = `:Sprint Development Process

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

const parser = new BpmnLiteParser();
const ast = parser.parse(testBPL);

// Find the specific tasks mentioned in the issue
let receiveReviewFeedback = null;
let demoFeatures = null;
let testsPassGateway = null;

// Search through all tasks
Object.values(ast.processes[0].lanes).forEach(lane => {
  lane.elements.forEach(element => {
    if (element.name === 'receive: Review Feedback') {
      receiveReviewFeedback = element;
    } else if (element.name === 'demo features') {
      demoFeatures = element;
    } else if (element.name === 'Tests Pass') {
      testsPassGateway = element;
    }
  });
});

console.log('Found tasks:');
console.log('- receive: Review Feedback:', receiveReviewFeedback?.id);
console.log('- Tests Pass gateway:', testsPassGateway?.id);
console.log('- demo features:', demoFeatures?.id);
console.log('');

// Check for the problematic connection
console.log('Checking connections from "receive: Review Feedback"...');
const connectionsFromReceiveReviewFeedback = ast.connections.filter(conn => 
  conn.sourceRef === receiveReviewFeedback?.id
);

console.log(`Found ${connectionsFromReceiveReviewFeedback.length} connections:`);
connectionsFromReceiveReviewFeedback.forEach(conn => {
  const targetTask = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
  console.log(`  -> ${targetTask?.name} (${conn.targetRef})`);
});

console.log('\nChecking if there is a direct connection to "demo features"...');
const hasDirectConnection = ast.connections.some(conn => 
  conn.sourceRef === receiveReviewFeedback?.id && 
  conn.targetRef === demoFeatures?.id
);

if (hasDirectConnection) {
  console.log('❌ ISSUE CONFIRMED: Found unnecessary connection from "receive: Review Feedback" to "demo features"');
} else {
  console.log('✅ No direct connection found (issue may be fixed)');
}

// Also check what should be the correct connections
console.log('\nExpected connection flow:');
console.log('1. receive: Review Feedback -> Tests Pass (gateway)');
console.log('2. Tests Pass -> deploy to staging (positive branch)');
console.log('3. Tests Pass -> fix issues (negative branch)');
console.log('4. deploy to staging -> demo features');

// Verify the correct flow
const receiveToGateway = ast.connections.some(conn => 
  conn.sourceRef === receiveReviewFeedback?.id && 
  conn.targetRef === testsPassGateway?.id
);

console.log(`\n✓ receive: Review Feedback -> Tests Pass: ${receiveToGateway ? 'EXISTS' : 'MISSING'}`);

// Check gateway branches
const gatewayConnections = ast.connections.filter(conn => 
  conn.sourceRef === testsPassGateway?.id
);

console.log(`\nGateway "Tests Pass" has ${gatewayConnections.length} outgoing connections:`);
gatewayConnections.forEach(conn => {
  const targetTask = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
  console.log(`  -> ${targetTask?.name} (${conn.targetRef})`);
});

// Find deploy to staging task
const deployToStaging = Object.values(parser.tasks).find(t => t.name === 'deploy to staging');
if (deployToStaging) {
  const deployToDemoConnections = ast.connections.filter(conn => 
    conn.sourceRef === deployToStaging.id && 
    conn.targetRef === demoFeatures?.id
  );
  console.log(`\n✓ deploy to staging -> demo features: ${deployToDemoConnections.length > 0 ? 'EXISTS' : 'MISSING'}`);
}

// Summary
console.log('\n=== SUMMARY ===');
if (hasDirectConnection) {
  console.log('The issue is present: There is an unnecessary direct connection from');
  console.log('"receive: Review Feedback" to "demo features", bypassing the gateway logic.');
} else {
  console.log('The issue appears to be resolved or not present in the current code.');
}