const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser.js');

/**
 * Expected Behavior Test Suite
 * 
 * This test defines what SHOULD happen based on business process logic
 * and compares it with what ACTUALLY happens in the parser.
 */

console.log('BPL Expected Behavior Test Suite');
console.log('================================\n');

function testExpectedBehavior(title, bpl, expectedConnections, explanation) {
  console.log(`\nTest: ${title}`);
  console.log('-'.repeat(title.length + 6));
  
  console.log('\nBPL:');
  console.log(bpl.split('\n').map(l => '  ' + l).join('\n'));
  
  console.log(`\nBusiness Logic: ${explanation}`);
  
  const parser = new BpmnLiteParser();
  const ast = parser.parse(bpl);
  
  // Build a map of task names to IDs for easier reference
  const taskMap = {};
  Object.values(parser.tasks).forEach(task => {
    taskMap[task.name] = task.id;
  });
  
  console.log('\nExpected Connections:');
  expectedConnections.forEach(conn => {
    console.log(`  ${conn.from} → ${conn.to}${conn.reason ? ` (${conn.reason})` : ''}`);
  });
  
  console.log('\nActual Connections:');
  const actualSequenceFlows = ast.connections.filter(c => c.type === 'sequenceFlow');
  actualSequenceFlows.forEach(conn => {
    const source = Object.values(parser.tasks).find(t => t.id === conn.sourceRef);
    const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
    console.log(`  ${source?.name} → ${target?.name}`);
  });
  
  console.log('\nValidation:');
  let allCorrect = true;
  
  // Check expected connections exist
  expectedConnections.forEach(expected => {
    const sourceId = taskMap[expected.from];
    const targetId = taskMap[expected.to];
    const exists = ast.connections.some(conn => 
      conn.sourceRef === sourceId && conn.targetRef === targetId
    );
    
    if (!exists) {
      console.log(`  ❌ Missing: ${expected.from} → ${expected.to}`);
      allCorrect = false;
    } else {
      console.log(`  ✅ Found: ${expected.from} → ${expected.to}`);
    }
  });
  
  // Check for unexpected connections
  actualSequenceFlows.forEach(conn => {
    const source = Object.values(parser.tasks).find(t => t.id === conn.sourceRef);
    const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
    
    const isExpected = expectedConnections.some(exp => 
      exp.from === source?.name && exp.to === target?.name
    );
    
    if (!isExpected && source && target) {
      console.log(`  ❌ Unexpected: ${source.name} → ${target.name}`);
      allCorrect = false;
    }
  });
  
  return allCorrect;
}

// Test 1: Gateway blocks direct flow
testExpectedBehavior(
  'Gateway Controls Flow',
  `:Test Process
@Actor
  task before gateway
  ?Decision Point
    +success path
    -failure path
  continuation task`,
  [
    { from: 'task before gateway', to: 'Decision Point', reason: 'sequential' },
    { from: 'Decision Point', to: 'success path', reason: 'positive branch' },
    { from: 'Decision Point', to: 'failure path', reason: 'negative branch' },
    { from: 'success path', to: 'continuation task', reason: 'positive continues' }
    // NO connection from 'task before gateway' to 'continuation task'
    // NO connection from 'failure path' to 'continuation task'
  ],
  'Gateways control flow - only positive branches continue'
);

// Test 2: The GitHub Issue Example
testExpectedBehavior(
  'Sprint Development Process (Issue #4)',
  `:Sprint Development Process
@Developer
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features`,
  [
    { from: 'receive: Review Feedback', to: 'Tests Pass', reason: 'sequential to gateway' },
    { from: 'Tests Pass', to: 'deploy to staging', reason: 'positive branch' },
    { from: 'Tests Pass', to: 'fix issues', reason: 'negative branch' },
    { from: 'deploy to staging', to: 'demo features', reason: 'deployment before demo' }
    // NO connection from 'receive: Review Feedback' to 'demo features'
    // NO connection from 'fix issues' to 'demo features'
  ],
  'You only demo features that passed tests and were deployed'
);

