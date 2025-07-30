const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser.js');

/**
 * Mermaid Diagram Comparison
 * Shows CURRENT vs EXPECTED behavior in visual form
 */

console.log('BPL Mermaid Diagram Comparison');
console.log('==============================\n');

function generateMermaid(ast, parser, title) {
  let mermaid = `graph TB\n`;
  mermaid += `    %% ${title}\n`;
  
  // Add start/end if needed
  const hasStart = Object.values(parser.tasks).some(t => t.type === 'event' && t.eventType === 'start');
  const hasEnd = Object.values(parser.tasks).some(t => t.type === 'event' && t.eventType === 'end');
  
  if (!hasStart) mermaid += '    Start([Start])\n';
  if (!hasEnd) mermaid += '    End([End])\n';
  
  // Group by lanes
  ast.processes.forEach(process => {
    process.lanes.forEach(lane => {
      mermaid += `    subgraph ${lane.id}["${lane.name}"]\n`;
      lane.elements.forEach(elem => {
        let shape = '';
        switch(elem.type) {
          case 'gateway':
            shape = `${elem.id}{{"${elem.name}"}}`;
            break;
          case 'branch':
            const symbol = elem.branchType === 'positive' ? '✓' : '✗';
            shape = `${elem.id}["${symbol} ${elem.name}"]`;
            break;
          case 'send':
            shape = `${elem.id}[/"→ ${elem.name}"/]`;
            break;
          case 'receive':
            shape = `${elem.id}[\\"← ${elem.name}"\\]`;
            break;
          case 'event':
            shape = `${elem.id}(("${elem.name}"))`;
            break;
          default:
            shape = `${elem.id}["${elem.name}"]`;
        }
        mermaid += `        ${shape}\n`;
      });
      mermaid += '    end\n';
    });
  });
  
  // Add connections
  mermaid += '\n    %% Connections\n';
  ast.connections.forEach(conn => {
    if (conn.type === 'sequenceFlow') {
      mermaid += `    ${conn.sourceRef} --> ${conn.targetRef}\n`;
    } else if (conn.type === 'messageFlow') {
      mermaid += `    ${conn.sourceRef} -.-> ${conn.targetRef}\n`;
    }
  });
  
  return mermaid;
}

function generateExpectedMermaid(bpl, expectedConnections) {
  // Parse to get structure
  const parser = new BpmnLiteParser();
  const ast = parser.parse(bpl);
  
  // Remove all sequence flow connections
  ast.connections = ast.connections.filter(c => c.type !== 'sequenceFlow');
  
  // Add only expected connections
  expectedConnections.forEach(conn => {
    // Find task IDs
    const sourceTask = Object.values(parser.tasks).find(t => t.name === conn.from);
    const targetTask = Object.values(parser.tasks).find(t => t.name === conn.to);
    
    if (sourceTask && targetTask) {
      ast.connections.push({
        type: 'sequenceFlow',
        id: `flow_${sourceTask.id}_${targetTask.id}`,
        sourceRef: sourceTask.id,
        targetRef: targetTask.id
      });
    }
  });
  
  return generateMermaid(ast, parser, 'EXPECTED BEHAVIOR');
}

// Test Case: Issue #4
console.log('Issue #4: Sprint Development Process\n');

const issue4BPL = `:Sprint Development Process
@Developer
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features`;

// Current behavior
const parser = new BpmnLiteParser();
const ast = parser.parse(issue4BPL);
const currentMermaid = generateMermaid(ast, parser, 'CURRENT BEHAVIOR (WITH BUG)');

console.log('CURRENT BEHAVIOR (WITH BUG):');
console.log('```mermaid');
console.log(currentMermaid);
console.log('```\n');

// Expected behavior
const expectedConnections = [
  { from: 'receive: Review Feedback', to: 'Tests Pass' },
  { from: 'Tests Pass', to: 'deploy to staging' },
  { from: 'Tests Pass', to: 'fix issues' },
  { from: 'deploy to staging', to: 'demo features' }
];

const expectedMermaid = generateExpectedMermaid(issue4BPL, expectedConnections);

console.log('EXPECTED BEHAVIOR:');
console.log('```mermaid');
console.log(expectedMermaid);
console.log('```\n');

// Highlight the problem
console.log('THE PROBLEM:');
console.log('- Current: "receive: Review Feedback" connects DIRECTLY to "demo features"');
console.log('- Expected: Only connects through the gateway and positive branch');
console.log('- Impact: Gateway decision becomes meaningless!\n');

// More complex example
console.log('\n---\n');
console.log('Complex Example: Multi-Gateway Process\n');

const complexBPL = `:Loan Application
@Customer
  submit application
  ?Complete Application
    +provide documents
    -cancel application
  wait for decision

@Bank
  review documents
  ?Credit Check
    +approve loan
    -reject loan
  notify customer`;

const parser2 = new BpmnLiteParser();
const ast2 = parser2.parse(complexBPL);
const currentMermaid2 = generateMermaid(ast2, parser2, 'CURRENT BEHAVIOR');

console.log('CURRENT BEHAVIOR:');
console.log('```mermaid');
console.log(currentMermaid2);
console.log('```\n');

const expectedConnections2 = [
  // Customer lane
  { from: 'submit application', to: 'Complete Application' },
  { from: 'Complete Application', to: 'provide documents' },
  { from: 'Complete Application', to: 'cancel application' },
  { from: 'provide documents', to: 'wait for decision' },
  // Bank lane
  { from: 'review documents', to: 'Credit Check' },
  { from: 'Credit Check', to: 'approve loan' },
  { from: 'Credit Check', to: 'reject loan' },
  { from: 'approve loan', to: 'notify customer' }
];

const expectedMermaid2 = generateExpectedMermaid(complexBPL, expectedConnections2);

console.log('EXPECTED BEHAVIOR:');
console.log('```mermaid');
console.log(expectedMermaid2);
console.log('```\n');

console.log('PROBLEMS IN CURRENT BEHAVIOR:');
console.log('1. "submit application" → "wait for decision" (skips gateway!)');
console.log('2. "review documents" → "notify customer" (skips gateway!)');
console.log('3. "wait for decision" → "review documents" (wrong cross-lane connection)');
console.log('4. "reject loan" → "notify customer" (negative branch continues!)');

// Summary
console.log('\n\n=== VISUAL COMPARISON SUMMARY ===\n');
console.log('The Mermaid diagrams clearly show that the current parser:');
console.log('1. Creates "bypass" connections around gateways');
console.log('2. Connects negative branches to continuation tasks');
console.log('3. Makes inappropriate cross-lane connections');
console.log('\nThese issues make the business process diagrams incorrect');
console.log('and the gateway decisions meaningless. The DSL should enforce');
console.log('proper flow control through gateways!');