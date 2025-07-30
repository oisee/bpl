// Simple test using shared parser
const fs = require('fs');

// Read shared parser
const sharedParser = fs.readFileSync('shared/parser-original.js', 'utf8');

// Create a basic BpmnLiteParser implementation
eval(sharedParser);

console.log('🧪 Testing BPL Parser...\n');

try {
  const parser = new BpmnLiteParser();

  // Test 1: Basic parsing
  console.log('Test 1: Basic parsing');
  const dsl1 = `@Customer
    Task A
    Task B`;

  const result1 = parser.parse(dsl1);
  console.log('✅ Parsed successfully');
  console.log(`   Tasks: ${Object.keys(result1.processes[0].lanes[0].elements).length}`);
  console.log(`   Connections: ${result1.connections.length}`);

  // Test 2: Cross-lane flow
  console.log('\nTest 2: Cross-lane flow');
  const dsl2 = `@Customer
    Task A
  @System
    Task B`;

  const result2 = parser.parse(dsl2);
  console.log('✅ Cross-lane parsing successful');
  console.log(`   Connections: ${result2.connections.length}`);

  console.log('\n🎉 Parser is working correctly!');
} catch (error) {
  console.error('❌ Parser test failed:', error.message);
}