// Test 3: Multiple Gateways
testExpectedBehavior(
  'Multiple Decision Points',
  `:Approval Process
@Manager
  receive request
  ?Initial Review
    +proceed
    -reject immediately
  gather information
  ?Final Decision
    +approve
    -deny
  notify requester`,
  [
    { from: 'receive request', to: 'Initial Review' },
    { from: 'Initial Review', to: 'proceed' },
    { from: 'Initial Review', to: 'reject immediately' },
    { from: 'proceed', to: 'gather information' },
    { from: 'gather information', to: 'Final Decision' },
    { from: 'Final Decision', to: 'approve' },
    { from: 'Final Decision', to: 'deny' },
    { from: 'approve', to: 'notify requester' }
    // NO connection from 'reject immediately' to 'gather information'
    // NO connection from 'deny' to 'notify requester'
    // NO connection from 'receive request' to 'gather information'
    // NO connection from 'gather information' to 'notify requester'
  ],
  'Each gateway controls its section of the flow'
);

// Test 4: Cross-lane with Gateways
testExpectedBehavior(
  'Cross-functional Process',
  `:Order Process
@Customer
  place order
  send: Order Details
  receive: Order Status
  ?Order Confirmed
    +make payment
    -cancel order

@Vendor
  receive: Order Details
  check inventory
  ?In Stock
    +confirm order
    -reject order
  send: Order Status`,
  [
    // Customer lane
    { from: 'place order', to: 'send: Order Details' },
    { from: 'send: Order Details', to: 'receive: Order Status' },
    { from: 'receive: Order Status', to: 'Order Confirmed' },
    { from: 'Order Confirmed', to: 'make payment' },
    { from: 'Order Confirmed', to: 'cancel order' },
    // Vendor lane
    { from: 'receive: Order Details', to: 'check inventory' },
    { from: 'check inventory', to: 'In Stock' },
    { from: 'In Stock', to: 'confirm order' },
    { from: 'In Stock', to: 'reject order' },
    { from: 'confirm order', to: 'send: Order Status' }
    // NO connection from 'reject order' to 'send: Order Status'
    // NO connection from 'place order' to 'receive: Order Status'
    // NO connection from 'check inventory' to 'send: Order Status'
  ],
  'Each lane has independent flow control via gateways'
);

// Test 5: Connection Breaks
testExpectedBehavior(
  'Explicit Connection Breaks',
  `:Report Process
@Analyst
  collect data
  analyze results
  ?Significant Findings
    +create detailed report
    -create summary
  ---
  archive data
  cleanup temp files`,
  [
    { from: 'collect data', to: 'analyze results' },
    { from: 'analyze results', to: 'Significant Findings' },
    { from: 'Significant Findings', to: 'create detailed report' },
    { from: 'Significant Findings', to: 'create summary' },
    { from: 'archive data', to: 'cleanup temp files' }
    // NO connections to 'archive data' from above tasks due to ---
    // NO connections from report creation to archive/cleanup
  ],
  'Connection break (---) creates isolated task groups'
);

// Test 6: End Events
testExpectedBehavior(
  'End Events Stop Flow',
  `:Error Handling
@System
  process request
  ?Validate Input
    +continue processing
    -log error
      !End
  transform data
  save results`,
  [
    { from: 'process request', to: 'Validate Input' },
    { from: 'Validate Input', to: 'continue processing' },
    { from: 'Validate Input', to: 'log error' },
    { from: 'log error', to: 'End' },
    { from: 'continue processing', to: 'transform data' },
    { from: 'transform data', to: 'save results' }
    // NO connection from 'End' to anything
    // NO connection from 'log error' to 'transform data'
  ],
  'End events terminate that branch of the process'
);

// Summary
console.log('\n\n=== EXPECTED BEHAVIOR SUMMARY ===\n');

console.log('Key Principles for BPL Connections:\n');

console.log('1. GATEWAYS ARE CONTROL STRUCTURES');
console.log('   - They decide which path to take');
console.log('   - Tasks before gateways should NOT skip to tasks after branches');
console.log('   - Only branches lead to subsequent tasks\n');

console.log('2. BRANCH SEMANTICS MATTER');
console.log('   - Positive branches (+) represent success/continuation');
console.log('   - Negative branches (-) represent failure/termination');
console.log('   - Usually only positive branches connect to continuation tasks\n');

console.log('3. EXPLICIT FLOW CONTROL');
console.log('   - Connection breaks (---) create isolated sections');
console.log('   - End events (!End) terminate flow');
console.log('   - Messages connect specific send/receive pairs\n');

console.log('4. BUSINESS PROCESS LOGIC');
console.log('   - Connections should make business sense');
console.log('   - Failed validations shouldn\'t lead to success actions');
console.log('   - Rejected items shouldn\'t continue normal flow\n');

console.log('The current parser violates these principles by creating');
console.log('direct connections that bypass gateway logic, making the');
console.log('gateway decisions meaningless!');