// Simple test without send/receive to verify the fix
const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser-fixed.js');

console.log('Testing Simple Gateway Flow (No Send/Receive)\n');

const testBPL = `:Simple Process
@Developer
  task1
  task2
  ?Decision
    +success
    -failure
  task3`;

const parser = new BpmnLiteParser();
const ast = parser.parse(testBPL);

// Find tasks
const tasks = {};
Object.values(parser.tasks).forEach(task => {
  tasks[task.name] = task;
});

console.log('Tasks found:');
Object.keys(tasks).forEach(name => {
  console.log(`  - ${name} (${tasks[name].id})`);
});

console.log('\nChecking connections:');

// Check for problematic connection (task2 -> task3, skipping gateway)
const hasSkipConnection = ast.connections.some(conn => 
  conn.sourceRef === tasks['task2'].id && 
  conn.targetRef === tasks['task3'].id
);

console.log(`\n❓ Does task2 connect directly to task3 (skipping gateway)?`);
console.log(`   ${hasSkipConnection ? '❌ YES - BUG!' : '✅ NO - CORRECT!'}`);

// Show all connections
console.log('\nAll connections:');
ast.connections.forEach(conn => {
  if (conn.type === 'sequenceFlow') {
    const source = Object.values(parser.tasks).find(t => t.id === conn.sourceRef);
    const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
    console.log(`  ${source?.name} → ${target?.name}`);
  }
});

console.log('\nExpected flow:');
console.log('  task1 → task2 → Decision → success/failure');
console.log('  success → task3');
console.log('  failure → (dead end)');
console.log('\nThe key fix: task2 should NOT connect directly to task3!');