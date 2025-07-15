// BPL Parser Tests (Node.js version)

class BPLParser {
  constructor() {
    this.lanes = {};
    this.tasks = {};
    this.connections = [];
    this.messages = [];
    this.dataObjects = [];
    this.laneOrder = [];
    this.currentLane = null;
    this.processId = 'process_1';
    this.processName = 'Business Process';
    this.startEventId = 'start_1';
    this.endEventId = 'end_1';
    this.gatewayStack = [];
    this.connectionBreaks = [];
  }

  normalizeId(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  parse(text) {
    const lines = text.split('\n');
    
    this.injectConnectionBreaksAfterEndEvents(lines);
    
    let inGateway = false;
    let currentGateway = null;
    
    lines.forEach((line, index) => {
      if (line.trim() === '---') {
        this.connectionBreaks.push(index);
        return;
      }
      
      const trimmed = line.trim();
      if (!trimmed) return;
      
      if (trimmed.startsWith(':')) {
        this.processName = trimmed.substring(1).trim();
        this.processId = `process_${this.normalizeId(this.processName)}`;
      } else if (trimmed.startsWith('@')) {
        const laneName = trimmed.substring(1).trim();
        const laneId = `lane_${this.normalizeId(laneName)}`;
        this.lanes[laneId] = {
          type: 'lane',
          name: laneName,
          id: laneId,
          tasks: []
        };
        this.laneOrder.push(laneId);
        this.currentLane = laneId;
      } else if (this.currentLane && trimmed) {
        const messageFlow = this.parseMessageFlow(trimmed);
        if (messageFlow) {
          this.lanes[this.currentLane].tasks.push(messageFlow);
        } else if (trimmed.startsWith('#')) {
          const dataObjId = this.parseDataObject(trimmed);
          if (dataObjId) {
            this.lanes[this.currentLane].tasks.push(dataObjId);
          }
        } else if (trimmed.startsWith('?')) {
          const gatewayName = trimmed.substring(1).trim();
          const gatewayId = `gateway_${this.normalizeId(gatewayName)}_${Object.keys(this.tasks).length}`;
          
          const gateway = {
            type: 'gateway',
            gatewayType: 'exclusive',
            name: gatewayName,
            id: gatewayId,
            lane: this.currentLane,
            branches: []
          };
          
          this.tasks[gatewayId] = gateway;
          this.lanes[this.currentLane].tasks.push(gatewayId);
          
          this.gatewayStack.push(gateway);
          currentGateway = gateway;
          inGateway = true;
        } else if (inGateway && (trimmed.startsWith('+') || trimmed.startsWith('-'))) {
          const isPositive = trimmed.startsWith('+');
          let branchContent = trimmed.substring(1).trim();
          let branchLabel = isPositive ? 'Yes' : 'No';
          
          const labelMatch = branchContent.match(/^\|([^|]+)\|\s*(.*)$/);
          if (labelMatch) {
            branchLabel = labelMatch[1];
            branchContent = labelMatch[2];
          }
          
          const endsWithEnd = branchContent === '!End' || branchContent === '!end';
          if (endsWithEnd) {
            branchContent = 'End';
          }
          
          const branchId = `task_${this.normalizeId(branchContent)}_${Object.keys(this.tasks).length}`;
          
          const branch = {
            type: 'branch',
            branchType: isPositive ? 'positive' : 'negative',
            label: branchLabel,
            name: branchContent,
            id: branchId,
            lane: this.currentLane,
            parentGateway: currentGateway.id,
            endsWithEnd: endsWithEnd
          };
          
          this.tasks[branchId] = branch;
          this.lanes[this.currentLane].tasks.push(branchId);
          currentGateway.branches.push(branchId);
          
          if (endsWithEnd) {
            this.connections.push({
              type: 'sequenceFlow',
              id: `flow_${branchId}_end`,
              name: '',
              sourceRef: branchId,
              targetRef: this.endEventId
            });
          }
        } else if (trimmed === '!Start' || trimmed === '!start') {
          this.connections.push({
            type: 'sequenceFlow',
            id: `flow_start_${this.normalizeId(this.currentLane)}`,
            name: '',
            sourceRef: this.startEventId,
            targetRef: null
          });
        } else if (trimmed === '!End' || trimmed === '!end') {
          const endId = `end_task_${Object.keys(this.tasks).length}`;
          const endTask = {
            type: 'end',
            name: 'End',
            id: endId,
            lane: this.currentLane
          };
          
          this.tasks[endId] = endTask;
          this.lanes[this.currentLane].tasks.push(endId);
          
          this.connections.push({
            type: 'sequenceFlow',
            id: `flow_${endId}_end`,
            name: '',
            sourceRef: endId,
            targetRef: this.endEventId
          });
        } else {
          if (this.gatewayStack.length > 0) {
            const lastNonBranchIndex = this.lanes[this.currentLane].tasks.length - 1;
            let foundNonBranch = false;
            
            for (let i = lastNonBranchIndex; i >= 0; i--) {
              const taskId = this.lanes[this.currentLane].tasks[i];
              const task = this.tasks[taskId];
              if (task && task.type !== 'branch' && task.type !== 'gateway') {
                foundNonBranch = true;
                break;
              }
            }
            
            if (!foundNonBranch || (currentGateway && 
                this.lanes[this.currentLane].tasks[lastNonBranchIndex] !== currentGateway.id &&
                this.tasks[this.lanes[this.currentLane].tasks[lastNonBranchIndex]]?.parentGateway !== currentGateway.id)) {
              this.gatewayStack.pop();
              currentGateway = this.gatewayStack[this.gatewayStack.length - 1] || null;
              inGateway = currentGateway !== null;
            }
          }
          
          const taskName = trimmed;
          const taskId = `task_${this.normalizeId(taskName)}_${Object.keys(this.tasks).length}`;
          
          this.tasks[taskId] = {
            type: 'task',
            name: taskName,
            id: taskId,
            lane: this.currentLane
          };
          
          this.lanes[this.currentLane].tasks.push(taskId);
        }
      }
    });
    
    this.connectSequentialTasks();
    
    return {
      process: {
        id: this.processId,
        name: this.processName
      },
      lanes: this.lanes,
      tasks: this.tasks,
      connections: this.connections,
      messages: this.messages,
      dataObjects: this.dataObjects,
      laneOrder: this.laneOrder
    };
  }

  parseMessageFlow(line) {
    const sendMatch = line.match(/^send:\s*(.+)$/);
    const receiveMatch = line.match(/^receive:\s*(.+)$/);
    
    if (sendMatch || receiveMatch) {
      const isSend = !!sendMatch;
      const messageName = (isSend ? sendMatch[1] : receiveMatch[1]).trim();
      const taskType = isSend ? 'send' : 'receive';
      const taskName = `${isSend ? 'Send' : 'Receive'} ${messageName}`;
      const taskId = `${taskType}_${this.normalizeId(messageName)}_${Object.keys(this.tasks).length}`;
      
      this.tasks[taskId] = {
        type: taskType,
        name: taskName,
        id: taskId,
        lane: this.currentLane,
        messageName: messageName
      };
      
      return taskId;
    }
    
    return null;
  }

  parseDataObject(line) {
    try {
      const content = line.substring(1).trim();
      const parts = content.split(' ');
      const name = parts[0];
      const taskRef = parts.slice(1).join(' ');
      
      const dataObjId = `data_${this.normalizeId(name)}`;
      
      this.dataObjects.push({
        type: 'dataObject',
        name: name,
        id: dataObjId,
        taskRef: taskRef
      });
      
      if (taskRef) {
        const taskId = this.resolveTaskId(taskRef);
        if (taskId) {
          this.addConnection('data', dataObjId, taskId);
        }
      }
      
      return dataObjId;
    } catch (error) {
      console.error(`Error parsing data object: ${line}`, error);
      return null;
    }
  }

  resolveTaskId(taskRef) {
    const normalizedRef = this.normalizeId(taskRef);
    
    const task = Object.values(this.tasks).find(t => 
      this.normalizeId(t.name) === normalizedRef
    );
    
    return task ? task.id : null;
  }

  addConnection(type, sourceId, targetId, name = '') {
    const connId = `conn_${this.normalizeId(sourceId)}_${this.normalizeId(targetId)}`;
    
    this.connections.push({
      type: type === 'flow' ? 'sequenceFlow' : 
            type === 'message' ? 'messageFlow' : 'dataAssociation',
      id: connId,
      name: name,
      sourceRef: sourceId,
      targetRef: targetId
    });
  }

  injectConnectionBreaksAfterEndEvents(lines) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '!End' || line === '!end' || line === '+!End' || line === '-!End') {
        const hasBreakAfter = this.connectionBreaks.some(breakLine => 
          breakLine > i && breakLine <= i + 2
        );
        
        if (!hasBreakAfter) {
          this.connectionBreaks.push(i + 1);
        }
      }
    }
  }

  connectSequentialTasks() {
    const gatewayMap = {};
    const gatewayBranchesMap = {};
    
    Object.values(this.tasks).forEach(task => {
      if (task.type === 'gateway') {
        gatewayMap[task.id] = task;
        gatewayBranchesMap[task.id] = {
          positive: [],
          negative: [],
          nextTask: null
        };
      }
    });
    
    Object.values(this.tasks).forEach(task => {
      if (task.type === 'branch' && task.parentGateway && gatewayBranchesMap[task.parentGateway]) {
        if (task.branchType === 'positive') {
          gatewayBranchesMap[task.parentGateway].positive.push(task.id);
        } else {
          gatewayBranchesMap[task.parentGateway].negative.push(task.id);
        }
      }
    });
    
    Object.values(this.lanes).forEach(lane => {
      let prevTask = null;
      
      const gateways = lane.tasks.filter(taskId => 
        this.tasks[taskId] && this.tasks[taskId].type === 'gateway'
      );
      
      gateways.forEach(gatewayId => {
        const gateway = this.tasks[gatewayId];
        const gatewayIndex = lane.tasks.indexOf(gatewayId);
        
        for (let i = gatewayIndex + 1; i < lane.tasks.length; i++) {
          const taskId = lane.tasks[i];
          const task = this.tasks[taskId];
          
          if (task.type === 'branch' && task.parentGateway === gatewayId) {
            continue;
          }
          
          if (task.type === 'gateway') {
            continue;
          }
          
          gatewayBranchesMap[gatewayId].nextTask = taskId;
          break;
        }
      });
      
      for (let i = 0; i < lane.tasks.length; i++) {
        const currentTaskId = lane.tasks[i];
        const currentTask = this.tasks[currentTaskId];
        
        if (currentTask.type === 'branch') {
          continue;
        }
        
        if (currentTask.type === 'gateway') {
          if (prevTask) {
            this.addConnection('flow', prevTask, currentTaskId);
          }
          continue;
        }
        
        let isAfterGateway = false;
        let sourceGateway = null;
        
        for (const [gId, data] of Object.entries(gatewayBranchesMap)) {
          if (data.nextTask === currentTaskId) {
            isAfterGateway = true;
            sourceGateway = gId;
            break;
          }
        }
        
        if (isAfterGateway && prevTask && !gatewayMap[prevTask]) {
          const fromGatewayConnections = this.connections.filter(conn =>
            conn.sourceRef === sourceGateway && conn.targetRef === currentTaskId
          );
          if (fromGatewayConnections.length === 0) {
            prevTask = null;
          }
        }
        
        if (!this.shouldBreakConnection(i, lane.tasks)) {
          if (prevTask) {
            this.addConnection('flow', prevTask, currentTaskId);
          }
        }
        
        prevTask = currentTaskId;
      }
    });
    
    Object.entries(gatewayBranchesMap).forEach(([gatewayId, data]) => {
      const gateway = this.tasks[gatewayId];
      
      gateway.branches.forEach(branchId => {
        this.addConnection('flow', gatewayId, branchId);
      });
      
      // THIS IS THE BUG - The original code has special handling for payment gateways
      data.positive.forEach(branchId => {
        const branch = this.tasks[branchId];
        
        // Original buggy code:
        /*
        if (gateway.name.toLowerCase().includes('payment')) {
          const shipOrderTask = Object.values(this.tasks).find(task => 
            task.lane === gateway.lane && 
            task.name.toLowerCase().includes('ship order')
          );
          
          if (shipOrderTask) {
            this.addConnection('flow', branchId, shipOrderTask.id);
          } else if (data.nextTask) {
            this.addConnection('flow', branchId, data.nextTask);
          }
        } else if (data.nextTask) {
          this.addConnection('flow', branchId, data.nextTask);
        }
        */
        
        // Fixed code - just connect to the next task
        if (data.nextTask) {
          this.addConnection('flow', branchId, data.nextTask);
        }
      });
    });
    
    const sendTasks = Object.values(this.tasks).filter(task => task.type === 'send');
    const receiveTasks = Object.values(this.tasks).filter(task => task.type === 'receive');
    
    sendTasks.forEach(sendTask => {
      const matchingReceive = receiveTasks.find(receiveTask => 
        receiveTask.messageName === sendTask.messageName &&
        receiveTask.lane !== sendTask.lane
      );
      
      if (matchingReceive) {
        const messageId = `msg_${this.normalizeId(sendTask.messageName)}`;
        
        if (!this.messages.find(m => m.id === messageId)) {
          this.messages.push({
            type: 'message',
            name: sendTask.messageName,
            id: messageId,
            sourceRef: sendTask.id,
            targetRef: matchingReceive.id
          });
        }
        
        this.addConnection('message', sendTask.id, matchingReceive.id, sendTask.messageName);
      }
    });
    
    const firstTask = this.lanes[this.laneOrder[0]]?.tasks[0];
    if (firstTask && this.tasks[firstTask]) {
      const startConnections = this.connections.filter(conn => 
        conn.sourceRef === this.startEventId
      );
      
      if (startConnections.length === 0) {
        this.connections.push({
          type: 'sequenceFlow',
          id: `flow_start_first`,
          name: '',
          sourceRef: this.startEventId,
          targetRef: firstTask
        });
      } else {
        startConnections.forEach(conn => {
          if (!conn.targetRef) {
            conn.targetRef = firstTask;
          }
        });
      }
    }
  }

  shouldBreakConnection(currentIndex, laneTasks) {
    for (const breakLine of this.connectionBreaks) {
      if (breakLine > currentIndex && breakLine <= currentIndex + 1) {
        return true;
      }
    }
    return false;
  }
}

