#!/usr/bin/env node

/**
 * Test for End event regression fix
 * Only the last task in the lane containing !End should connect to !End
 * Other lanes should connect to the next lane's first task
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

// Test: Only last task in lane with !End should connect to !End
const testCorrectEndConnections = () => {
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
  
  // Check if End event exists
  const endEventExists = !!parser.tasks['process_end'];
  if (!endEventExists) {
    return { success: false, message: 'process_end task not found' };
  }
  
  // ONLY kokoko should connect to !End (it's the last task in the System lane which contains !End)
  const kokokoToEnd = findConnection(ast.connections, 'system_kokoko', 'process_end');
  if (!kokokoToEnd) {
    return { success: false, message: 'Connection from system_kokoko to process_end not found' };
  }
  
  // receive: Confirmation should NOT connect to !End (it's in Customer lane)
  const customerConfirmationToEnd = findConnection(ast.connections, 'customer_receive_confirmation', 'process_end');
  if (customerConfirmationToEnd) {
    return { success: false, message: 'customer_receive_confirmation incorrectly connects to process_end' };
  }
  
  // receive: Confirmation should connect to the next lane's first task (receive: Payment)
  const customerToSystem = findConnection(ast.connections, 'customer_receive_confirmation', 'system_receive_payment');
  if (!customerToSystem) {
    return { success: false, message: 'Connection from customer_receive_confirmation to system_receive_payment not found' };
  }
  
  return { success: true };
};

// Run test
console.log(`${colors.CYAN}=== End Event Regression Fix Test ===${colors.RESET}`);

const success = runTest('Correct End event connections', testCorrectEndConnections);

console.log(`\n${colors.CYAN}=== Summary ===${colors.RESET}`);
console.log(`${success ? colors.GREEN : colors.RED}${success ? 'PASSED' : 'FAILED'}${colors.RESET}`);

if (!success) {
  process.exit(1);
}