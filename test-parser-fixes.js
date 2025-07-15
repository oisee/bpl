// Test script to verify parser fixes
const fs = require('fs');

// Load the parser from the HTML file
const htmlContent = fs.readFileSync('./src/index.html', 'utf8');
const parserCode = htmlContent.match(/class BpmnLiteParser \{[\s\S]*?toMermaid\(\) \{[\s\S]*?\n    \}/)[0];

// Evaluate the parser code
eval(parserCode);

// Test cases
const testCases = [
  {
    name: "Original Example - !End connection",
    bpl: `:Process Name
@Customer
  place order
  send: Payment
  receive: Confirmation
@System
  receive: Payment
  ?Payment Valid
    +ship order
    -cancel order
  send: Confirmation -> !End
  kokoko`,
    expectedConnections: [
      { desc: "send: Confirmation -> !End", from: "system_send__confirmation", to: "process_end" },
      { desc: "send: Confirmation -> kokoko", from: "system_send__confirmation", to: "system_kokoko" }
    ]
  },
  {
    name: "Multiple arrows in one line",
    bpl: `:Multi Arrow Test
@Lane1
  Task A -> Task B -> Task C
  Task D <- Task E <- Task F`,
    expectedConnections: [
      { desc: "Task A -> Task B", from: "lane1_task_a", to: "lane1_task_b" },
      { desc: "Task B -> Task C", from: "lane1_task_b", to: "lane1_task_c" },
      { desc: "Task E -> Task D", from: "lane1_task_e", to: "lane1_task_d" },
      { desc: "Task F -> Task E", from: "lane1_task_f", to: "lane1_task_e" }
    ]
  }
];

// Run tests
testCases.forEach((testCase, index) => {
  console.log(`\n=== Test ${index + 1}: ${testCase.name} ===`);
  
  try {
    const parser = new BpmnLiteParser();
    const ast = parser.parse(testCase.bpl);
    
    console.log("\nParsed tasks:");
    Object.values(ast.processes[0].lanes).forEach(lane => {
      console.log(`  Lane: ${lane.name}`);
      lane.elements.forEach(elem => {
        console.log(`    - ${elem.type}: ${elem.name} (id: ${elem.id})`);
      });
    });
    
    console.log("\nConnections:");
    ast.connections.forEach(conn => {
      console.log(`  ${conn.sourceRef} -> ${conn.targetRef} (${conn.type})`);
    });
    
    // Check expected connections
    console.log("\nVerifying expected connections:");
    testCase.expectedConnections.forEach(expected => {
      const found = ast.connections.find(conn => 
        conn.sourceRef === expected.from && conn.targetRef === expected.to
      );
      
      if (found) {
        console.log(`  ✓ ${expected.desc}`);
      } else {
        console.log(`  ✗ ${expected.desc} (NOT FOUND)`);
      }
    });
    
    // Check for !End being process-level
    const endEvent = parser.tasks['process_end'];
    if (endEvent) {
      console.log(`\n!End event status:`);
      console.log(`  - Type: ${endEvent.type}`);
      console.log(`  - Event Type: ${endEvent.eventType}`);
      console.log(`  - Lane: ${endEvent.lane || 'null (process-level)'}`);
      
      if (endEvent.lane === null) {
        console.log(`  ✓ !End is correctly a process-level event`);
      } else {
        console.log(`  ✗ !End is incorrectly in lane: ${endEvent.lane}`);
      }
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
  }
});

console.log("\n=== All tests completed ===");