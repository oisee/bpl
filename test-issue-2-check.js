// Test if Issue #2 (Unnecessary Connection Between Lanes) is still resolved
const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser-fixed.js');

const issue2Example = `:Order Process

@Customer
  place order
  send: Payment Information
  receive: Order Confirmation

@System
  receive: Payment Information
  validate payment
  ?Payment OK
    +ship order
    -cancel order
  send: Order Confirmation

#OrderData place order`;

console.log('Testing Issue #2 - Unnecessary Connection Between Lanes\n');
console.log('=' . repeat(60));

const parser = new BpmnLiteParser();
const ast = parser.parse(issue2Example);

// Find the specific tasks
let customerReceiveConfirmation = null;
let systemReceivePayment = null;

Object.values(parser.tasks).forEach(task => {
  if (task.name === 'receive: Order Confirmation' && task.lane === 'Customer') {
    customerReceiveConfirmation = task;
  } else if (task.name === 'receive: Payment Information' && task.lane === 'System') {
    systemReceivePayment = task;
  }
});

console.log('\nTasks found:');
console.log(`- Customer "receive: Order Confirmation": ${customerReceiveConfirmation ? 'YES' : 'NO'}`);
console.log(`- System "receive: Payment Information": ${systemReceivePayment ? 'YES' : 'NO'}`);

// Check for the problematic connection
const hasUnwantedConnection = ast.connections.some(conn => 
  conn.sourceRef === customerReceiveConfirmation?.id && 
  conn.targetRef === systemReceivePayment?.id
);

console.log('\n' + '=' . repeat(60));
console.log('ISSUE #2 TEST RESULT:');
console.log('=' . repeat(60));
console.log(`\n❓ Is there a connection from Customer "receive: Order Confirmation" to System "receive: Payment Information"?`);
console.log(`   ${hasUnwantedConnection ? '❌ YES - ISSUE #2 HAS RETURNED!' : '✅ NO - ISSUE #2 REMAINS FIXED!'}`);

// Show connections for verification
console.log('\nConnections from Customer "receive: Order Confirmation":');
ast.connections.forEach(conn => {
  if (conn.sourceRef === customerReceiveConfirmation?.id) {
    const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
    console.log(`  → ${target?.name} (${target?.lane})`);
  }
});

console.log('\nConnections to System "receive: Payment Information":');
ast.connections.forEach(conn => {
  if (conn.targetRef === systemReceivePayment?.id) {
    const source = Object.values(parser.tasks).find(t => t.id === conn.sourceRef);
    console.log(`  ← ${source?.name} (${source?.lane})`);
  }
});

console.log('\n' + '=' . repeat(60));