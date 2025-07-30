const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser-fixed.js');

// Analyze each failing test case in detail

console.log('DETAILED ANALYSIS OF FAILING TESTS');
console.log('==================================\n');

// Test 1: Start and End Events
console.log('1. START AND END EVENTS TEST');
console.log('----------------------------');
const test1BPL = `:Event Process
@Lane1
  !Start
  task1
  ?Decision
    +continue
    -!End
  task2
  !End`;

const parser1 = new BpmnLiteParser();
const ast1 = parser1.parse(test1BPL);

console.log('BPL Code:');
console.log(test1BPL);
console.log('\nParsed Events:');
Object.values(parser1.tasks).forEach(task => {
  if (task.type === 'event') {
    console.log(`  - ${task.name} (${task.eventType}) - ID: ${task.id}`);
  }
});

console.log('\nBranches with End:');
Object.values(parser1.tasks).forEach(task => {
  if (task.type === 'branch' && task.name.includes('End')) {
    console.log(`  - Branch: ${task.name} (${task.id})`);
  }
});

console.log('\nISSUE: The test expects End event tasks, but they might be parsed as branch content');
console.log('The negative branch "-!End" creates a branch named "End", not an actual End event');

// Test 2: Nested Gateways
console.log('\n\n2. NESTED GATEWAYS TEST');
console.log('------------------------');
const test2BPL = `:Nested Gateway Process
@Lane1
  task1
  ?Gateway1
    +path1
      ?Gateway2
        +path2a
        -path2b
    -path3
  task2`;

const parser2 = new BpmnLiteParser();
const ast2 = parser2.parse(test2BPL);

console.log('BPL Code:');
console.log(test2BPL);
console.log('\nParsed Structure:');
Object.values(parser2.tasks).forEach(task => {
  console.log(`  ${task.type}: ${task.name} (${task.id})`);
  if (task.type === 'gateway') {
    const connections = ast2.connections.filter(c => c.sourceRef === task.id);
    console.log(`    Outgoing connections: ${connections.length}`);
    connections.forEach(c => {
      const target = Object.values(parser2.tasks).find(t => t.id === c.targetRef);
      console.log(`      -> ${target?.name}`);
    });
  }
});

console.log('\nISSUE: Nested gateway syntax "?Gateway2" under a branch is not properly parsed');
console.log('The parser likely treats it as regular text, not as a nested gateway');

// Test 3: Multiple Processes
console.log('\n\n3. MULTIPLE PROCESSES TEST');
console.log('--------------------------');
const test3BPL = `:Process 1
@Lane1
  task1
  task2

:Process 2
@Lane2
  task3
  task4`;

const parser3 = new BpmnLiteParser();
const ast3 = parser3.parse(test3BPL);

console.log('BPL Code:');
console.log(test3BPL);
console.log('\nParsed Processes:');
ast3.processes.forEach(process => {
  console.log(`  - ${process.name} (${process.id})`);
});

console.log('\nISSUE: Parser creates a default process, resulting in 3 instead of 2');
console.log('Processes found: Default Process + Process 1 + Process 2 = 3 total');

// Test 4: Edge Case - Empty Lanes
console.log('\n\n4. EDGE CASE - EMPTY LANES TEST');
console.log('--------------------------------');
const test4BPL = `:Empty Lane Process
@Lane1
  task1
@EmptyLane
@Lane2
  task2`;

const parser4 = new BpmnLiteParser();
const ast4 = parser4.parse(test4BPL);

console.log('BPL Code:');
console.log(test4BPL);
console.log('\nParsed AST structure:');
console.log('Processes:', ast4.processes.length);
ast4.processes.forEach(process => {
  console.log(`  Process: ${process.name}`);
  console.log(`    Lanes: ${process.lanes.length}`);
  process.lanes.forEach(lane => {
    console.log(`      - ${lane.name}: ${lane.elements.length} elements`);
  });
});

console.log('\nISSUE: Test expects lanes to be returned at the top level of AST');
console.log('But AST structure has lanes nested under processes');
console.log('Test is checking ast.processes[0].lanes.length, not just lanes.length');