/**
 * Shared BPL Parser Module
 * This is the single source of truth for the BPL parser logic
 * Used by both the web application and VS Code extension
 */

class BpmnLiteParser {
  constructor() {
    this.reset();
  }

  reset() {
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
    this.originalText = '';
    this.currentLineIndex = 0;
    this.endEventLane = null;
    this.lastTaskBeforeLaneSwitch = null;
  }

  parse(text) {
    this.reset();
    this.originalText = text;
    
    const lines = text.split('\n');
    
    // Create default process if none specified
    this.ensureProcess("Default Process");
    
    // First pass: collect processes, lanes, and tasks
    for (let i = 0; i < lines.length; i++) {
      this.currentLineIndex = i;
      const line = lines[i].trim();
      
      if (!line || line.startsWith('//')) continue;
      
      if (line.startsWith(':')) {
        this.parseProcess(line);
      } else if (line.startsWith('@')) {
        this.parseLane(line);
      } else if (line.startsWith('---')) {
        this.connectionBreaks.push(i);
      } else if (line.startsWith('"')) {
        this.parseComment(line);
      } else if (line) {
        this.parseTask(line);
      }
    }
    
    // Handle special messages (send/receive tasks)
    this.connectMessageFlows();
    
    // Connect sequential tasks
    this.connectSequentialTasks();
    
    // Build the AST
    const ast = {
      type: 'bpmnModel',
      processes: this.processes.map(processName => ({
        type: 'process',
        name: processName,
        id: this.normalizeId(processName),
        lanes: Object.entries(this.lanes)
          .filter(([_, lane]) => lane.process === processName)
          .map(([laneName, lane]) => ({
            type: 'lane',
            name: laneName.replace('@', ''),
            id: this.normalizeId(laneName),
            elements: lane.tasks.map(taskId => this.tasks[taskId])
          }))
      })),
      connections: this.connections,
      dataObjects: this.dataObjects,
      messages: this.messages
    };
    
    return ast;
  }

  // Include all the parser methods here...
  // This is a simplified version - you would copy all methods from the original parser
  
