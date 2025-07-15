// Quick test to check ship order connections
const fs = require('fs');

// Load the parser from the built file
const htmlContent = fs.readFileSync('dist/index.html', 'utf8');

// Extract script content
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('Could not find script in HTML');
  process.exit(1);
}

// Set up minimal browser environment
global.window = global;
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  addEventListener: () => null
};
global.localStorage = {
  getItem: () => null,
  setItem: () => null
};

// Load the parser
try {
  eval(scriptMatch[1]);
} catch (e) {
  // Ignore UI errors
}

// Test the specific case
const parser = new BpmnLiteParser();

const bpl = `:Process Name
@Customer
  place order
  send: Payment
  receive: Confirmation
@System  
  receive: Payment
  ?Payment Valid
    +ship order
    -cancel order
  send: Confirmation`;

console.log('Testing BPL parsing...\n');

const result = parser.parse(bpl);

// Find ship order task
const shipOrder = Object.values(result.tasks).find(t => 
  t.name && t.name.toLowerCase().includes('ship order')
);

if (shipOrder) {
  console.log(`Found ship order task: ${shipOrder.id}`);
  
  // Check outgoing connections
  const outgoing = result.connections.filter(c => c.sourceRef === shipOrder.id);
  console.log(`\nOutgoing connections from ship order:`);
  outgoing.forEach(c => {
    const target = result.tasks[c.targetRef] || { name: c.targetRef };
    console.log(`  -> ${target.name} (${c.targetRef})`);
    if (c.sourceRef === c.targetRef) {
      console.error('  ❌ SELF-CONNECTION DETECTED!');
    }
  });
  
  // Check incoming connections  
  const incoming = result.connections.filter(c => c.targetRef === shipOrder.id);
  console.log(`\nIncoming connections to ship order:`);
  incoming.forEach(c => {
    const source = result.tasks[c.sourceRef] || { name: c.sourceRef };
    console.log(`  <- ${source.name} (${c.sourceRef})`);
  });
} else {
  console.error('Could not find ship order task!');
}

// Check all self-connections
const selfConnections = result.connections.filter(c => c.sourceRef === c.targetRef);
if (selfConnections.length > 0) {
  console.error('\n❌ SELF-CONNECTIONS FOUND:');
  selfConnections.forEach(c => {
    const task = result.tasks[c.sourceRef];
    console.error(`  ${task ? task.name : c.sourceRef} -> itself`);
  });
} else {
  console.log('\n✓ No self-connections found');
}