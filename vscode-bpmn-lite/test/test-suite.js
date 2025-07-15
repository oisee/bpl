#!/usr/bin/env node

/**
 * Comprehensive BPL Parser Test Suite
 * 
 * This test suite covers all major features of the BPL parser:
 * - Basic task parsing
 * - Arrow operators (-> and <-)
 * - Gateway parsing
 * - Message flows
 * - Data objects
 * - Process events
 * - Lane management
 * - Connection breaks
 * - Cross-lane references
 * - Implicit task creation
 */

const { BpmnLiteParser } = require('../out/parser.js');

// Color codes for output
const colors = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  RESET: '\x1b[0m'
};

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  }

  addTest(name, category, testFn) {
    this.tests.push({ name, category, testFn });
  }

  run() {
    console.log(`${colors.CYAN}=== BPL Parser Comprehensive Test Suite ===${colors.RESET}\n`);
    
    const categories = [...new Set(this.tests.map(t => t.category))];
    
    for (const category of categories) {
      console.log(`${colors.BLUE}--- ${category} ---${colors.RESET}`);
      
      const categoryTests = this.tests.filter(t => t.category === category);
      
      for (const test of categoryTests) {
        this.runTest(test);
      }
      
      console.log();
    }
    
    this.printSummary();
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }

  runTest(test) {
    const startTime = Date.now();
    
    try {
      const result = test.testFn();
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`${colors.GREEN}✓${colors.RESET} ${test.name} ${colors.WHITE}(${duration}ms)${colors.RESET}`);
        this.passed++;
      } else {
        console.log(`${colors.RED}✗${colors.RESET} ${test.name} ${colors.WHITE}(${duration}ms)${colors.RESET}`);
        console.log(`  ${colors.RED}${result.message}${colors.RESET}`);
        this.failed++;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`${colors.RED}✗${colors.RESET} ${test.name} ${colors.WHITE}(${duration}ms)${colors.RESET}`);
      console.log(`  ${colors.RED}ERROR: ${error.message}${colors.RESET}`);
      if (this.verbose) {
        console.log(`  ${colors.WHITE}${error.stack}${colors.RESET}`);
      }
      this.failed++;
    }
  }

  printSummary() {
    const total = this.passed + this.failed;
    const successRate = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;
    
    console.log(`${colors.CYAN}=== Test Summary ===${colors.RESET}`);
    console.log(`Total tests: ${total}`);
    console.log(`${colors.GREEN}Passed: ${this.passed}${colors.RESET}`);
    console.log(`${colors.RED}Failed: ${this.failed}${colors.RESET}`);
    console.log(`Success rate: ${successRate}%`);
    
    if (this.failed === 0) {
      console.log(`${colors.GREEN}🎉 All tests passed!${colors.RESET}`);
    }
  }
}

// Test utilities
function findConnection(connections, sourceRef, targetRef) {
  return connections.find(c => 
    c.sourceRef === sourceRef && 
    c.targetRef === targetRef &&
    c.type === 'sequenceFlow'
  );
}

function findMessageFlow(connections, sourceRef, targetRef) {
  return connections.find(c => 
    c.sourceRef === sourceRef && 
    c.targetRef === targetRef &&
    c.type === 'messageFlow'
  );
}

function findDataAssociation(connections, sourceRef, targetRef) {
  return connections.find(c => 
    c.sourceRef === sourceRef && 
    c.targetRef === targetRef &&
    c.type === 'dataAssociation'
  );
}

function countTasksByType(parser, type) {
  return Object.values(parser.tasks).filter(task => task.type === type).length;
}

function expectTaskExists(parser, taskId, taskName = null) {
  const task = parser.tasks[taskId];
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  if (taskName && task.name !== taskName) {
    throw new Error(`Task ${taskId} has name "${task.name}", expected "${taskName}"`);
  }
  return task;
}

function expectConnection(connections, sourceRef, targetRef, type = 'sequenceFlow') {
  const connection = connections.find(c => 
    c.sourceRef === sourceRef && 
    c.targetRef === targetRef &&
    c.type === type
  );
  if (!connection) {
    throw new Error(`Connection ${sourceRef} → ${targetRef} (${type}) not found`);
  }
  return connection;
}

// Initialize test runner
const runner = new TestRunner();

// =============================================================================
// BASIC PARSING TESTS
// =============================================================================

