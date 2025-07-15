#!/usr/bin/env node

/**
 * Tests for specific reference scenarios reported by user
 */

const { BpmnLiteParser } = require('../out/parser.js');

// Color codes for output
const colors = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m'
};

function runTest(name, testFn) {
  console.log(`\n${colors.YELLOW}Testing: ${name}${colors.RESET}`);
  try {
    const result = testFn();
    if (result.success) {
      console.log(`${colors.GREEN}✓ PASSED${colors.RESET}`);
    } else {
      console.log(`${colors.RED}✗ FAILED: ${result.message}${colors.RESET}`);
    }
    return result.success;
  } catch (error) {
    console.log(`${colors.RED}✗ ERROR: ${error.message}${colors.RESET}`);
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

// Test 1: Working backward reference scenario
const testBackwardReference = () => {
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
  kokoko <- place order
  !End`;

  const ast = parser.parse(bpl);
  
  // Debug output
  console.log('  Tasks:');
  Object.entries(parser.tasks).forEach(([id, task]) => {
    console.log(`    - ${id}: "${task.name}" (${task.type}) [lane: ${task.lane}]`);
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
  
  // Check connection (backward reference: kokoko <- place order means place order -> kokoko)
  const connection = findConnection(ast.connections, 'customer_place_order', 'system_kokoko');
  if (!connection) {
    return { success: false, message: 'Connection from customer_place_order to system_kokoko not found' };
  }
  
  return { success: true };
};

// Test 2: Broken forward reference scenario  
const testForwardReference = () => {
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
  
  // Debug output
  console.log('  Tasks:');
  Object.entries(parser.tasks).forEach(([id, task]) => {
    console.log(`    - ${id}: "${task.name}" (${task.type}) [lane: ${task.lane}]`);
  });
  
  console.log('  Connections:');
  ast.connections.filter(c => c.type === 'sequenceFlow').forEach(conn => {
    console.log(`    - ${conn.sourceRef} → ${conn.targetRef}`);
  });
  
  // Check if tasks exist
  const placeOrderExists = !!parser.tasks['customer_place_order'];
  const systemKokokoExists = !!parser.tasks['system_kokoko'];
  const customerKokokoExists = !!parser.tasks['customer_kokoko']; // This shouldn't exist
  
  if (!placeOrderExists) {
    return { success: false, message: 'customer_place_order task not found' };
  }
  if (!systemKokokoExists) {
    return { success: false, message: 'system_kokoko task not found' };
  }
  if (customerKokokoExists) {
    return { success: false, message: 'customer_kokoko task incorrectly created - should resolve to system_kokoko' };
  }
  
  // Check connection (should connect to system_kokoko, not customer_kokoko)
  const correctConnection = findConnection(ast.connections, 'customer_place_order', 'system_kokoko');
  if (!correctConnection) {
    return { success: false, message: 'Connection from customer_place_order to system_kokoko not found' };
  }
  
  const incorrectConnection = findConnection(ast.connections, 'customer_place_order', 'customer_kokoko');
  if (incorrectConnection) {
    return { success: false, message: 'Incorrect connection to customer_kokoko found' };
  }
  
  return { success: true };
};

// Run tests
console.log(`${colors.CYAN}=== Reference Scenario Tests ===${colors.RESET}`);

const tests = [
  { name: 'Backward reference (working)', fn: testBackwardReference },
  { name: 'Forward reference (should resolve to next lane)', fn: testForwardReference }
];

let passed = 0;
let total = tests.length;

tests.forEach(test => {
  if (runTest(test.name, test.fn)) {
    passed++;
  }
});

console.log(`\n${colors.CYAN}=== Summary ===${colors.RESET}`);
console.log(`${passed === total ? colors.GREEN : colors.RED}${passed}/${total} tests passed${colors.RESET}`);

if (passed < total) {
  process.exit(1);
}