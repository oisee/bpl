// Test process-level Start/End events
const fs = require('fs');

// Load parser from src/index.html
const htmlContent = fs.readFileSync('src/index.html', 'utf8');
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);

// Set up minimal browser environment
global.window = global;
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  addEventListener: () => null
};
global.localStorage = {
  getItem: () => null,
  setItem: () => null
};

// Load the parser
try {
  eval(scriptMatch[1]);
} catch (e) {
  // Ignore UI errors
}

// Test case 1: Process-level Start/End
const bpl1 = `:Process Name
  !Start
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

// Test case 2: Lane-level Start/End  
const bpl2 = `:Process Name
@Customer
  !Start
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

function analyzeCase(name, bpl) {
  console.log(`\n=== ${name} ===\n`);
  console.log('BPL Input:');
  console.log(bpl);
  console.log('\n');
  
  const parser = new BpmnLiteParser();
  const result = parser.parse(bpl);
  
  // Check for sg0 or other strange nodes
  console.log('All tasks:');
  Object.entries(result.tasks).forEach(([id, task]) => {
    console.log(`  ${id}: ${task.name} (${task.type}) in lane ${task.lane || 'none'}`);
  });
  
  // Check Start connections
  const startConnections = result.connections.filter(c => 
    c.sourceRef === 'start_1' || c.sourceRef.includes('start')
  );
  console.log('\nStart connections:');
  startConnections.forEach(c => {
    const target = result.tasks[c.targetRef];
    console.log(`  start -> ${target ? target.name : c.targetRef}`);
  });
  
  // Check End connections
  const endConnections = result.connections.filter(c => 
    c.targetRef === 'end_1' || c.targetRef.includes('end')
  );
  console.log('\nEnd connections:');
  endConnections.forEach(c => {
    const source = result.tasks[c.sourceRef];
    console.log(`  ${source ? source.name : c.sourceRef} -> end`);
  });
  
  // Find send: Confirmation
  const sendConf = Object.values(result.tasks).find(t => 
    t.name && t.name.toLowerCase().includes('send confirmation')
  );
  
  if (sendConf) {
    const outgoing = result.connections.filter(c => c.sourceRef === sendConf.id);
    console.log(`\nSend Confirmation outgoing connections:`);
    outgoing.forEach(c => {
      const target = result.tasks[c.targetRef];
      console.log(`  -> ${target ? target.name : c.targetRef}`);
    });
  }
  
  // Generate Mermaid
  console.log('\nMermaid output:');
  const mermaid = parser.toMermaid();
  
  // Check for sg0
  if (mermaid.includes('sg0')) {
    console.error('❌ Found sg0 in Mermaid output!');
    // Find lines with sg0
    const lines = mermaid.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('sg0')) {
        console.error(`  Line ${i + 1}: ${line}`);
      }
    });
  } else {
    console.log('✓ No sg0 found');
  }
  
  // Check if End has incoming connections in Mermaid
  const endPattern = /-->.*end_1/;
  if (mermaid.match(endPattern)) {
    console.log('✓ End event has incoming connections in Mermaid');
  } else {
    console.error('❌ End event has no incoming connections in Mermaid');
  }
}

analyzeCase('Process-level Start/End', bpl1);
analyzeCase('Lane-level Start/End', bpl2);