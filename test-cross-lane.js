// Test cross-lane connections
const fs = require('fs');

// Extract parser from HTML
const html = fs.readFileSync('src/index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const parserCode = scriptMatch[1];

// Create parser
eval(parserCode);

const testBPL = `:Sprint Development Process

@Developer
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features

@QA
  receive: Code Review Request
  review code`;

console.log('Testing Cross-Lane Connection\n');

const parser = new BpmnLiteParser();
const ast = parser.parse(testBPL);

// Find relevant tasks
const demoFeatures = Object.values(parser.tasks).find(t => t.name === 'demo features');
const receiveCodeReview = Object.values(parser.tasks).find(t => t.name === 'receive: Code Review Request');

console.log('Tasks:');
console.log(`- demo features: ${demoFeatures?.id}`);
console.log(`- receive: Code Review Request: ${receiveCodeReview?.id}`);

// Check connections
console.log('\nConnections from "demo features":');
ast.connections.forEach(conn => {
  if (conn.sourceRef === demoFeatures?.id) {
    const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
    console.log(`  → ${target?.name} (${conn.type})`);
  }
});

console.log('\nConnections to "receive: Code Review Request":');
ast.connections.forEach(conn => {
  if (conn.targetRef === receiveCodeReview?.id) {
    const source = Object.values(parser.tasks).find(t => t.id === conn.sourceRef);
    console.log(`  ← ${source?.name} (${conn.type})`);
  }
});

// Check if the cross-lane connection exists
const hasCrossLaneConnection = ast.connections.some(conn =>
  conn.sourceRef === demoFeatures?.id &&
  conn.targetRef === receiveCodeReview?.id
);

console.log('\n' + '='.repeat(50));
console.log(`Cross-lane connection exists: ${hasCrossLaneConnection ? 'YES ✅' : 'NO ❌'}`);
console.log('='.repeat(50));