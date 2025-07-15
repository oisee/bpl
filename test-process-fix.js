// Test the fixed parser
const fs = require('fs');

// Load the fixed parser from dist
const htmlContent = fs.readFileSync('dist/index.html', 'utf8');
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);

// Set up browser environment
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

// Execute parser
try {
  eval(scriptMatch[1]);
} catch (e) {
  // Ignore UI errors
}

// Test case
const bpl = `:Process Name
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

console.log('=== Testing Process-level Start/End ===\n');

const parser = new BpmnLiteParser();
const result = parser.parse(bpl);

// Check lanes
console.log('LANES:');
Object.entries(result.lanes).forEach(([id, lane]) => {
  console.log(`  ${id}: ${lane.tasks.length} tasks`);
});

// Check for Default lane
if (result.lanes['@Default']) {
  console.error('\n❌ Default lane was created');
} else {
  console.log('\n✓ No Default lane created');
}

// Check Mermaid for sg0
const mermaid = parser.toMermaid();
if (mermaid.includes('sg0')) {
  console.error('❌ Found sg0 in Mermaid output');
  // Show the sg0 lines
  const lines = mermaid.split('\n').filter(line => line.includes('sg0'));
  lines.forEach(line => console.error(`  ${line}`));
} else {
  console.log('✓ No sg0 in Mermaid output');
}

// Check End event connections
const sendConf = Object.values(result.tasks).find(t => 
  t.name && t.name.toLowerCase().includes('send confirmation')
);
const processEnd = result.tasks['process_end'];

if (sendConf && processEnd) {
  const hasConnection = result.connections.some(c => 
    c.sourceRef === sendConf.id && c.targetRef === 'process_end'
  );
  
  if (hasConnection) {
    console.log('✓ Send Confirmation connects to process End');
  } else {
    console.error('❌ Send Confirmation does NOT connect to process End');
    
    // Debug: Show outgoing connections from Send Confirmation
    const outgoing = result.connections.filter(c => c.sourceRef === sendConf.id);
    console.log('\n  Send Confirmation outgoing connections:');
    outgoing.forEach(c => {
      console.log(`    ${c.type}: -> ${c.targetRef}`);
    });
  }
}

// Show relevant Mermaid section
console.log('\n=== Mermaid End Connections ===');
const endLines = mermaid.split('\n').filter(line => 
  line.includes('process_end') || line.includes('--> process_end')
);
endLines.forEach(line => console.log(line));