const { BpmnLiteParser } = require('./dist/parser.js');
const assert = require('assert');

// Test suite for BPMN-Lite Parser
console.log('Running BPMN-Lite Parser Tests...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ ${name}`);
    passedTests++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
  }
}

// Test 1: Basic Process Parsing
test('Should parse basic process definition', () => {
  const parser = new BpmnLiteParser();
  const dsl = ':Order Process';
  const ast = parser.parse(dsl);
  
  assert.strictEqual(ast.type, 'bpmnModel');
  assert.strictEqual(ast.processes.length, 1);
  assert.strictEqual(ast.processes[0].name, 'Order Process');
});

// Test 2: Lane and Task Parsing
test('Should parse lanes and tasks', () => {
  const parser = new BpmnLiteParser();
  const dsl = `
:Order Process
@Customer
  place order
  make payment
@System
  process order
  ship item
`;
  const ast = parser.parse(dsl);
  
  assert.strictEqual(ast.processes[0].lanes.length, 2);
  assert.strictEqual(ast.processes[0].lanes[0].name, 'Customer');
  assert.strictEqual(ast.processes[0].lanes[0].elements.length, 2);
  assert.strictEqual(ast.processes[0].lanes[0].elements[0].name, 'place order');
});

// Test 3: Gateway Parsing
test('Should parse gateways with branches', () => {
  const parser = new BpmnLiteParser();
  const dsl = `
@System
  validate payment
  ?Payment OK
    +ship order
    -cancel order
`;
  const ast = parser.parse(dsl);
  
  const elements = ast.processes[0].lanes[0].elements;
  const gateway = elements.find(e => e.type === 'gateway');
  assert.ok(gateway);
  assert.strictEqual(gateway.name, 'Payment OK');
  assert.strictEqual(gateway.branches.length, 2);
});

// Test 4: Message Flow Parsing
test('Should parse send/receive message tasks', () => {
  const parser = new BpmnLiteParser();
  const dsl = `
@Customer
  send: Payment Info
@System
  receive: Payment Info
`;
  const ast = parser.parse(dsl);
  
  const customerLane = ast.processes[0].lanes[0];
  const systemLane = ast.processes[0].lanes[1];
  
  assert.strictEqual(customerLane.elements[0].type, 'send');
  assert.strictEqual(customerLane.elements[0].messageName, 'Payment Info');
  assert.strictEqual(systemLane.elements[0].type, 'receive');
  assert.strictEqual(systemLane.elements[0].messageName, 'Payment Info');
});

// Test 5: Explicit Connection Parsing
test('Should parse explicit connections', () => {
  const parser = new BpmnLiteParser();
  const dsl = `
@Lane1
  task A -> task C
`;
  const ast = parser.parse(dsl);
  
  // Check that connections were created
  const hasConnection = ast.connections.some(conn => 
    conn.sourceRef.includes('task_a') && 
    conn.targetRef.includes('task_c')
  );
  assert.ok(hasConnection);
});

// Test 6: Data Object Parsing
test('Should parse data objects', () => {
  const parser = new BpmnLiteParser();
  const dsl = `
@Customer
  place order
#OrderData place order
`;
  const ast = parser.parse(dsl);
  
  assert.strictEqual(ast.dataObjects.length, 1);
  assert.strictEqual(ast.dataObjects[0].name, 'OrderData');
  assert.strictEqual(ast.dataObjects[0].taskRef, 'place order');
});

// Test 7: Comment Parsing
test('Should parse comments', () => {
  const parser = new BpmnLiteParser();
  const dsl = `
@Lane1
  task one
  "This is a comment
  task two
`;
  const ast = parser.parse(dsl);
  
  const comment = ast.processes[0].lanes[0].elements.find(e => e.type === 'comment');
  assert.ok(comment);
  assert.strictEqual(comment.name, 'This is a comment');
});

// Test 8: Event Parsing
test('Should parse start and end events', () => {
  const parser = new BpmnLiteParser();
  const dsl = `
@Lane1
  !Start
  do something
  !End
`;
  const ast = parser.parse(dsl);
  
  const elements = ast.processes[0].lanes[0].elements;
  const startEvent = elements.find(e => e.type === 'event' && e.eventType === 'start');
  const endEvent = elements.find(e => e.type === 'event' && e.eventType === 'end');
  
  assert.ok(startEvent);
  assert.ok(endEvent);
});

// Test 9: Custom Gateway Labels
test('Should parse custom gateway labels', () => {
  const parser = new BpmnLiteParser();
  const dsl = `
@System
  ?Payment Method
    +|Credit Card| process card
    +|PayPal| process paypal
    -|Cancel| cancel order
`;
  const ast = parser.parse(dsl);
  
  const elements = ast.processes[0].lanes[0].elements;
  const creditBranch = elements.find(e => e.type === 'branch' && e.label === 'Credit Card');
  
  assert.ok(creditBranch);
  assert.strictEqual(creditBranch.name, 'process card');
});

// Test 10: Cross-Lane Message Flows
test('Should parse explicit cross-lane message flows', () => {
  const parser = new BpmnLiteParser();
  const dsl = `
@Customer
  place order
@System
  process order
^OrderInfo @Customer.place order -> @System.process order
`;
  const ast = parser.parse(dsl);
  
  const messageFlow = ast.connections.find(conn => 
    conn.type === 'messageFlow' && 
    conn.name === 'OrderInfo'
  );
  
  assert.ok(messageFlow);
});

// Test 11: Sequential Task Connection
test('Should automatically connect sequential tasks', () => {
  const parser = new BpmnLiteParser();
  const dsl = `
@Lane1
  task one
  task two
  task three
`;
  const ast = parser.parse(dsl);
  
  // Should have 2 connections for 3 tasks
  const sequenceFlows = ast.connections.filter(conn => conn.type === 'sequenceFlow');
  assert.ok(sequenceFlows.length >= 2);
});

// Test 12: Empty DSL Handling
test('Should handle empty DSL gracefully', () => {
  const parser = new BpmnLiteParser();
  const dsl = '';
  const ast = parser.parse(dsl);
  
  assert.strictEqual(ast.type, 'bpmnModel');
  assert.ok(ast.processes.length >= 0);
});

// Test 13: Whitespace Insensitivity
test('Should be whitespace insensitive', () => {
  const parser = new BpmnLiteParser();
  const dsl = `
    :Process Name
      @Lane1
        task one
          task two
@Lane2
task three
`;
  const ast = parser.parse(dsl);
  
  assert.strictEqual(ast.processes[0].name, 'Process Name');
  assert.strictEqual(ast.processes[0].lanes.length, 2);
});

// Test 14: Mermaid Generation
test('Should generate valid Mermaid syntax', () => {
  const parser = new BpmnLiteParser();
  const dsl = `
:Test Process
@Lane1
  task one
  task two
`;
  parser.parse(dsl);
  const mermaid = parser.toMermaid();
  
  assert.ok(mermaid.includes('flowchart TD'));
  assert.ok(mermaid.includes('subgraph'));
  assert.ok(mermaid.includes('task_one'));
});

// Test Summary
console.log(`\n${passedTests}/${totalTests} tests passed`);
process.exit(passedTests === totalTests ? 0 : 1);