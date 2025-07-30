const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser-fixed.js');

/**
 * Comprehensive Regression Test Suite for BPL Parser
 * 
 * This test suite covers:
 * 1. Basic sequential task connections
 * 2. Gateway connections and branching logic
 * 3. Cross-lane connections
 * 4. Message flows (send/receive)
 * 5. Data objects
 * 6. Connection breaks (---)
 * 7. Start/End events
 * 8. Nested gateways
 * 9. Edge cases and error conditions
 * 10. Issue #4: Unnecessary connections after gateways
 */

class TestRunner {
  constructor() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = [];
  }

  test(name, fn) {
    this.totalTests++;
    console.log(`\n=== TEST: ${name} ===`);
    
    try {
      const result = fn();
      if (result.passed) {
        this.passedTests++;
        console.log(`✅ PASSED`);
      } else {
        this.failedTests.push({ name, reason: result.reason });
        console.log(`❌ FAILED: ${result.reason}`);
      }
      
      if (result.details) {
        console.log(`Details: ${result.details}`);
      }
    } catch (error) {
      this.failedTests.push({ name, reason: error.message });
      console.log(`❌ ERROR: ${error.message}`);
    }
  }

  summary() {
    console.log('\n' + '='.repeat(60));
    console.log(`REGRESSION TEST SUMMARY`);
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests}`);
    console.log(`Failed: ${this.failedTests.length}`);
    
    if (this.failedTests.length > 0) {
      console.log('\nFailed Tests:');
      this.failedTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.reason}`);
      });
    }
    
    console.log('\n' + (this.failedTests.length === 0 ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'));
  }
}

// Helper functions
function findTask(tasks, name) {
  return Object.values(tasks).find(task => 
    task.name.toLowerCase().includes(name.toLowerCase())
  );
}

function hasConnection(connections, sourceId, targetId) {
  return connections.some(conn => 
    conn.sourceRef === sourceId && conn.targetRef === targetId
  );
}

function countConnections(connections, sourceId) {
  return connections.filter(conn => conn.sourceRef === sourceId).length;
}

// Start testing
const runner = new TestRunner();

// Test 1: Basic Sequential Tasks
runner.test('Basic Sequential Tasks', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Simple Process
@Lane1
  task1
  task2
  task3`;
  
  const ast = parser.parse(bpl);
  const task1 = findTask(parser.tasks, 'task1');
  const task2 = findTask(parser.tasks, 'task2');
  const task3 = findTask(parser.tasks, 'task3');
  
  const hasTask1ToTask2 = hasConnection(ast.connections, task1.id, task2.id);
  const hasTask2ToTask3 = hasConnection(ast.connections, task2.id, task3.id);
  
  return {
    passed: hasTask1ToTask2 && hasTask2ToTask3,
    reason: !hasTask1ToTask2 ? 'Missing connection task1->task2' : 
            !hasTask2ToTask3 ? 'Missing connection task2->task3' : '',
    details: `Found ${ast.connections.length} connections`
  };
});

// Test 2: Gateway with Branches
runner.test('Gateway with Branches', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Gateway Process
@Lane1
  task1
  ?Decision
    +yes task
    -no task
  task2`;
  
  const ast = parser.parse(bpl);
  const task1 = findTask(parser.tasks, 'task1');
  const gateway = findTask(parser.tasks, 'Decision');
  const yesTask = findTask(parser.tasks, 'yes task');
  const noTask = findTask(parser.tasks, 'no task');
  const task2 = findTask(parser.tasks, 'task2');
  
  const gatewayConnections = countConnections(ast.connections, gateway.id);
  const yesToTask2 = hasConnection(ast.connections, yesTask.id, task2.id);
  const noToTask2 = hasConnection(ast.connections, noTask.id, task2.id);
  
  return {
    passed: gatewayConnections === 2 && yesToTask2 && !noToTask2,
    reason: gatewayConnections !== 2 ? `Gateway has ${gatewayConnections} connections, expected 2` :
            !yesToTask2 ? 'Yes branch should connect to task2' :
            noToTask2 ? 'No branch should NOT connect to task2' : '',
    details: `Gateway connections: ${gatewayConnections}, Yes->Task2: ${yesToTask2}, No->Task2: ${noToTask2}`
  };
});

