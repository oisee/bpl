// Quick test to debug the specific issue

// Simulate the splitConnections function
function splitConnections(line) {
  const parts = [];
  let currentPart = '';
  let i = 0;
  
  while (i < line.length) {
    if (line.substr(i, 2) === '->' || line.substr(i, 2) === '<-') {
      // Add the current part if it exists
      if (currentPart.trim()) {
        parts.push(currentPart.trim());
      }
      // Add the operator as a separate part
      parts.push(line.substr(i, 2));
      currentPart = '';
      i += 2;
    } else {
      currentPart += line[i];
      i++;
    }
  }
  
  // Add the last part if it exists
  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }
  
  return parts;
}

// Test the specific line
const testLine = '  kokoko <- @Customer.place order';
const trimmedLine = testLine.trim();

console.log('Original line:', JSON.stringify(testLine));
console.log('Trimmed line:', JSON.stringify(trimmedLine));

const parts = splitConnections(trimmedLine);
console.log('\nSplit parts:', parts);
console.log('Number of parts:', parts.length);

if (parts.length > 1) {
  console.log('\nLine contains arrow operators:');
  parts.forEach((part, i) => {
    console.log(`  Part ${i}: "${part}" - is operator: ${part === '->' || part === '<-'}`);
  });
} else {
  console.log('\nLine does NOT contain arrow operators - will be processed as single task');
}

// Test all our cases
console.log('\n=== Testing all cases ===');
const testCases = [
  'kokoko <- @Customer.place order',
  'place order -> @System.kokoko',
  'Task A -> Task B -> Task C',
  'send: Payment -> @System.receive: Payment',
  'process <- @Customer.place order'
];

testCases.forEach(testCase => {
  const parts = splitConnections(testCase);
  console.log(`\n"${testCase}"`);
  console.log('  Parts:', parts);
  console.log('  Has arrows:', parts.length > 1);
});