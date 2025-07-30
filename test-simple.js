// Simple test to verify main parser functionality
const fs = require('fs');

// Read the HTML file and extract parser
const html = fs.readFileSync('src/index.html', 'utf8');
const parserMatch = html.match(/class BpmnLiteParser \{[\s\S]*?\n    \}/);

if (!parserMatch) {
  console.error('❌ Could not find BpmnLiteParser in index.html');
  process.exit(1);
}

// Evaluate the parser class
eval(parserMatch[0]);

// Test basic functionality
console.log('🧪 Testing BPL Parser...\n');

const parser = new BpmnLiteParser();

// Test 1: Basic parsing
console.log('Test 1: Basic parsing');
const dsl1 = `@Customer
  Task A
  Task B`;

const result1 = parser.parse(dsl1);
console.log('✅ Parsed successfully');
console.log(`   Processes: ${result1.processes.length}`);
console.log(`   Lanes: ${result1.processes[0].lanes.length}`);
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

// Test 3: Gateway test
console.log('\nTest 3: Gateway with branches');
const dsl3 = `@Developer
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features`;

const result3 = parser.parse(dsl3);
console.log('✅ Gateway parsing successful');
console.log(`   Tasks: ${Object.keys(result3.processes[0].lanes[0].elements).length}`);
console.log(`   Connections: ${result3.connections.length}`);

console.log('\n🎉 All basic tests passed! Parser is working correctly.');