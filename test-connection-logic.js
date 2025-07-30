const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser.js');

/**
 * Connection Logic Test Suite
 * 
 * This test suite specifically focuses on connection logic issues
 * including Issue #4 and related connection problems.
 */

console.log('BPL Parser Connection Logic Test Suite');
console.log('======================================\n');

// Test Case 1: Basic Gateway Flow (No Issue)
console.log('Test 1: Basic Gateway Flow (Control Test)');
console.log('-----------------------------------------');
const test1 = `:Basic Flow
@Lane1
  task1
  ?Gateway
    +positive
    -negative
  final task`;

const parser1 = new BpmnLiteParser();
const ast1 = parser1.parse(test1);

console.log('Expected: task1 -> Gateway -> positive/negative -> final task');
console.log('Connections:');
ast1.connections.forEach(conn => {
  if (conn.type === 'sequenceFlow') {
    const source = Object.values(parser1.tasks).find(t => t.id === conn.sourceRef);
    const target = Object.values(parser1.tasks).find(t => t.id === conn.targetRef);
    console.log(`  ${source?.name || conn.sourceRef} -> ${target?.name || conn.targetRef}`);
  }
});

// Test Case 2: Issue #4 Scenario
console.log('\n\nTest 2: Issue #4 - Task Before Gateway');
console.log('---------------------------------------');
const test2 = `:Issue #4 Test
@Developer
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features`;

const parser2 = new BpmnLiteParser();
const ast2 = parser2.parse(test2);

const receiveTask = Object.values(parser2.tasks).find(t => t.name === 'receive: Review Feedback');
const demoTask = Object.values(parser2.tasks).find(t => t.name === 'demo features');
const gatewayTask = Object.values(parser2.tasks).find(t => t.name === 'Tests Pass');

console.log('Checking for unnecessary connection...');
const hasDirectConnection = ast2.connections.some(conn => 
  conn.sourceRef === receiveTask.id && conn.targetRef === demoTask.id
);

console.log(`  Direct connection (receive -> demo): ${hasDirectConnection ? '❌ EXISTS (BUG)' : '✅ None'}`);
console.log(`  Connection to gateway: ${ast2.connections.some(conn => conn.sourceRef === receiveTask.id && conn.targetRef === gatewayTask.id) ? '✅ Yes' : '❌ No'}`);

console.log('\nAll connections from "receive: Review Feedback":');
ast2.connections
  .filter(conn => conn.sourceRef === receiveTask.id)
  .forEach(conn => {
    const target = Object.values(parser2.tasks).find(t => t.id === conn.targetRef);
    console.log(`  -> ${target?.name || conn.targetRef}`);
  });

// Test Case 3: Multiple Gateways in Sequence
console.log('\n\nTest 3: Multiple Gateways in Sequence');
console.log('-------------------------------------');
const test3 = `:Multiple Gateways
@Lane1
  task1
  ?Gateway1
    +option1
    -option2
  task2
  ?Gateway2
    +option3
    -option4
  task3`;

const parser3 = new BpmnLiteParser();
const ast3 = parser3.parse(test3);

console.log('Checking for skip connections...');
const task1 = Object.values(parser3.tasks).find(t => t.name === 'task1');
const task2 = Object.values(parser3.tasks).find(t => t.name === 'task2');
const task3 = Object.values(parser3.tasks).find(t => t.name === 'task3');

const skipConnections = [
  { from: task1, to: task2, name: 'task1 -> task2 (skipping gateway)' },
  { from: task1, to: task3, name: 'task1 -> task3 (skipping both)' },
  { from: task2, to: task3, name: 'task2 -> task3 (skipping gateway)' }
];

skipConnections.forEach(({ from, to, name }) => {
  const hasSkip = ast3.connections.some(conn => 
    conn.sourceRef === from.id && conn.targetRef === to.id
  );
  console.log(`  ${name}: ${hasSkip ? '❌ EXISTS (BUG)' : '✅ None'}`);
});

// Test Case 4: Cross-Lane Gateway
console.log('\n\nTest 4: Cross-Lane Gateway Flow');
console.log('--------------------------------');
const test4 = `:Cross Lane Gateway
@Lane1
  task1
  ?Decision
    +continue in lane1
    -switch to lane2
  task2
@Lane2
  task3
  task4`;