  normalizeId(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  ensureProcess(processName) {
    if (!this.processes.includes(processName)) {
      this.processes.push(processName);
    }
    this.currentProcess = processName;
  }

  parseProcess(line) {
    const processName = line.substring(1).trim();
    this.ensureProcess(processName);
  }

  parseLane(line) {
    const laneName = line.trim();
    if (!this.lanes[laneName]) {
      this.lanes[laneName] = {
        process: this.currentProcess,
        tasks: []
      };
    }
    if (this.currentLane !== laneName) {
      this.lastTaskBeforeLaneSwitch = this.lastTask;
    }
    this.currentLane = laneName;
    if (this.endEventLane === null && this.lastTask && this.tasks[this.lastTask]) {
      const lastTaskObj = this.tasks[this.lastTask];
      if (lastTaskObj.type === 'event' && lastTaskObj.eventType === 'end') {
        this.endEventLane = this.currentLane;
      }
    }
  }

  parseTask(line) {
    if (!this.currentLane) {
      this.parseLane('@Default');
    }
    
    // Gateway parsing
    if (line.startsWith('?')) {
      return this.parseGateway(line);
    }
    
    // Branch parsing
    if (line.startsWith('+') || line.startsWith('-')) {
      return this.parseGatewayBranch(line);
    }
    
    // Handle other task types...
    // This is simplified - include full parsing logic
    
    const laneName = this.currentLane.replace('@', '');
    const normalizedLaneName = this.normalizeId(laneName);
    const taskId = `${normalizedLaneName}_${this.normalizeId(line)}`;
    
    this.tasks[taskId] = {
      type: 'task',
      name: line,
      id: taskId,
      lane: laneName
    };
    
    this.lanes[this.currentLane].tasks.push(taskId);
    this.lastTask = taskId;
    this.taskLineNumbers[taskId] = this.currentLineIndex;
    
    return taskId;
  }

  parseGateway(line) {
    // Gateway parsing logic
    const gatewayName = line.substring(1).trim();
    const laneName = this.currentLane.replace('@', '');
    const normalizedLaneName = this.normalizeId(laneName);
    const gatewayId = `${normalizedLaneName}_${this.normalizeId(gatewayName)}`;
    
    this.tasks[gatewayId] = {
      type: 'gateway',
      gatewayType: 'xor',
      name: gatewayName,
      id: gatewayId,
      lane: laneName,
      branches: []
    };
    
    this.lanes[this.currentLane].tasks.push(gatewayId);
    this.lastTask = gatewayId;
    this.taskLineNumbers[gatewayId] = this.currentLineIndex;
    this.gatewayStack.push(gatewayId);
    
    return gatewayId;
  }

  parseGatewayBranch(line) {
    // Branch parsing logic
    if (this.gatewayStack.length === 0) return null;
    
    const currentGateway = this.gatewayStack[this.gatewayStack.length - 1];
    const branchType = line.startsWith('+') ? 'positive' : 'negative';
    const branchName = line.substring(1).trim();
    
    const laneName = this.currentLane.replace('@', '');
    const normalizedLaneName = this.normalizeId(laneName);
    const branchId = `${normalizedLaneName}_${this.normalizeId(branchName)}`;
    
    this.tasks[branchId] = {
      type: 'branch',
      branchType: branchType,
      name: branchName,
      id: branchId,
      lane: laneName,
      parentGateway: currentGateway
    };
    
    this.tasks[currentGateway].branches.push(branchId);
    this.lanes[this.currentLane].tasks.push(branchId);
    this.taskLineNumbers[branchId] = this.currentLineIndex;
    
    return branchId;
  }

  connectSequentialTasks() {
    const gatewayMap = {};
    const gatewayBranchesMap = {};
    
    // Find all gateways and their branches
    Object.values(this.tasks).forEach(task => {
      if (task.type === 'gateway') {
        gatewayMap[task.id] = task;
        gatewayBranchesMap[task.id] = {
          positive: [],
          negative: [],
          nextTask: null,
          taskBeforeGateway: null  // FIX for Issue #4
        };
      }
    });
    
    // Collect branches for each gateway
    Object.values(this.tasks).forEach(task => {
      if (task.type === 'branch' && task.parentGateway && gatewayBranchesMap[task.parentGateway]) {
        if (task.branchType === 'positive') {
          gatewayBranchesMap[task.parentGateway].positive.push(task.id);
        } else {
          gatewayBranchesMap[task.parentGateway].negative.push(task.id);
        }
      }
    });
    
    // Connect tasks in sequence within the same lane
    Object.values(this.lanes).forEach(lane => {
      let prevTask = null;
      
      // Find gateways and their next tasks
      const gateways = lane.tasks.filter(taskId => 
        this.tasks[taskId] && this.tasks[taskId].type === 'gateway'
      );
      
      gateways.forEach(gatewayId => {
        const gatewayIndex = lane.tasks.indexOf(gatewayId);
        
        // Find the first non-branch task after the gateway
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
      
      // Now do sequential connections
      for (let i = 0; i < lane.tasks.length; i++) {
        const currentTaskId = lane.tasks[i];
        const currentTask = this.tasks[currentTaskId];
        
        if (currentTask.type === 'branch') {
          continue;
        }
        
        if (currentTask.type === 'gateway') {
          if (prevTask) {
            this.addConnection('flow', prevTask, currentTaskId);
            // Track the task before this gateway (FIX for Issue #4)
            gatewayBranchesMap[currentTaskId].taskBeforeGateway = prevTask;
          }
          continue;
        }
        
        // Check if this is a task right after a gateway
        let isAfterGateway = false;
        let sourceGateway = null;
        
        for (const [gId, data] of Object.entries(gatewayBranchesMap)) {
          if (data.nextTask === currentTaskId) {
            isAfterGateway = true;
            sourceGateway = gId;
            break;
          }
        }
        
        // Skip connection if it would bypass a gateway (FIX for Issue #4)
        if (isAfterGateway && prevTask && !gatewayMap[prevTask]) {
          const gatewayData = gatewayBranchesMap[sourceGateway];
          if (gatewayData && prevTask === gatewayData.taskBeforeGateway) {
            prevTask = currentTaskId;
            continue;
          }
          
          const fromGatewayConnections = this.connections.filter(conn =>
            conn.sourceRef === sourceGateway && conn.targetRef === currentTaskId
          );
          
          if (fromGatewayConnections.length > 0) {
            prevTask = currentTaskId;
            continue;
          }
        }
        
        // Connect the previous task to this one
        if (prevTask) {
          const connectionExists = this.connections.some(conn => 
            conn.type === 'sequenceFlow' && 
            conn.sourceRef === prevTask && 
            conn.targetRef === currentTaskId
          );
          
          const hasBreak = this.hasConnectionBreakBetween(
            this.taskLineNumbers[prevTask],
            this.taskLineNumbers[currentTaskId]
          );
          
          if (!connectionExists && !hasBreak) {
            this.addConnection('flow', prevTask, currentTaskId);
          }
        }
        
        prevTask = currentTaskId;
      }
    });
    
    // Handle gateway branch connections
    Object.entries(gatewayBranchesMap).forEach(([gatewayId, data]) => {
      const gateway = this.tasks[gatewayId];
      
      gateway.branches.forEach(branchId => {
        this.addConnection('flow', gatewayId, branchId);
      });
      
      data.positive.forEach(branchId => {
        if (data.nextTask) {
          this.addConnection('flow', branchId, data.nextTask);
        }
      });
    });
  }

  connectMessageFlows() {
    // Message flow connection logic
    const sendTasks = Object.values(this.tasks).filter(task => task.type === 'send');
    const receiveTasks = Object.values(this.tasks).filter(task => task.type === 'receive');
    
    sendTasks.forEach(sendTask => {
      receiveTasks.forEach(receiveTask => {
        if (sendTask.messageName === receiveTask.messageName) {
          this.addConnection('message', sendTask.id, receiveTask.id);
        }
      });
    });
  }

  addConnection(type, sourceId, targetId) {
    const connectionId = `${sourceId}_to_${targetId}`;
    
    const exists = this.connections.some(conn => 
      conn.sourceRef === sourceId && conn.targetRef === targetId
    );
    
    if (!exists) {
      this.connections.push({
        type: type === 'message' ? 'messageFlow' : 'sequenceFlow',
        id: connectionId,
        sourceRef: sourceId,
        targetRef: targetId
      });
    }
  }

  hasConnectionBreakBetween(lineNum1, lineNum2) {
    if (!lineNum1 || !lineNum2) return false;
    const start = Math.min(lineNum1, lineNum2);
    const end = Math.max(lineNum1, lineNum2);
    return this.connectionBreaks.some(breakLine => breakLine > start && breakLine < end);
  }

  parseComment(line) {
    // Comment parsing logic
    if (!this.currentLane) {
      this.parseLane('@Default');
    }
    
    const commentText = line.substring(1).trim();
    const laneName = this.currentLane.replace('@', '');
    const normalizedLaneName = this.normalizeId(laneName);
    const commentId = `${normalizedLaneName}_comment_${this.normalizeId(commentText.substring(0, 20))}`;
    
    this.tasks[commentId] = {
      type: 'comment',
      name: commentText,
      id: commentId,
      lane: laneName
    };
    
    this.lanes[this.currentLane].tasks.push(commentId);
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js / CommonJS
  module.exports = { BpmnLiteParser };
} else if (typeof define === 'function' && define.amd) {
  // AMD
  define([], function() { return { BpmnLiteParser }; });
} else {
  // Browser global
  window.BpmnLiteParser = BpmnLiteParser;
}