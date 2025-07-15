const fs = require('fs');

// Load the parser from the HTML file
const htmlContent = fs.readFileSync('./src/index.html', 'utf8');

// Extract the parser class - need to handle the multiline method definitions
const parserMatch = htmlContent.match(/class BpmnLiteParser \{[\s\S]*?\n\s*toMermaid\(\) \{[\s\S]*?\n\s*\}\s*\}/);
if (!parserMatch) {
  console.error('Failed to extract parser class');
  process.exit(1);
}

// Evaluate the parser code
eval(parserMatch[0]);

// Test cases for connection resolution
const testCases = [
  {
    name: "Backward reference - same lane",
    bpl: `:Test Process
@Customer
  place order
  send: Payment
  kokoko <- place order
  receive: Confirmation`,
    expectedConnections: [
      { from: "customer_place_order", to: "customer_kokoko", type: "sequenceFlow" }
    ]
  },
  {
    name: "Backward reference - explicit lane",
    bpl: `:Test Process
@Customer
  place order
  send: Payment
  receive: Confirmation
@System
  receive: Payment
  kokoko <- @Customer.place order`,
    expectedConnections: [
      { from: "customer_place_order", to: "system_kokoko", type: "sequenceFlow" }
    ]
  },
  {
    name: "Forward reference - explicit lane",
    bpl: `:Test Process
@Customer
  place order -> @System.kokoko
  send: Payment
@System
  receive: Payment
  kokoko`,
    expectedConnections: [
      { from: "customer_place_order", to: "system_kokoko", type: "sequenceFlow" }
    ]
  },
  {
    name: "Forward reference - implicit creation",
    bpl: `:Test Process
@Customer
  place order -> future_task
  send: Payment`,
    expectedConnections: [
      { from: "customer_place_order", to: "customer_future_task", type: "sequenceFlow" }
    ]
  },
  {
    name: "Multiple arrows in one line",
    bpl: `:Test Process
@Lane1
  Task A -> Task B -> Task C
  Task D <- Task E <- Task F`,
    expectedConnections: [
      { from: "lane1_task_a", to: "lane1_task_b", type: "sequenceFlow" },
      { from: "lane1_task_b", to: "lane1_task_c", type: "sequenceFlow" },
      { from: "lane1_task_e", to: "lane1_task_d", type: "sequenceFlow" },
      { from: "lane1_task_f", to: "lane1_task_e", type: "sequenceFlow" }
    ]
  },
  {
    name: "Cross-lane references - various formats",
    bpl: `:Test Process
@Customer
  place order
  send: Payment -> @System.receive: Payment
@System
  process <- @Customer.place order
  validate payment <- process`,
    expectedConnections: [
      { from: "customer_send__payment", to: "system_receive__payment", type: "sequenceFlow" },
      { from: "customer_place_order", to: "system_process", type: "sequenceFlow" },
      { from: "system_process", to: "system_validate_payment", type: "sequenceFlow" }
    ]
  }
];

// Run tests
console.log("=== BPL Connection Resolution Tests ===\n");

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log("BPL Code:");
  console.log(testCase.bpl.split('\n').map(l => '  ' + l).join('\n'));
  
  try {
    const parser = new BpmnLiteParser();
    const ast = parser.parse(testCase.bpl);
    
    // Extract all tasks for debugging
    console.log("\nParsed tasks:");
    Object.values(parser.tasks).forEach(task => {
      if (task.implicit) {
        console.log(`  - ${task.id} (${task.type}): "${task.name}" [IMPLICIT]`);
      } else {
        console.log(`  - ${task.id} (${task.type}): "${task.name}"`);
      }
    });
    
    // Show all connections
    console.log("\nGenerated connections:");
    ast.connections.filter(c => c.type === 'sequenceFlow').forEach(conn => {
      console.log(`  - ${conn.sourceRef} → ${conn.targetRef}`);
    });
    
    // Verify expected connections
    console.log("\nVerification:");
    let allPassed = true;
    testCase.expectedConnections.forEach(expected => {
      const found = ast.connections.find(conn => 
        conn.sourceRef === expected.from && 
        conn.targetRef === expected.to &&
        conn.type === expected.type
      );
      
      if (found) {
        console.log(`  ✓ ${expected.from} → ${expected.to}`);
      } else {
        console.log(`  ✗ ${expected.from} → ${expected.to} (NOT FOUND)`);
        allPassed = false;
        
        // Debug: Check if tasks exist
        const sourceExists = parser.tasks[expected.from];
        const targetExists = parser.tasks[expected.to];
        if (!sourceExists) console.log(`    ! Source task "${expected.from}" does not exist`);
        if (!targetExists) console.log(`    ! Target task "${expected.to}" does not exist`);
      }
    });
    
    console.log(`\nResult: ${allPassed ? 'PASSED' : 'FAILED'}`);
    
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    console.error(error.stack);
  }
  
  console.log("\n" + "=".repeat(60) + "\n");
});

// Special test for the specific issue
console.log("=== SPECIFIC ISSUE TEST ===\n");
const specificTest = `:Process Name
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

console.log("Testing specific case:");
console.log(specificTest);

try {
  const parser = new BpmnLiteParser();
  const ast = parser.parse(specificTest);
  
  console.log("\nAll tasks:");
  Object.values(parser.tasks).forEach(task => {
    console.log(`  - ${task.id}: "${task.name}" (${task.type}) in ${task.lane || 'no lane'}`);
  });
  
  console.log("\nAll connections:");
  ast.connections.forEach(conn => {
    console.log(`  - ${conn.type}: ${conn.sourceRef} → ${conn.targetRef} ${conn.name ? `(${conn.name})` : ''}`);
  });
  
  // Check for the specific connection
  const kokokoTask = parser.tasks['system_kokoko'];
  const placeOrderTask = parser.tasks['customer_place_order'];
  
  console.log("\nDebugging kokoko <- @Customer.place order:");
  console.log(`  kokoko task exists: ${kokokoTask ? 'YES' : 'NO'}`);
  console.log(`  place order task exists: ${placeOrderTask ? 'YES' : 'NO'}`);
  
  const expectedConnection = ast.connections.find(conn => 
    conn.sourceRef === 'customer_place_order' && 
    conn.targetRef === 'system_kokoko'
  );
  
  console.log(`  Connection exists: ${expectedConnection ? 'YES' : 'NO'}`);
  
} catch (error) {
  console.error(`Error: ${error.message}`);
  console.error(error.stack);
}