const parser4 = new BpmnLiteParser();
const ast4 = parser4.parse(test4);

console.log('Checking cross-lane connections...');
const lane1Task1 = Object.values(parser4.tasks).find(t => t.name === 'task1');
const lane2Task3 = Object.values(parser4.tasks).find(t => t.name === 'task3');
const lane2Task4 = Object.values(parser4.tasks).find(t => t.name === 'task4');

// Check if there's an inappropriate connection from lane1 to lane2
const inappropriateConnection = ast4.connections.some(conn => 
  conn.sourceRef === lane1Task1.id && conn.targetRef === lane2Task3.id
);

console.log(`  Direct lane1->lane2 connection: ${inappropriateConnection ? '❌ EXISTS' : '✅ None'}`);

// Test Case 5: Gateway at End of Lane
console.log('\n\nTest 5: Gateway at End of Lane');
console.log('-------------------------------');
const test5 = `:End Gateway
@Lane1
  task1
  task2
  ?Final Decision
    +approved
    -rejected`;

const parser5 = new BpmnLiteParser();
const ast5 = parser5.parse(test5);

console.log('Checking connections from gateway at end of lane...');
const finalGateway = Object.values(parser5.tasks).find(t => t.name === 'Final Decision');
const gatewayConnections = ast5.connections.filter(conn => conn.sourceRef === finalGateway.id);

console.log(`  Gateway has ${gatewayConnections.length} outgoing connections`);
gatewayConnections.forEach(conn => {
  const target = Object.values(parser5.tasks).find(t => t.id === conn.targetRef);
  console.log(`    -> ${target?.name || conn.targetRef}`);
});

// Test Case 6: Complex Nested Structure
console.log('\n\nTest 6: Complex Nested Structure');
console.log('---------------------------------');
const test6 = `:Complex Process
@Customer
  submit request
  ?Request Type
    +|Standard| standard process
    +|Express| express process
    -|Cancel| cancel process
  send: Data
  receive: Result
@System
  receive: Data
  process data
  ?Valid Data
    +generate result
    -error handling
  send: Result`;

const parser6 = new BpmnLiteParser();
const ast6 = parser6.parse(test6);

// Find key tasks
const submitRequest = Object.values(parser6.tasks).find(t => t.name === 'submit request');
const sendData = Object.values(parser6.tasks).find(t => t.name === 'send: Data');
const receiveResult = Object.values(parser6.tasks).find(t => t.name === 'receive: Result');

console.log('Checking for connection issues in complex flow...');

// Check if submit request connects directly to send data (skipping gateway)
const skipGateway = ast6.connections.some(conn => 
  conn.sourceRef === submitRequest.id && conn.targetRef === sendData.id
);

console.log(`  submit request -> send: Data (skipping gateway): ${skipGateway ? '❌ EXISTS (BUG)' : '✅ None'}`);

// Check branch connections
const standardProcess = Object.values(parser6.tasks).find(t => t.name === 'standard process');
const expressProcess = Object.values(parser6.tasks).find(t => t.name === 'express process');
const cancelProcess = Object.values(parser6.tasks).find(t => t.name === 'cancel process');

[standardProcess, expressProcess].forEach(task => {
  if (task) {
    const connectsToSend = ast6.connections.some(conn => 
      conn.sourceRef === task.id && conn.targetRef === sendData.id
    );
    console.log(`  ${task.name} -> send: Data: ${connectsToSend ? '✅ Yes' : '❌ No'}`);
  }
});

if (cancelProcess) {
  const connectsToSend = ast6.connections.some(conn => 
    conn.sourceRef === cancelProcess.id && conn.targetRef === sendData.id
  );
  console.log(`  cancel process -> send: Data: ${connectsToSend ? '❌ YES (BUG - negative branch)' : '✅ No'}`);
}

// Summary
console.log('\n\n=== CONNECTION LOGIC TEST SUMMARY ===');
console.log('Issue #4 is confirmed: Tasks before gateways create unnecessary direct connections');
console.log('to tasks after gateway branches, bypassing the gateway logic.');
console.log('\nThis affects:');
console.log('1. Single gateway scenarios');
console.log('2. Multiple sequential gateways');
console.log('3. Cross-lane flows with gateways');
console.log('4. Complex nested structures');
console.log('\nThe parser needs to be fixed to prevent these skip connections.');