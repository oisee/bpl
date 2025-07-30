const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser.js');

/**
 * BPL Philosophy Analysis
 * 
 * Understanding what makes sense in a business process DSL:
 * 1. Tasks should flow sequentially within a lane (role/actor)
 * 2. Gateways represent decisions with branches
 * 3. Only positive branches continue the main flow
 * 4. Negative branches are typically dead ends or error handling
 * 5. Messages flow between lanes (cross-functional communication)
 * 6. Connection breaks (---) explicitly stop flow
 */

console.log('BPL DSL Philosophy Analysis');
console.log('===========================\n');

function analyzeProcess(title, bpl, explanation) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
  console.log(`\nBPL Code:`);
  console.log(bpl.split('\n').map(l => '  ' + l).join('\n'));
  
  console.log(`\nExplanation: ${explanation}`);
  
  const parser = new BpmnLiteParser();
  const ast = parser.parse(bpl);
  
  console.log('\nParsed Structure:');
  ast.processes.forEach(process => {
    console.log(`Process: ${process.name}`);
    process.lanes.forEach(lane => {
      console.log(`  Lane: ${lane.name}`);
      lane.elements.forEach(elem => {
        const typeIcon = {
          'task': '□',
          'gateway': '◇',
          'branch': elem.branchType === 'positive' ? '+' : '-',
          'send': '→',
          'receive': '←',
          'event': '○',
          'comment': '💬'
        }[elem.type] || '?';
        console.log(`    ${typeIcon} ${elem.name} (${elem.id})`);
      });
    });
  });
  
  console.log('\nConnections:');
  const connections = ast.connections.filter(c => c.type === 'sequenceFlow');
  connections.forEach(conn => {
    const source = Object.values(parser.tasks).find(t => t.id === conn.sourceRef);
    const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
    console.log(`  ${source?.name || conn.sourceRef} → ${target?.name || conn.targetRef}`);
  });
  
  console.log('\nAnalysis:');
  return { parser, ast };
}

// Example 1: Simple Linear Process
analyzeProcess(
  'Example 1: Simple Linear Process',
  `:Order Processing
@Sales
  receive order
  validate order
  process payment
  ship product`,
  'Simple sequential flow - each task should connect to the next'
);

console.log('✅ Expected: Each task connects to the next in sequence');
console.log('✅ This makes sense for a linear business process');

// Example 2: Process with Decision
analyzeProcess(
  'Example 2: Process with Decision (Gateway)',
  `:Order Approval
@Manager
  review order
  ?Approve Order
    +approve and continue
    -reject and notify
  finalize process`,
  'Gateway branches should handle different outcomes'
);

console.log('❓ Question: Should "finalize process" happen after rejection?');
console.log('💡 In business terms: Usually NO - rejection ends the process');
console.log('✅ Expected: Only positive branch connects to "finalize process"');

// Example 3: The GitHub Issue Example
const issueResult = analyzeProcess(
  'Example 3: GitHub Issue #4 Case',
  `:Sprint Development Process
@Developer
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features`,
  'After tests pass, only successful deployment should lead to demo'
);

console.log('❓ Question: Should "demo features" happen if tests fail?');
console.log('💡 In business terms: NO - you don\'t demo failed features');
console.log('✅ Expected: Only "deploy to staging" → "demo features"');
console.log('❌ Bug: "receive: Review Feedback" → "demo features" (skips decision!)');

// Let's check what connections exist
const receiveReview = Object.values(issueResult.parser.tasks).find(t => t.name === 'receive: Review Feedback');
const demoFeatures = Object.values(issueResult.parser.tasks).find(t => t.name === 'demo features');
const hasDirectConnection = issueResult.ast.connections.some(c => 
  c.sourceRef === receiveReview.id && c.targetRef === demoFeatures.id
);
console.log(`\n🐛 Direct connection exists: ${hasDirectConnection}`);

// Example 4: Cross-functional Process
analyzeProcess(
  'Example 4: Cross-functional Process',
  `:Purchase Order Process
@Requester
  submit request
  send: Purchase Order
  receive: Approval Status
  ?Approved
    +proceed with purchase
    -cancel request

@Approver
  receive: Purchase Order
  review request
  ?Approve
    +approve request
    -reject request
  send: Approval Status`,
  'Cross-lane communication via messages'
);

console.log('✅ Expected: Message flows connect send/receive pairs');
console.log('✅ Each lane has its own flow');
console.log('✅ Gateways in each lane control their own branches');

// Example 5: Proper Use of Connection Breaks
analyzeProcess(
  'Example 5: Using Connection Breaks',
  `:Incident Response
@Support
  receive incident
  investigate issue
  ?Resolved
    +close ticket
    -escalate to engineering
  ---
  generate report`,
  'Connection break prevents automatic flow to report generation'
);

console.log('✅ Expected: "generate report" is isolated (no incoming connections)');
console.log('💡 Makes sense: Report generation might be triggered separately');

// Example 6: What SHOULD Connect
analyzeProcess(
  'Example 6: Meaningful Connections',
  `:Loan Application
@Customer
  submit application
  provide documents
  receive: Decision
  ?Approved
    +sign contract
    -!End

@Bank
  receive documents
  verify information
  ?Credit Check Pass
    +approve loan
    -reject application
  send: Decision`,
  'Only meaningful paths should connect'
);

console.log('✅ Expected connections:');
console.log('  - Sequential tasks within each lane');
console.log('  - Gateway to its branches');
console.log('  - Positive branches continue flow');
console.log('  - Negative branches end or have limited continuation');
console.log('  - Messages between lanes');

// Summary
console.log('\n\n=== BPL DSL PHILOSOPHY SUMMARY ===');
console.log('\n1. SEQUENTIAL FLOW:');
console.log('   Tasks in a lane flow sequentially UNLESS interrupted by:');
console.log('   - A gateway (decision point)');
console.log('   - A connection break (---)');
console.log('   - An end event (!End)');

console.log('\n2. GATEWAYS (Decisions):');
console.log('   - Task before gateway → Gateway → Branches');
console.log('   - Positive branches (+) continue the main flow');
console.log('   - Negative branches (-) typically end or have limited flow');
console.log('   - Tasks after branches connect ONLY from positive branches');

console.log('\n3. MEANINGFUL CONNECTIONS:');
console.log('   ✅ DO Connect:');
console.log('      - Sequential tasks in same lane');
console.log('      - Gateway to its branches');
console.log('      - Positive branches to continuation tasks');
console.log('      - Send tasks to matching receive tasks');
console.log('   ');
console.log('   ❌ DON\'T Connect:');
console.log('      - Tasks before gateway directly to tasks after branches');
console.log('      - Negative branches to main flow continuation');
console.log('      - Tasks across connection breaks');
console.log('      - Tasks from different processes');

console.log('\n4. BUSINESS LOGIC:');
console.log('   The DSL should reflect real business processes:');
console.log('   - Decisions have consequences');
console.log('   - Negative outcomes usually end or require different handling');
console.log('   - Cross-functional communication happens via messages');
console.log('   - Some tasks are triggered independently (after ---)');

console.log('\n5. THE BUG (Issue #4):');
console.log('   Current parser connects tasks sequentially even when');
console.log('   a gateway should control the flow. This breaks the');
console.log('   business logic where decisions matter!');