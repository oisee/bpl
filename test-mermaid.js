// Test Mermaid output from BPL parser
const fs = require('fs');
const path = require('path');

// Read and execute the parser from src/index.html
const htmlContent = fs.readFileSync(path.join(__dirname, 'src/index.html'), 'utf8');

// Extract the parser code from the HTML
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('Could not extract parser script from HTML');
  process.exit(1);
}

// Create a minimal browser-like environment
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  addEventListener: () => null
};
global.window = global;
global.localStorage = {
  getItem: () => null,
  setItem: () => null
};

// Execute the parser code but catch any UI-related errors
try {
  eval(scriptMatch[1]);
} catch (e) {
  // Ignore UI initialization errors
  if (!e.message.includes('getElementById') && !e.message.includes('querySelector')) {
    throw e;
  }
}

// Now test the parser
const parser = new BPLParser();

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
  send: Confirmation`;

console.log('=== Testing BPL Parser ===\n');
console.log('Input BPL:');
console.log(bpl);
console.log('\n');

try {
  const result = parser.parse(bpl);
  
  // Check for self-connections
  const selfConnections = result.connections.filter(conn => 
    conn.sourceRef === conn.targetRef
  );
  
  if (selfConnections.length > 0) {
    console.error('❌ SELF-CONNECTIONS FOUND:');
    selfConnections.forEach(conn => {
      console.error(`  - ${conn.sourceRef} -> ${conn.targetRef}`);
    });
  } else {
    console.log('✓ No self-connections found');
  }
  
  // Find specific tasks
  const shipOrder = Object.values(result.tasks).find(t => 
    t.name.toLowerCase().includes('ship order')
  );
  const sendConfirmation = Object.values(result.tasks).find(t => 
    t.name.toLowerCase().includes('send confirmation')
  );
  const gateway = Object.values(result.tasks).find(t => 
    t.name.toLowerCase().includes('payment valid')
  );
  
  console.log('\n=== Connection Analysis ===');
  
  if (shipOrder) {
    const outgoing = result.connections.filter(c => c.sourceRef === shipOrder.id);
    const incoming = result.connections.filter(c => c.targetRef === shipOrder.id);
    
    console.log(`\nShip Order (${shipOrder.id}):`);
    console.log('  Incoming connections:');
    incoming.forEach(c => {
      const source = result.tasks[c.sourceRef];
      console.log(`    - from ${source ? source.name : c.sourceRef}`);
    });
    console.log('  Outgoing connections:');
    outgoing.forEach(c => {
      const target = result.tasks[c.targetRef];
      console.log(`    - to ${target ? target.name : c.targetRef}`);
    });
  }
  
  // Generate and show Mermaid
  console.log('\n=== Mermaid Output ===');
  const mermaid = parser.toMermaid();
  console.log(mermaid);
  
  // Check specific connections in Mermaid
  console.log('\n=== Mermaid Connection Checks ===');
  
  // Check if ship order has self-connection in Mermaid
  if (shipOrder) {
    const selfConnPattern = new RegExp(`${shipOrder.id}.*-->.*${shipOrder.id}`, 'g');
    const hasSelfConn = mermaid.match(selfConnPattern);
    if (hasSelfConn) {
      console.error(`❌ Ship order has self-connection in Mermaid: ${hasSelfConn}`);
    } else {
      console.log('✓ No self-connection for ship order in Mermaid');
    }
    
    // Check correct connection
    if (sendConfirmation) {
      const correctConnPattern = new RegExp(`${shipOrder.id}.*-->.*${sendConfirmation.id}`, 'g');
      const hasCorrectConn = mermaid.match(correctConnPattern);
      if (hasCorrectConn) {
        console.log(`✓ Ship order correctly connects to send confirmation`);
      } else {
        console.error('❌ Ship order does not connect to send confirmation');
      }
    }
  }
  
} catch (error) {
  console.error('Parse error:', error);
  console.error(error.stack);
}