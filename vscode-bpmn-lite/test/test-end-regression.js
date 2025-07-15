#!/usr/bin/env node

/**
 * Test for !End regression - should connect from last task in lane
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

// Test: !End should connect from last task in lane
const testEndConnection = () => {
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
  
  // Check if last task in System lane connects to End
  const systemSendConfirmationExists = !!parser.tasks['system_send_confirmation'];
  if (!systemSendConfirmationExists) {
    return { success: false, message: 'system_send_confirmation task not found' };
  }
  
  // Check connection from last task to End
  const connectionToEnd = findConnection(ast.connections, 'system_send_confirmation', 'process_end');
  if (!connectionToEnd) {
    return { success: false, message: 'Connection from system_send_confirmation to process_end not found' };
  }
  
  return { success: true };
};

// Run test
console.log(`${colors.CYAN}=== End Event Connection Test ===${colors.RESET}`);

const success = runTest('End event connects from last task', testEndConnection);

console.log(`\n${colors.CYAN}=== Summary ===${colors.RESET}`);
console.log(`${success ? colors.GREEN : colors.RED}${success ? 'PASSED' : 'FAILED'}${colors.RESET}`);

if (!success) {
  process.exit(1);
}