// Test 3: Cross-Lane Connections
runner.test('Cross-Lane Connections', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Cross Lane Process
@Lane1
  task1
  task2
@Lane2
  task3
  task4`;
  
  const ast = parser.parse(bpl);
  const task2 = findTask(parser.tasks, 'task2');
  const task3 = findTask(parser.tasks, 'task3');
  
  const hasLaneSwitch = hasConnection(ast.connections, task2.id, task3.id);
  
  return {
    passed: hasLaneSwitch,
    reason: !hasLaneSwitch ? 'Missing connection between lanes (task2->task3)' : '',
    details: `Total connections: ${ast.connections.length}`
  };
});

// Test 4: Message Flows
runner.test('Message Flows', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Message Process
@Sender
  task1
  send: Order
  task2
@Receiver
  task3
  receive: Order
  task4`;
  
  const ast = parser.parse(bpl);
  const sendOrder = findTask(parser.tasks, 'send: Order');
  const receiveOrder = findTask(parser.tasks, 'receive: Order');
  
  const messageFlow = ast.connections.find(conn => 
    conn.type === 'messageFlow' &&
    conn.sourceRef === sendOrder.id &&
    conn.targetRef === receiveOrder.id
  );
  
  return {
    passed: messageFlow !== undefined,
    reason: !messageFlow ? 'Missing message flow between send and receive' : '',
    details: `Message flows: ${ast.connections.filter(c => c.type === 'messageFlow').length}`
  };
});

// Test 5: Connection Breaks
runner.test('Connection Breaks', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Break Process
@Lane1
  task1
  task2
  ---
  task3
  task4`;
  
  const ast = parser.parse(bpl);
  const task2 = findTask(parser.tasks, 'task2');
  const task3 = findTask(parser.tasks, 'task3');
  
  const hasBrokenConnection = hasConnection(ast.connections, task2.id, task3.id);
  
  return {
    passed: !hasBrokenConnection,
    reason: hasBrokenConnection ? 'Connection should be broken by --- but exists' : '',
    details: `Connection breaks: ${parser.connectionBreaks.length}`
  };
});

// Test 6: Start and End Events
runner.test('Start and End Events', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Event Process
@Lane1
  !Start
  task1
  ?Decision
    +continue
    -!End
  task2
  !End`;
  
  const ast = parser.parse(bpl);
  const startEvent = findTask(parser.tasks, 'Start');
  const endBranch = findTask(parser.tasks, 'End');
  const task2End = Object.values(parser.tasks).find(t => t.name === 'End' && t.id.includes('end_task'));
  
  const hasStartEvent = startEvent !== undefined;
  const hasEndEvents = endBranch !== undefined && task2End !== undefined;
  
  return {
    passed: hasStartEvent && hasEndEvents,
    reason: !hasStartEvent ? 'Missing Start event' : 
            !hasEndEvents ? 'Missing End events' : '',
    details: `Events found: ${parser.events.length}`
  };
});

