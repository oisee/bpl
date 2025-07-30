const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser.js');
const fs = require('fs');

const bpl = fs.readFileSync('test-lane-switch.bpl', 'utf8');
const parser = new BpmnLiteParser();
const ast = parser.parse(bpl);

console.log('Tasks:');
Object.entries(parser.tasks).forEach(([id, task]) => {
  console.log(`  ${id}: "${task.name}" in lane ${task.lane}`);
});

console.log('\nConnections:');
ast.connections.filter(c => c.type === 'sequenceFlow').forEach(conn => {
  console.log(`  ${conn.sourceRef} → ${conn.targetRef}`);
});

console.log('\nExpected connections:');
console.log('  task2 → task3 (lane switch from customer to system)');
console.log('  task4 → task5 (lane switch from system to customer)');

console.log('\nActual connections found:');
const task2ToTask3 = ast.connections.find(c => c.sourceRef === 'customer_task2' && c.targetRef === 'system_task3');
const task4ToTask5 = ast.connections.find(c => c.sourceRef === 'system_task4' && c.targetRef === 'customer_task5');

console.log(`  task2 → task3: ${task2ToTask3 ? 'YES' : 'NO'}`);
console.log(`  task4 → task5: ${task4ToTask5 ? 'YES' : 'NO'}`);