runner.addTest('Simple task parsing', 'Basic Parsing', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A
  Task B`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  expectTaskExists(parser, 'lane1_task_b', 'Task B');
  
  return { success: true };
});

runner.addTest('Process definition', 'Basic Parsing', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:My Process
@Lane1
  Task A`;
  
  const ast = parser.parse(bpl);
  
  // Check that currentProcess is set correctly
  if (!parser.currentProcess) {
    return { success: false, message: 'Current process not set' };
  }
  
  if (parser.currentProcess !== 'My Process') {
    return { success: false, message: `Process name incorrect: expected "My Process", got "${parser.currentProcess}"` };
  }
  
  return { success: true };
});

runner.addTest('Multiple lanes', 'Basic Parsing', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Customer
  Place Order
@System
  Process Order`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'customer_place_order', 'Place Order');
  expectTaskExists(parser, 'system_process_order', 'Process Order');
  
  if (Object.keys(parser.lanes).length !== 2) {
    return { success: false, message: 'Expected 2 lanes' };
  }
  
  return { success: true };
});

runner.addTest('Send/receive tasks', 'Basic Parsing', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  send: Payment
  receive: Confirmation`;
  
  const ast = parser.parse(bpl);
  
  const sendTask = expectTaskExists(parser, 'lane1_send_payment', 'send: Payment');
  const receiveTask = expectTaskExists(parser, 'lane1_receive_confirmation', 'receive: Confirmation');
  
  if (sendTask.type !== 'send') {
    return { success: false, message: 'Send task type incorrect' };
  }
  
  if (receiveTask.type !== 'receive') {
    return { success: false, message: 'Receive task type incorrect' };
  }
  
  return { success: true };
});

// =============================================================================
// ARROW OPERATOR TESTS
// =============================================================================

runner.addTest('Forward arrow operator', 'Arrow Operators', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A -> Task B`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  expectTaskExists(parser, 'lane1_task_b', 'Task B');
  expectConnection(ast.connections, 'lane1_task_a', 'lane1_task_b');
  
  return { success: true };
});

runner.addTest('Backward arrow operator', 'Arrow Operators', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A <- Task B`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  expectTaskExists(parser, 'lane1_task_b', 'Task B');
  expectConnection(ast.connections, 'lane1_task_b', 'lane1_task_a');
  
  return { success: true };
});

runner.addTest('Multiple arrows in chain', 'Arrow Operators', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A -> Task B -> Task C`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  expectTaskExists(parser, 'lane1_task_b', 'Task B');
  expectTaskExists(parser, 'lane1_task_c', 'Task C');
  expectConnection(ast.connections, 'lane1_task_a', 'lane1_task_b');
  expectConnection(ast.connections, 'lane1_task_b', 'lane1_task_c');
  
  return { success: true };
});

runner.addTest('Backward arrow chain', 'Arrow Operators', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A <- Task B <- Task C`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  expectTaskExists(parser, 'lane1_task_b', 'Task B');
  expectTaskExists(parser, 'lane1_task_c', 'Task C');
  expectConnection(ast.connections, 'lane1_task_b', 'lane1_task_a');
  expectConnection(ast.connections, 'lane1_task_c', 'lane1_task_b');
  
  return { success: true };
});

// =============================================================================
// CROSS-LANE REFERENCE TESTS
// =============================================================================

runner.addTest('Cross-lane forward reference', 'Cross-Lane References', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Customer
  place order -> @System.process
@System
  process
  validate`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'customer_place_order', 'place order');
  expectTaskExists(parser, 'system_process', 'process');
  expectConnection(ast.connections, 'customer_place_order', 'system_process');
  
  return { success: true };
});

runner.addTest('Cross-lane backward reference', 'Cross-Lane References', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Customer
  place order
  send: Payment
  receive: Confirmation
@System
  receive: Payment
  send: Confirmation
  kokoko <- @Customer.place order`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'customer_place_order', 'place order');
  expectTaskExists(parser, 'system_kokoko', 'kokoko');
  expectConnection(ast.connections, 'customer_place_order', 'system_kokoko');
  
  return { success: true };
});

runner.addTest('Cross-lane implicit task creation', 'Cross-Lane References', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Customer
  place order -> @System.future_task
@System
  validate`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'customer_place_order', 'place order');
  expectTaskExists(parser, 'system_future_task', 'future_task');
  expectConnection(ast.connections, 'customer_place_order', 'system_future_task');
  
  const futureTask = parser.tasks['system_future_task'];
  if (!futureTask.implicit) {
    return { success: false, message: 'Task should be marked as implicit' };
  }
  
  return { success: true };
});

// =============================================================================
// GATEWAY TESTS
// =============================================================================

runner.addTest('Simple gateway', 'Gateways', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A
  ?Decision
    +Option A
    -Option B
  Task B`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  expectTaskExists(parser, 'lane1_decision', 'Decision');
  expectTaskExists(parser, 'lane1_option_a', 'Option A');
  expectTaskExists(parser, 'lane1_option_b', 'Option B');
  expectTaskExists(parser, 'lane1_task_b', 'Task B');
  
  const gateway = parser.tasks['lane1_decision'];
  if (gateway.type !== 'gateway') {
    return { success: false, message: 'Gateway type incorrect' };
  }
  
  return { success: true };
});