// Test 7: Nested Gateways
runner.test('Nested Gateways', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Nested Gateway Process
@Lane1
  task1
  ?Gateway1
    +path1
      ?Gateway2
        +path2a
        -path2b
    -path3
  task2`;
  
  const ast = parser.parse(bpl);
  const gateway1 = findTask(parser.tasks, 'Gateway1');
  const gateway2 = findTask(parser.tasks, 'Gateway2');
  const path1 = findTask(parser.tasks, 'path1');
  
  const gateway1Connections = countConnections(ast.connections, gateway1.id);
  const gateway2Connections = gateway2 ? countConnections(ast.connections, gateway2.id) : 0;
  const path1ToGateway2 = gateway2 ? hasConnection(ast.connections, path1.id, gateway2.id) : false;
  
  return {
    passed: gateway1Connections === 2 && gateway2Connections === 2 && path1ToGateway2,
    reason: gateway1Connections !== 2 ? `Gateway1 has ${gateway1Connections} connections, expected 2` :
            gateway2Connections !== 2 ? `Gateway2 has ${gateway2Connections} connections, expected 2` :
            !path1ToGateway2 ? 'Path1 should connect to Gateway2' : '',
    details: `Gateway1: ${gateway1Connections} connections, Gateway2: ${gateway2Connections} connections`
  };
});

// Test 8: Data Objects
runner.test('Data Objects', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Data Process
@Lane1
  task1
  #Document task1
  task2
  #Report task2`;
  
  const ast = parser.parse(bpl);
  const dataObjects = ast.dataObjects;
  const dataConnections = ast.connections.filter(c => c.type === 'dataAssociation');
  
  return {
    passed: dataObjects.length === 2 && dataConnections.length === 2,
    reason: dataObjects.length !== 2 ? `Found ${dataObjects.length} data objects, expected 2` :
            dataConnections.length !== 2 ? `Found ${dataConnections.length} data associations, expected 2` : '',
    details: `Data objects: ${dataObjects.length}, Data associations: ${dataConnections.length}`
  };
});

// Test 9: Issue #4 - Unnecessary Connection After Gateway
runner.test('Issue #4 - Unnecessary Connection After Gateway', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Sprint Development Process
@Developer
  receive: Sprint Goals
  estimate tasks
  implement features
  send: Code Review Request
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features`;
  
  const ast = parser.parse(bpl);
  const receiveReviewFeedback = findTask(parser.tasks, 'receive: Review Feedback');
  const testsPassGateway = findTask(parser.tasks, 'Tests Pass');
  const demoFeatures = findTask(parser.tasks, 'demo features');
  
  // Check for the problematic direct connection
  const hasDirectConnection = hasConnection(ast.connections, receiveReviewFeedback.id, demoFeatures.id);
  
  // Check for correct connection through gateway
  const hasGatewayConnection = hasConnection(ast.connections, receiveReviewFeedback.id, testsPassGateway.id);
  
  return {
    passed: !hasDirectConnection && hasGatewayConnection,
    reason: hasDirectConnection ? 'Unnecessary direct connection exists (Issue #4)' :
            !hasGatewayConnection ? 'Missing connection to gateway' : '',
    details: `Direct connection: ${hasDirectConnection}, Gateway connection: ${hasGatewayConnection}`
  };
});

// Test 10: Multiple Processes
runner.test('Multiple Processes', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Process 1
@Lane1
  task1
  task2

:Process 2
@Lane2
  task3
  task4`;
  
  const ast = parser.parse(bpl);
  const processes = ast.processes;
  const task2 = findTask(parser.tasks, 'task2');
  const task3 = findTask(parser.tasks, 'task3');
  
  // Tasks from different processes should not connect
  const hasInvalidConnection = hasConnection(ast.connections, task2.id, task3.id);
  
  return {
    passed: processes.length === 2 && !hasInvalidConnection,
    reason: processes.length !== 2 ? `Found ${processes.length} processes, expected 2` :
            hasInvalidConnection ? 'Tasks from different processes should not connect' : '',
    details: `Processes: ${processes.length}`
  };
});