// Test runner
class TestRunner {
  constructor() {
    this.results = [];
  }

  assert(condition, message) {
    this.results.push({
      pass: condition,
      message: message
    });
  }

  assertConnection(connections, sourceId, targetId, message) {
    const hasConnection = connections.some(conn => 
      conn.sourceRef === sourceId && conn.targetRef === targetId
    );
    this.assert(hasConnection, message || `Connection ${sourceId} -> ${targetId}`);
  }

  assertNoConnection(connections, sourceId, targetId, message) {
    const hasConnection = connections.some(conn => 
      conn.sourceRef === sourceId && conn.targetRef === targetId
    );
    this.assert(!hasConnection, message || `No connection ${sourceId} -> ${targetId}`);
  }

  assertConnectionCount(connections, sourceId, targetId, expectedCount, message) {
    const count = connections.filter(conn => 
      conn.sourceRef === sourceId && 
      (targetId === null || conn.targetRef === targetId)
    ).length;
    this.assert(count === expectedCount, 
      message || `${sourceId} should have ${expectedCount} connection(s) ${targetId ? `to ${targetId}` : ''} (found ${count})`);
  }

  findTaskByName(tasks, name) {
    return Object.values(tasks).find(task => 
      task.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  runTest(name, testFn) {
    console.log(`\n=== ${name} ===`);
    
    this.results = [];
    testFn(this);
    
    const passed = this.results.filter(r => r.pass).length;
    const total = this.results.length;
    console.log(`${passed}/${total} assertions passed`);
    
    this.results.forEach(result => {
      if (!result.pass) {
        console.log(`✗ ${result.message}`);
      }
    });
    
    return { passed, total };
  }
}

// Run tests
const runner = new TestRunner();
let totalPassed = 0;
let totalTests = 0;

// Test 1: Basic gateway connections  
const test1 = runner.runTest('Test 1: Basic Gateway Connections', (t) => {
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
  
  const result = parser.parse(bpl);
  
  // Find tasks
  const placeOrder = t.findTaskByName(result.tasks, 'place order');
  const sendPayment = t.findTaskByName(result.tasks, 'send payment');
  const receiveConfirmation = t.findTaskByName(result.tasks, 'receive confirmation');
  const receivePayment = t.findTaskByName(result.tasks, 'receive payment');
  const paymentGateway = t.findTaskByName(result.tasks, 'payment valid');
  const shipOrder = t.findTaskByName(result.tasks, 'ship order');
  const cancelOrder = t.findTaskByName(result.tasks, 'cancel order');
  const sendConfirmation = t.findTaskByName(result.tasks, 'send confirmation');
  
  // Test sequential connections
  t.assertConnection(result.connections, placeOrder.id, sendPayment.id, 'place order -> send payment');
  t.assertConnection(result.connections, sendPayment.id, receiveConfirmation.id, 'send payment -> receive confirmation');
  t.assertConnection(result.connections, receivePayment.id, paymentGateway.id, 'receive payment -> gateway');
  
  // Test gateway connections
  t.assertConnection(result.connections, paymentGateway.id, shipOrder.id, 'gateway -> ship order');
  t.assertConnection(result.connections, paymentGateway.id, cancelOrder.id, 'gateway -> cancel order');
  
  // Test branch connections
  t.assertConnection(result.connections, shipOrder.id, sendConfirmation.id, 'ship order -> send confirmation');
  t.assertNoConnection(result.connections, cancelOrder.id, sendConfirmation.id, 'cancel order should not connect to send confirmation');
  
  // Test no self-connections
  t.assertNoConnection(result.connections, shipOrder.id, shipOrder.id, 'ship order should not connect to itself');
  t.assertNoConnection(result.connections, cancelOrder.id, cancelOrder.id, 'cancel order should not connect to itself');
  
  // Test message flows
  t.assertConnection(result.connections, sendPayment.id, receivePayment.id, 'Payment message flow');
  t.assertConnection(result.connections, sendConfirmation.id, receiveConfirmation.id, 'Confirmation message flow');
});

totalPassed += test1.passed;
totalTests += test1.total;

// Test 2: Multiple gateways
const test2 = runner.runTest('Test 2: Multiple Gateways', (t) => {
  const parser = new BPLParser();
  const bpl = `:Multi Gateway Process
@Lane1
  task1
  ?Gateway1
    +option1
    -option2
  task2
  ?Gateway2
    +option3
    -option4
  task3`;
  
  const result = parser.parse(bpl);
  
  const task1 = t.findTaskByName(result.tasks, 'task1');
  const gateway1 = t.findTaskByName(result.tasks, 'gateway1');
  const option1 = t.findTaskByName(result.tasks, 'option1');
  const option2 = t.findTaskByName(result.tasks, 'option2');
  const task2 = t.findTaskByName(result.tasks, 'task2');
  const gateway2 = t.findTaskByName(result.tasks, 'gateway2');
  const option3 = t.findTaskByName(result.tasks, 'option3');
  const option4 = t.findTaskByName(result.tasks, 'option4');
  const task3 = t.findTaskByName(result.tasks, 'task3');
  
  // First gateway connections
  t.assertConnection(result.connections, task1.id, gateway1.id, 'task1 -> gateway1');
  t.assertConnection(result.connections, gateway1.id, option1.id, 'gateway1 -> option1');
  t.assertConnection(result.connections, gateway1.id, option2.id, 'gateway1 -> option2');
  t.assertConnection(result.connections, option1.id, task2.id, 'option1 -> task2');
  t.assertNoConnection(result.connections, option2.id, task2.id, 'option2 should not connect to task2');
  
  // Second gateway connections  
  t.assertConnection(result.connections, task2.id, gateway2.id, 'task2 -> gateway2');
  t.assertConnection(result.connections, gateway2.id, option3.id, 'gateway2 -> option3');
  t.assertConnection(result.connections, gateway2.id, option4.id, 'gateway2 -> option4');
  t.assertConnection(result.connections, option3.id, task3.id, 'option3 -> task3');
  t.assertNoConnection(result.connections, option4.id, task3.id, 'option4 should not connect to task3');
});

totalPassed += test2.passed;
totalTests += test2.total;

// Test 3: End connections
const test3 = runner.runTest('Test 3: End Event Connections', (t) => {
  const parser = new BPLParser();
  const bpl = `:End Connection Process
@Lane1
  task1
  ?Decision
    +continue
    -!End
  task2
  !End`;
  
  const result = parser.parse(bpl);
  
  const task1 = t.findTaskByName(result.tasks, 'task1');
  const decision = t.findTaskByName(result.tasks, 'decision');
  const continueTask = t.findTaskByName(result.tasks, 'continue');
  const endBranch = t.findTaskByName(result.tasks, 'end');
  const task2 = t.findTaskByName(result.tasks, 'task2');
  
  // Check branch connections
  t.assertConnection(result.connections, decision.id, continueTask.id, 'decision -> continue');
  t.assertConnection(result.connections, decision.id, endBranch.id, 'decision -> end branch');
  t.assertConnection(result.connections, continueTask.id, task2.id, 'continue -> task2');
  
  // Check end connections
  const endConnections = result.connections.filter(c => c.targetRef === 'end_1');
  t.assert(endConnections.length >= 1, 'Should have connections to end event');
  t.assertConnection(result.connections, endBranch.id, 'end_1', 'end branch -> process end');
});

totalPassed += test3.passed;
totalTests += test3.total;

// Test 4: Connection breaks
const test4 = runner.runTest('Test 4: Connection Breaks', (t) => {
  const parser = new BPLParser();
  const bpl = `:Break Process
@Lane1
  task1
  task2
  ---
  task3
  task4`;
  
  const result = parser.parse(bpl);
  
  const task1 = t.findTaskByName(result.tasks, 'task1');
  const task2 = t.findTaskByName(result.tasks, 'task2');
  const task3 = t.findTaskByName(result.tasks, 'task3');
  const task4 = t.findTaskByName(result.tasks, 'task4');
  
  t.assertConnection(result.connections, task1.id, task2.id, 'task1 -> task2');
  t.assertNoConnection(result.connections, task2.id, task3.id, 'task2 should not connect to task3 (break)');
  t.assertConnection(result.connections, task3.id, task4.id, 'task3 -> task4');
});

totalPassed += test4.passed;
totalTests += test4.total;

// Test 5: Complex scenario with all features
const test5 = runner.runTest('Test 5: Complex Scenario', (t) => {
  const parser = new BPLParser();
  const bpl = `:Complex Process
@Customer
  submit request
  ?Request Type
    +|Standard| standard process
    +|Express| express process
    -|Cancel| !End
  send: Data
  receive: Result
@System
  receive: Data
  process data
  ?Valid Data
    +generate result
    -error handling
  send: Result`;
  
  const result = parser.parse(bpl);
  
  // Find all tasks
  const submitRequest = t.findTaskByName(result.tasks, 'submit request');
  const requestType = t.findTaskByName(result.tasks, 'request type');
  const standardProcess = t.findTaskByName(result.tasks, 'standard process');
  const expressProcess = t.findTaskByName(result.tasks, 'express process');
  const cancelEnd = t.findTaskByName(result.tasks, 'end');
  const sendData = t.findTaskByName(result.tasks, 'send data');
  const receiveResult = t.findTaskByName(result.tasks, 'receive result');
  const receiveData = t.findTaskByName(result.tasks, 'receive data');
  const processData = t.findTaskByName(result.tasks, 'process data');
  const validData = t.findTaskByName(result.tasks, 'valid data');
  const generateResult = t.findTaskByName(result.tasks, 'generate result');
  const errorHandling = t.findTaskByName(result.tasks, 'error handling');
  const sendResult = t.findTaskByName(result.tasks, 'send result');
  
  // Test gateway has exactly 3 branches
  const gatewayBranches = result.connections.filter(c => c.sourceRef === requestType.id);
  t.assert(gatewayBranches.length === 3, 'Request Type gateway should have exactly 3 outgoing connections');
  
  // Test positive branches connect to next task
  t.assertConnection(result.connections, standardProcess.id, sendData.id, 'standard process -> send data');
  t.assertConnection(result.connections, expressProcess.id, sendData.id, 'express process -> send data');
  
  // Test negative branch connects to end
  t.assertConnection(result.connections, cancelEnd.id, 'end_1', 'cancel branch -> process end');
  t.assertNoConnection(result.connections, cancelEnd.id, sendData.id, 'cancel should not connect to send data');
  
  // Test System lane connections
  t.assertConnection(result.connections, generateResult.id, sendResult.id, 'generate result -> send result');
  t.assertNoConnection(result.connections, errorHandling.id, sendResult.id, 'error handling should not connect to send result');
  
  // Ensure no self-connections
  Object.values(result.tasks).forEach(task => {
    t.assertNoConnection(result.connections, task.id, task.id, `${task.name} should not connect to itself`);
  });
});

totalPassed += test5.passed;
totalTests += test5.total;

// Overall summary
console.log(`\n=== OVERALL RESULTS ===`);
console.log(`Total: ${totalPassed}/${totalTests} assertions passed`);
console.log(totalPassed === totalTests ? '✓ All tests passed!' : '✗ Some tests failed');