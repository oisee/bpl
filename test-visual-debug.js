const { BpmnLiteParser } = require('./vscode-bpmn-lite/out/parser.js');

/**
 * Visual Debug Test for BPL Parser
 * 
 * This test provides visual representation of the connection issues
 * to help understand and debug the problems.
 */

function visualizeConnections(parser, ast, title) {
  console.log(`\n${title}`);
  console.log('='.repeat(title.length));
  
  // Group tasks by lane
  const lanes = {};
  Object.values(parser.tasks).forEach(task => {
    const lane = task.lane || 'No Lane';
    if (!lanes[lane]) lanes[lane] = [];
    lanes[lane].push(task);
  });
  
  // Display tasks by lane
  Object.entries(lanes).forEach(([laneName, tasks]) => {
    console.log(`\n@${laneName}`);
    tasks.forEach(task => {
      let icon = '';
      switch(task.type) {
        case 'gateway': icon = '◇'; break;
        case 'branch': icon = task.branchType === 'positive' ? '+' : '-'; break;
        case 'send': icon = '→'; break;
        case 'receive': icon = '←'; break;
        case 'event': icon = '○'; break;
        default: icon = '□';
      }
      console.log(`  ${icon} ${task.name} (${task.id})`);
    });
  });
  
  // Display connections
  console.log('\nConnections:');
  const connections = ast.connections.filter(c => c.type === 'sequenceFlow');
  connections.forEach(conn => {
    const source = Object.values(parser.tasks).find(t => t.id === conn.sourceRef);
    const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
    
    // Highlight problematic connections
    let marker = '';
    if (source && target) {
      // Check if this is a skip connection (task before gateway to task after gateway)
      const isSkipConnection = checkIfSkipConnection(parser, source, target);
      if (isSkipConnection) {
        marker = ' ❌ SKIP CONNECTION';
      }
    }
    
    console.log(`  ${source?.name || conn.sourceRef} → ${target?.name || conn.targetRef}${marker}`);
  });
  
  // Display message flows
  const messageFlows = ast.connections.filter(c => c.type === 'messageFlow');
  if (messageFlows.length > 0) {
    console.log('\nMessage Flows:');
    messageFlows.forEach(conn => {
      const source = Object.values(parser.tasks).find(t => t.id === conn.sourceRef);
      const target = Object.values(parser.tasks).find(t => t.id === conn.targetRef);
      console.log(`  ${source?.name} ··→ ${target?.name} (${conn.name || 'message'})`);
    });
  }
}

function checkIfSkipConnection(parser, source, target) {
  // Check if source is before a gateway and target is after gateway branches
  const tasks = Object.values(parser.tasks);
  
  // Find gateways
  const gateways = tasks.filter(t => t.type === 'gateway');
  
  for (const gateway of gateways) {
    // Check if source comes before this gateway in the same lane
    if (source.lane === gateway.lane) {
      // Check if target comes after gateway branches
      const branches = tasks.filter(t => 
        t.type === 'branch' && t.parentGateway === gateway.id
      );
      
      // If there are branches and target is in the same lane after them
      if (branches.length > 0 && target.lane === gateway.lane) {
        // This could be a skip connection
        return true;
      }
    }
  }
  
  return false;
}

// Test Case 1: Issue #4 Original Example
const issue4Example = `:Sprint Development Process

@ProductOwner
  define user stories
  prioritize backlog
  send: Sprint Goals
  review demo
  ?Accept Stories
    +update release notes
    -request changes

@Developer
  receive: Sprint Goals
  estimate tasks
  implement features
  send: Code Review Request
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features

@QA
  receive: Code Review Request
  review code
  run tests
  send: Review Feedback
  ?Quality Check
    +approve release
    -report bugs`;

const parser1 = new BpmnLiteParser();
const ast1 = parser1.parse(issue4Example);
visualizeConnections(parser1, ast1, 'Issue #4: Sprint Development Process');

// Specifically highlight the problem
console.log('\n🔍 ISSUE #4 ANALYSIS:');
const receiveReviewFeedback = Object.values(parser1.tasks).find(t => t.name === 'receive: Review Feedback');
const demoFeatures = Object.values(parser1.tasks).find(t => t.name === 'demo features');
const testsPass = Object.values(parser1.tasks).find(t => t.name === 'Tests Pass');

console.log(`\nThe problematic connection:`);
console.log(`  "receive: Review Feedback" → "demo features"`);
console.log(`\nThis connection should NOT exist because:`);
console.log(`  1. "receive: Review Feedback" should only connect to "Tests Pass" gateway`);
console.log(`  2. The gateway should connect to its branches`);
console.log(`  3. Only the positive branch "deploy to staging" should connect to "demo features"`);

// Test Case 2: Simplified Version
const simplified = `:Simplified Issue
@Lane1
  task before gateway
  ?Gateway
    +positive branch
    -negative branch
  task after branches`;

const parser2 = new BpmnLiteParser();
const ast2 = parser2.parse(simplified);
visualizeConnections(parser2, ast2, '\nSimplified Version of Issue #4');

console.log('\n🔍 SIMPLIFIED ANALYSIS:');
console.log('The issue is clear: "task before gateway" connects directly to "task after branches"');
console.log('This bypasses the gateway logic entirely!');

// Test Case 3: Expected Behavior
const expected = `:Expected Behavior
@Lane1
  task1
  ?Gateway
    +positive branch
    -negative branch
  ---
  isolated task`;

const parser3 = new BpmnLiteParser();
const ast3 = parser3.parse(expected);
visualizeConnections(parser3, ast3, '\nExpected Behavior (with connection break)');

console.log('\n🔍 EXPECTED BEHAVIOR:');
console.log('With a connection break (---), the "isolated task" is not connected');
console.log('This shows that connection breaks work, but the issue is in the automatic connection logic');

// Summary
console.log('\n\n' + '='.repeat(60));
console.log('VISUAL DEBUG SUMMARY');
console.log('='.repeat(60));
console.log('\nThe issue is in the connectSequentialTasks() method:');
console.log('1. It connects tasks sequentially within lanes');
console.log('2. It doesn\'t properly handle the case where a task comes after gateway branches');
console.log('3. The logic needs to check if a task is "reachable" only through gateway branches');
console.log('\nFix needed: When connecting sequential tasks, skip connections if:');
console.log('- The target task comes after a gateway\'s branches');
console.log('- The source task comes before the gateway');
console.log('- There\'s no explicit connection break between them');