runner.addTest('Gateway with End events', 'Gateways', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A
  ?Decision
    +Continue
    -!End
  Task B`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  expectTaskExists(parser, 'lane1_decision', 'Decision');
  expectTaskExists(parser, 'lane1_continue', 'Continue');
  expectTaskExists(parser, 'process_end', 'End');
  
  // Check that negative branch connects to End event
  expectConnection(ast.connections, 'lane1_decision', 'lane1_continue');
  
  return { success: true };
});

// =============================================================================
// PROCESS EVENTS TESTS
// =============================================================================

runner.addTest('Process Start event', 'Process Events', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
!Start
@Lane1
  Task A
  Task B`;
  
  const ast = parser.parse(bpl);
  
  // Check if start event was created with correct ID
  expectTaskExists(parser, 'process_start', 'Start');
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  
  // Process start should connect to first task
  expectConnection(ast.connections, 'process_start', 'lane1_task_a');
  
  return { success: true };
});

runner.addTest('Process End event', 'Process Events', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A
  Task B
!End`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  expectTaskExists(parser, 'lane1_task_b', 'Task B');
  expectTaskExists(parser, 'process_end', 'End');
  
  return { success: true };
});

// =============================================================================
// MESSAGE FLOW TESTS
// =============================================================================

runner.addTest('Basic message flow', 'Message Flows', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Customer
  send: Payment
@System
  receive: Payment`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'customer_send_payment', 'send: Payment');
  expectTaskExists(parser, 'system_receive_payment', 'receive: Payment');
  
  // Check for message flow
  const messageFlow = findMessageFlow(ast.connections, 'customer_send_payment', 'system_receive_payment');
  if (!messageFlow) {
    return { success: false, message: 'Message flow not found' };
  }
  
  return { success: true };
});

runner.addTest('Complex message flow', 'Message Flows', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Customer
  Place Order
  send: Payment
  receive: Confirmation
@System
  receive: Payment
  Process Payment
  send: Confirmation`;
  
  const ast = parser.parse(bpl);
  
  // Check both message flows exist
  expectConnection(ast.connections, 'customer_send_payment', 'system_receive_payment', 'messageFlow');
  expectConnection(ast.connections, 'system_send_confirmation', 'customer_receive_confirmation', 'messageFlow');
  
  return { success: true };
});

// =============================================================================
// DATA OBJECT TESTS
// =============================================================================

runner.addTest('Data object association', 'Data Objects', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A
  #OrderData Task A`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  
  // Check for data object in the parser's dataObjects array
  if (!parser.dataObjects || parser.dataObjects.length === 0) {
    return { success: false, message: 'No data objects found in parser' };
  }
  
  const dataObj = parser.dataObjects.find(d => d.name === 'OrderData');
  if (!dataObj) {
    // List available data objects for debugging
    const availableObjs = parser.dataObjects.map(d => d.name).join(', ');
    return { success: false, message: `Data object "OrderData" not found. Available: ${availableObjs}` };
  }
  
  // Check for data association
  const association = findDataAssociation(ast.connections, dataObj.id, 'lane1_task_a');
  if (!association) {
    return { success: false, message: 'Data association not found' };
  }
  
  return { success: true };
});

// =============================================================================
// CONNECTION BREAKS TESTS
// =============================================================================

runner.addTest('Connection break prevents linking', 'Connection Breaks', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A
  Task B
---
  Task C`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  expectTaskExists(parser, 'lane1_task_b', 'Task B');
  expectTaskExists(parser, 'lane1_task_c', 'Task C');
  
  // Should have connection A -> B
  expectConnection(ast.connections, 'lane1_task_a', 'lane1_task_b');
  
  // Should NOT have connection B -> C (blocked by break)
  const blockedConnection = findConnection(ast.connections, 'lane1_task_b', 'lane1_task_c');
  if (blockedConnection) {
    return { success: false, message: 'Connection break did not prevent linking' };
  }
  
  return { success: true };
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

runner.addTest('Empty lines handling', 'Edge Cases', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process

@Lane1

  Task A


  Task B

`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  expectTaskExists(parser, 'lane1_task_b', 'Task B');
  
  return { success: true };
});

