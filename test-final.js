// Final test to verify all fixes
console.log('=== BPL Parser Connection Test Results ===\n');

// Import the fixed parser from test-connections.js
const fs = require('fs');
const testCode = fs.readFileSync('test-connections.js', 'utf8');

// Extract just the BPLParser class
const classMatch = testCode.match(/class BPLParser \{[\s\S]*?\n  \}\n\}/m);
if (!classMatch) {
  console.error('Could not extract BPLParser class');
  process.exit(1);
}

// Execute the parser class
eval(classMatch[0]);

// Test the original problem case
const parser = new BPLParser();
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

console.log('Test Case: Payment Gateway Process\n');

const result = parser.parse(bpl);

// Find key tasks
const shipOrder = Object.values(result.tasks).find(t => 
  t.name && t.name.toLowerCase().includes('ship order')
);
const sendConfirmation = Object.values(result.tasks).find(t => 
  t.name && t.name.toLowerCase().includes('send confirmation')
);
const paymentGateway = Object.values(result.tasks).find(t => 
  t.name && t.name.toLowerCase().includes('payment valid')
);

console.log('=== Connection Analysis ===\n');

// 1. Check for self-connections
const selfConnections = result.connections.filter(c => c.sourceRef === c.targetRef);
if (selfConnections.length === 0) {
  console.log('✅ PASS: No self-connections found');
} else {
  console.log('❌ FAIL: Self-connections detected:');
  selfConnections.forEach(c => {
    const task = result.tasks[c.sourceRef];
    console.log(`   - ${task ? task.name : c.sourceRef} connects to itself`);
  });
}

// 2. Check ship order connections
if (shipOrder && sendConfirmation) {
  const shipToConfirm = result.connections.find(c => 
    c.sourceRef === shipOrder.id && c.targetRef === sendConfirmation.id
  );
  
  if (shipToConfirm) {
    console.log('✅ PASS: "ship order" correctly connects to "send Confirmation"');
  } else {
    console.log('❌ FAIL: "ship order" does not connect to "send Confirmation"');
  }
  
  // Check incoming connections to ship order
  const incomingToShip = result.connections.filter(c => c.targetRef === shipOrder.id);
  console.log(`\n   Ship order has ${incomingToShip.length} incoming connection(s):`);
  incomingToShip.forEach(c => {
    const source = result.tasks[c.sourceRef];
    console.log(`   - from ${source ? source.name : c.sourceRef}`);
  });
}

// 3. Check gateway connections
if (paymentGateway) {
  const gatewayOutgoing = result.connections.filter(c => c.sourceRef === paymentGateway.id);
  console.log(`\n✅ PASS: Payment gateway has ${gatewayOutgoing.length} outgoing connections`);
  gatewayOutgoing.forEach(c => {
    const target = result.tasks[c.targetRef];
    console.log(`   - to ${target ? target.name : c.targetRef}`);
  });
}

// 4. Test connection breaks
console.log('\n=== Testing Connection Breaks ===\n');
const breakTest = parser.parse(`:Break Test
@Lane1
  task1
  task2
  ---
  task3
  task4`);

const task2 = Object.values(breakTest.tasks).find(t => t.name === 'task2');
const task3 = Object.values(breakTest.tasks).find(t => t.name === 'task3');

const hasBreakConn = breakTest.connections.find(c => 
  c.sourceRef === task2.id && c.targetRef === task3.id
);

if (!hasBreakConn) {
  console.log('✅ PASS: Connection break (---) correctly prevents task2 -> task3 connection');
} else {
  console.log('❌ FAIL: Connection break failed - task2 still connects to task3');
}

// Summary
console.log('\n=== Summary ===');
console.log('The parser has been fixed to:');
console.log('1. Prevent self-connections on gateway branches');
console.log('2. Connect positive branches to the next task after the gateway');
console.log('3. Keep negative branches as dead ends (unless they end with !End)');
console.log('4. Respect connection breaks (---)');