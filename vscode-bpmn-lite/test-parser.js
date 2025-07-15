const { BpmnLiteParser } = require('./out/parser.js');

// Color codes for output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function runTest(name, testFn) {
  console.log(`\n${YELLOW}Testing: ${name}${RESET}`);
  try {
    const result = testFn();
    if (result.success) {
      console.log(`${GREEN}✓ PASSED${RESET}`);
    } else {
      console.log(`${RED}✗ FAILED: ${result.message}${RESET}`);
    }
    return result.success;
  } catch (error) {
    console.log(`${RED}✗ ERROR: ${error.message}${RESET}`);
    console.error(error.stack);
    return false;
  }
}

function findConnection(connections, sourceRef, targetRef) {
  return connections.find(c => 
    c.sourceRef === sourceRef && 
    c.targetRef === targetRef &&
    c.type === 'sequenceFlow'
  );
}

// Test 1: kokoko <- @Customer.place order
const test1 = () => {
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
  send: Confirmation 
  kokoko <- @Customer.place order
  !End`;

  const ast = parser.parse(bpl);
  
  // Debug output
  console.log('  Tasks:');
  Object.entries(parser.tasks).forEach(([id, task]) => {
    console.log(`    - ${id}: "${task.name}" (${task.type})`);
  });
  
  console.log('  Connections:');
  ast.connections.filter(c => c.type === 'sequenceFlow').forEach(conn => {
    console.log(`    - ${conn.sourceRef} → ${conn.targetRef}`);
  });
  
  // Check if tasks exist
  const placeOrderExists = !!parser.tasks['customer_place_order'];
  const kokokoExists = !!parser.tasks['system_kokoko'];
  
  if (!placeOrderExists) {
    return { success: false, message: 'customer_place_order task not found' };
  }
  if (!kokokoExists) {
    return { success: false, message: 'system_kokoko task not found' };
  }
  
  // Check connection
  const connection = findConnection(ast.connections, 'customer_place_order', 'system_kokoko');
  if (!connection) {
    return { success: false, message: 'Connection from customer_place_order to system_kokoko not found' };
  }
  
  return { success: true };
};

// Test 2: Forward reference with implicit creation
const test2 = () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Customer
  place order -> future_task
  send: Payment`;

  const ast = parser.parse(bpl);
  
  // Check if future_task was created
  const futureTaskExists = !!parser.tasks['customer_future_task'];
  if (!futureTaskExists) {
    return { success: false, message: 'Implicit task customer_future_task not created' };
  }
  
  // Check if it's marked as implicit
  if (!parser.tasks['customer_future_task'].implicit) {
    return { success: false, message: 'Task not marked as implicit' };
  }
  
  // Check connection
  const connection = findConnection(ast.connections, 'customer_place_order', 'customer_future_task');
  if (!connection) {
    return { success: false, message: 'Connection not created' };
  }
  
  return { success: true };
};

// Test 3: Multiple arrows
const test3 = () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A -> Task B -> Task C
  Task D <- Task E <- Task F`;

  const ast = parser.parse(bpl);
  
  // Check all connections
  const connections = [
    { from: 'lane1_task_a', to: 'lane1_task_b' },
    { from: 'lane1_task_b', to: 'lane1_task_c' },
    { from: 'lane1_task_e', to: 'lane1_task_d' },
    { from: 'lane1_task_f', to: 'lane1_task_e' }
  ];
  
  for (const conn of connections) {
    if (!findConnection(ast.connections, conn.from, conn.to)) {
      return { success: false, message: `Missing connection: ${conn.from} → ${conn.to}` };
    }
  }
  
  return { success: true };
};

// Test 4: Cross-lane reference
const test4 = () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Customer
  place order -> @System.process
@System
  process
  validate`;

  const ast = parser.parse(bpl);
  
  const connection = findConnection(ast.connections, 'customer_place_order', 'system_process');
  if (!connection) {
    return { success: false, message: 'Cross-lane connection not created' };
  }
  
  return { success: true };
};

// Run all tests
console.log(`${YELLOW}=== BPL Parser Connection Tests ===${RESET}`);

const tests = [
  { name: 'kokoko <- @Customer.place order', fn: test1 },
  { name: 'Implicit task creation', fn: test2 },
  { name: 'Multiple arrows in one line', fn: test3 },
  { name: 'Cross-lane references', fn: test4 }
];

let passed = 0;
let total = tests.length;

tests.forEach(test => {
  if (runTest(test.name, test.fn)) {
    passed++;
  }
});

console.log(`\n${YELLOW}=== Summary ===${RESET}`);
console.log(`${passed === total ? GREEN : RED}${passed}/${total} tests passed${RESET}`);

if (passed < total) {
  process.exit(1);
}