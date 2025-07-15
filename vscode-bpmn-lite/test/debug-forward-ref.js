#!/usr/bin/env node

const { BpmnLiteParser } = require('../out/parser.js');

const parser = new BpmnLiteParser();
const bpl = `:Process Name
@Customer
  place order -> kokoko
  send: Payment
  receive: Confirmation
@System  
  receive: Payment
  ?Payment Valid
    +ship order
    -cancel order
  send: Confirmation 
  kokoko
  !End`;

const ast = parser.parse(bpl);

console.log('Tasks:');
Object.entries(parser.tasks).forEach(([id, task]) => {
  console.log(`  - ${id}: "${task.name}" (${task.type}) [lane: ${task.lane}]`);
});

console.log('\nConnections:');
ast.connections.filter(c => c.type === 'sequenceFlow').forEach(conn => {
  console.log(`  - ${conn.sourceRef} → ${conn.targetRef}`);
});

console.log('\nLanes:');
Object.entries(parser.lanes).forEach(([laneName, lane]) => {
  console.log(`  - ${laneName}: [${lane.tasks.join(', ')}]`);
});

// Check if the missing connection exists
const missing = ast.connections.find(c => 
  c.sourceRef === 'customer_receive_confirmation' && 
  c.targetRef === 'system_receive_payment'
);

console.log('\nMissing connection found:', !!missing);