// Test 11: Complex Gateway Merge
runner.test('Complex Gateway Merge', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Merge Process
@Lane1
  task1
  ?Gateway1
    +|Approved| approve task
    +|Review| review task
    -|Reject| reject task
  merge point
  final task`;
  
  const ast = parser.parse(bpl);
  const approveTask = findTask(parser.tasks, 'approve task');
  const reviewTask = findTask(parser.tasks, 'review task');
  const rejectTask = findTask(parser.tasks, 'reject task');
  const mergePoint = findTask(parser.tasks, 'merge point');
  
  // Only positive branches should merge
  const approveToMerge = hasConnection(ast.connections, approveTask.id, mergePoint.id);
  const reviewToMerge = hasConnection(ast.connections, reviewTask.id, mergePoint.id);
  const rejectToMerge = hasConnection(ast.connections, rejectTask.id, mergePoint.id);
  
  return {
    passed: approveToMerge && reviewToMerge && !rejectToMerge,
    reason: !approveToMerge ? 'Approve should connect to merge' :
            !reviewToMerge ? 'Review should connect to merge' :
            rejectToMerge ? 'Reject should NOT connect to merge' : '',
    details: `Approve->Merge: ${approveToMerge}, Review->Merge: ${reviewToMerge}, Reject->Merge: ${rejectToMerge}`
  };
});

// Test 12: Comments and Technical Comments
runner.test('Comments and Technical Comments', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Comment Process
@Lane1
  task1
  // This is a technical comment
  "This is a business comment"
  task2
  // Another technical comment
  task3`;
  
  const ast = parser.parse(bpl);
  const tasks = Object.values(parser.tasks);
  const comments = tasks.filter(t => t.type === 'comment');
  const regularTasks = tasks.filter(t => t.type === 'task');
  
  // Technical comments should be ignored
  return {
    passed: comments.length === 1 && regularTasks.length === 3,
    reason: comments.length !== 1 ? `Found ${comments.length} comments, expected 1` :
            regularTasks.length !== 3 ? `Found ${regularTasks.length} tasks, expected 3` : '',
    details: `Comments: ${comments.length}, Tasks: ${regularTasks.length}`
  };
});

// Test 13: Arrow Operators in Tasks
runner.test('Arrow Operators in Tasks', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Arrow Process
@Lane1
  task1 -> task2
  task3 <- task4`;
  
  const ast = parser.parse(bpl);
  const task1 = findTask(parser.tasks, 'task1');
  const task2 = findTask(parser.tasks, 'task2');
  const task3 = findTask(parser.tasks, 'task3');
  const task4 = findTask(parser.tasks, 'task4');
  
  // Check explicit connections from arrow operators
  const hasForwardArrow = hasConnection(ast.connections, task1.id, task2.id);
  const hasBackwardArrow = hasConnection(ast.connections, task4.id, task3.id);
  
  return {
    passed: hasForwardArrow && hasBackwardArrow,
    reason: !hasForwardArrow ? 'Missing forward arrow connection' :
            !hasBackwardArrow ? 'Missing backward arrow connection' : '',
    details: `Total connections: ${ast.connections.length}`
  };
});

// Test 14: Edge Case - Empty Lanes
runner.test('Edge Case - Empty Lanes', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:Empty Lane Process
@Lane1
  task1
@EmptyLane
@Lane2
  task2`;
  
  const ast = parser.parse(bpl);
  const lanes = ast.processes[0].lanes;
  const emptyLane = lanes.find(l => l.name === 'EmptyLane');
  
  return {
    passed: lanes.length === 3 && emptyLane && emptyLane.elements.length === 0,
    reason: lanes.length !== 3 ? `Found ${lanes.length} lanes, expected 3` :
            !emptyLane ? 'Empty lane not found' :
            emptyLane.elements.length !== 0 ? 'Empty lane has elements' : '',
    details: `Lanes: ${lanes.length}`
  };
});

// Test 15: End Event After Branches
runner.test('End Event After Branches', () => {
  const parser = new BpmnLiteParser();
  const bpl = `:End After Branch Process
@Lane1
  task1
  ?Decision
    +continue
    -!End
  ---
  task2`;
  
  const ast = parser.parse(bpl);
  const endBranch = findTask(parser.tasks, 'End');
  const task2 = findTask(parser.tasks, 'task2');
  
  // Check that there's no connection from End to task2
  const connections = ast.connections.filter(conn => 
    conn.sourceRef === endBranch.id
  );
  
  const invalidConnection = connections.some(conn => 
    conn.targetRef === task2.id
  );
  
  return {
    passed: !invalidConnection && parser.connectionBreaks.length > 0,
    reason: invalidConnection ? 'End event should not connect to subsequent tasks' :
            parser.connectionBreaks.length === 0 ? 'Connection break not detected after End' : '',
    details: `Connection breaks: ${parser.connectionBreaks.length}`
  };
});

// Run summary
runner.summary();