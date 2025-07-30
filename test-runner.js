// Standalone test runner for connectivity tests

// Load the parser (simplified version)
class BpmnLiteParser {
  constructor() {
    this.processes = [];
    this.lanes = {};
    this.tasks = {};
    this.connections = [];
    this.dataObjects = [];
    this.messages = [];
    this.events = [];
    this.currentProcess = null;
    this.currentLane = null;
    this.lastTask = null;
    this.taskScope = {};
    this.gatewayStack = [];
    this.connectionBreaks = [];
    this.taskLineNumbers = {};
  }

  parse(text) {
    // Simplified parsing for testing
    this.originalText = text;
    const lines = text.split('\n');
    
    // Mock parsing - just create tasks based on simple patterns
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      if (trimmed.startsWith('@')) {
        this.currentLane = trimmed;
        if (!this.lanes[trimmed]) {
          this.lanes[trimmed] = { tasks: [] };
        }
      } else if (!trimmed.startsWith(':') && !trimmed.startsWith('---')) {
        // Create a task
        const laneName = this.currentLane ? this.currentLane.replace('@', '') : 'default';
        const taskName = trimmed.replace(/^[?!+-]/, '').split(/->|<-/)[0].trim();
        const taskId = `${this.normalizeId(laneName)}_${this.normalizeId(taskName)}`;
        
        this.tasks[taskId] = {
          id: taskId,
          name: taskName,
          lane: laneName,
          type: trimmed.startsWith('?') ? 'gateway' : 
                trimmed.startsWith('!') ? 'event' :
                trimmed.startsWith('+') || trimmed.startsWith('-') ? 'branch' :
                trimmed.startsWith('send:') ? 'send' :
                trimmed.startsWith('receive:') ? 'receive' : 'task'
        };
        
        if (this.currentLane) {
          this.lanes[this.currentLane].tasks.push(taskId);
        }
        
        this.taskLineNumbers[taskId] = i;
      }
    });
    
    // Mock sequential connections
    this.connectTasks();
    
    return {
      processes: [],
      connections: this.connections
    };
  }

  connectTasks() {
    // Mock connectivity - just basic sequential
    const allTasks = Object.keys(this.tasks);
    for (let i = 1; i < allTasks.length; i++) {
      this.addConnection('flow', allTasks[i-1], allTasks[i]);
    }
  }

  addConnection(type, source, target, name = '') {
    this.connections.push({
      type: type === 'flow' ? 'sequenceFlow' : 'messageFlow',
      sourceRef: source,
      targetRef: target,
      name: name
    });
  }

  normalizeId(name) {
    if (!name) return 'unknown';
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}

// Load test cases
const { testCases, runConnectivityTests } = require('./test-connectivity.js');

// Run tests
console.log('Running connectivity tests...\n');
const results = runConnectivityTests(BpmnLiteParser);

// Display results
console.log('=== CONNECTIVITY TEST RESULTS ===\n');
results.forEach(result => {
  const status = result.passed ? '✅' : '❌';
  console.log(`${status} ${result.name}`);
  console.log(`   Expected: ${result.stats.expected}, Actual: ${result.stats.actual}`);
  
  if (!result.passed) {
    if (result.stats.missing > 0) {
      console.log(`   Missing connections (${result.stats.missing}):`);
      result.missing.forEach(m => {
        console.log(`     - ${m.from} -> ${m.to} (${m.type})`);
      });
    }
    
    if (result.stats.extra > 0) {
      console.log(`   Extra connections (${result.stats.extra}):`);
      result.extra.forEach(e => {
        console.log(`     - ${e.from} -> ${e.to} (${e.type})`);
      });
    }
  }
  console.log('');
});

const passed = results.filter(r => r.passed).length;
const total = results.length;
console.log(`\nSummary: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)\n`);

// Exit with error if any tests failed
if (passed < total) {
  process.exit(1);
}