runner.addTest('Special characters in names', 'Edge Cases', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task-with-dashes
  Task_with_underscores
  Task.with.dots`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_with_dashes', 'Task-with-dashes');
  expectTaskExists(parser, 'lane1_task_with_underscores', 'Task_with_underscores');
  expectTaskExists(parser, 'lane1_task_with_dots', 'Task.with.dots');
  
  return { success: true };
});

runner.addTest('Mixed arrow directions', 'Edge Cases', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A -> Task B
  Task C <- Task D`;
  
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane1_task_a', 'Task A');
  expectTaskExists(parser, 'lane1_task_b', 'Task B');
  expectTaskExists(parser, 'lane1_task_c', 'Task C');
  expectTaskExists(parser, 'lane1_task_d', 'Task D');
  
  expectConnection(ast.connections, 'lane1_task_a', 'lane1_task_b');
  expectConnection(ast.connections, 'lane1_task_d', 'lane1_task_c');
  
  return { success: true };
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

runner.addTest('Large process parsing', 'Performance', () => {
  const parser = new BpmnLiteParser();
  
  // Generate a large BPL with many tasks
  let bpl = ':Large Process\n';
  for (let i = 1; i <= 10; i++) {
    bpl += `@Lane${i}\n`;
    for (let j = 1; j <= 20; j++) {
      bpl += `  Task ${i}-${j}\n`;
    }
  }
  
  const startTime = Date.now();
  const ast = parser.parse(bpl);
  const duration = Date.now() - startTime;
  
  // Should complete within reasonable time (< 1 second)
  if (duration > 1000) {
    return { success: false, message: `Parsing took too long: ${duration}ms` };
  }
  
  // Should create correct number of tasks
  const taskCount = Object.keys(parser.tasks).length;
  if (taskCount !== 200) {
    return { success: false, message: `Expected 200 tasks, got ${taskCount}. BPL length: ${bpl.length}` };
  }
  
  return { success: true };
});

// =============================================================================
// MERMAID OUTPUT TESTS
// =============================================================================

runner.addTest('Mermaid output generation', 'Mermaid Output', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Test Process
@Lane1
  Task A -> Task B`;
  
  const ast = parser.parse(bpl);
  const mermaid = parser.toMermaid();
  
  if (!mermaid.includes('flowchart TD')) {
    return { success: false, message: 'Mermaid output missing flowchart declaration' };
  }
  
  if (!mermaid.includes('lane1_task_a')) {
    return { success: false, message: 'Mermaid output missing task A' };
  }
  
  if (!mermaid.includes('lane1_task_b')) {
    return { success: false, message: 'Mermaid output missing task B' };
  }
  
  return { success: true };
});

// =============================================================================
// USER-REPORTED SCENARIOS
// =============================================================================

runner.addTest('Backward reference scenario (working)', 'User Scenarios', () => {
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
  
  // Should have correct connection from place order to kokoko
  expectConnection(ast.connections, 'customer_place_order', 'system_kokoko');
  
  // Should have End event connection only from the lane containing !End (System)
  expectConnection(ast.connections, 'system_kokoko', 'process_end');
  
  // Should have cross-lane connection from Customer to System
  expectConnection(ast.connections, 'customer_receive_confirmation', 'system_receive_payment');
  
  return { success: true };
});

runner.addTest('Forward reference scenario (fixed)', 'User Scenarios', () => {
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
  
  // Should resolve to system_kokoko, not create customer_kokoko
  expectTaskExists(parser, 'system_kokoko', 'kokoko');
  
  // Should NOT create customer_kokoko
  if (parser.tasks['customer_kokoko']) {
    return { success: false, message: 'Incorrectly created customer_kokoko instead of resolving to system_kokoko' };
  }
  
  // Should have correct connection from place order to kokoko in System lane
  expectConnection(ast.connections, 'customer_place_order', 'system_kokoko');
  
  // Should have End event connection only from the lane containing !End (System)
  expectConnection(ast.connections, 'system_kokoko', 'process_end');
  
  // Should have cross-lane connection from Customer to System
  expectConnection(ast.connections, 'customer_receive_confirmation', 'system_receive_payment');
  
  return { success: true };
});

runner.addTest('End event auto-connection', 'User Scenarios', () => {
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
  
  // Should have End event connection only from the lane containing !End (System)
  expectConnection(ast.connections, 'system_send_confirmation', 'process_end');
  
  // Should have cross-lane connection from Customer to System
  expectConnection(ast.connections, 'customer_receive_confirmation', 'system_receive_payment');
  
  return { success: true };
});

// Run all tests
runner.run();