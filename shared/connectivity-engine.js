// Connectivity Engine for BPL Parser
// Implements the correct connectivity model from CONNECTIVITY_GUIDE.md

class ConnectivityEngine {
  constructor(parser) {
    this.parser = parser;
    this.globalTaskOrder = [];
    this.explicitConnections = [];
  }

  // Main method to establish all connections
  establishConnections() {
    console.log('=== Establishing Connections ===');
    
    // Phase 1: Build global task order (excluding branches and comments)
    this.buildGlobalTaskOrder();
    
    // Phase 2: Create implicit sequential connections
    this.createImplicitConnections();
    
    // Phase 3: Process explicit arrow connections
    this.processExplicitConnections();
    
    // Phase 4: Connect message flows
    this.connectMessageFlows();
    
    // Phase 5: Handle special cases (gateways, events)
    this.handleSpecialConnections();
    
    console.log(`Total connections created: ${this.parser.connections.length}`);
  }

  // Build a global list of tasks in document order
  buildGlobalTaskOrder() {
    console.log('Building global task order...');
    
    // Process all lines in order
    const lines = this.parser.originalText.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Skip connection breaks
      if (line === '---' || line.match(/^-{3,}$/)) continue;
      
      // Skip technical comments
      if (line.startsWith('//')) continue;
      
      // Check for lane change
      if (line.startsWith('@')) {
        this.parser.currentLane = line;
        continue;
      }
      
      // Skip process definitions
      if (line.startsWith(':')) continue;
      
      // Find tasks in this line
      const taskIds = this.findTasksInLine(line, i);
      taskIds.forEach(taskId => {
        if (taskId && this.parser.tasks[taskId]) {
          const task = this.parser.tasks[taskId];
          // Include all task types except branches (they're handled by gateways)
          if (task.type !== 'branch' && task.type !== 'comment') {
            this.globalTaskOrder.push({
              id: taskId,
              lineNumber: i,
              lane: task.lane
            });
          }
        }
      });
    }
    
    console.log(`Global task order: ${this.globalTaskOrder.length} tasks`);
  }

  // Find all tasks defined in a line (handling arrows)
  findTasksInLine(line, lineNumber) {
    const tasks = [];
    
    // Split by arrows but keep the content
    const parts = this.splitByArrows(line);
    
    for (const part of parts) {
      if (part.type === 'content') {
        // Check what type of element this is
        const taskId = this.identifyAndGetTaskId(part.content, lineNumber);
        if (taskId) {
          tasks.push(taskId);
          
          // Store explicit connections for later processing
          if (part.connections) {
            this.explicitConnections.push({
              sourceId: taskId,
              connections: part.connections,
              lineNumber: lineNumber
            });
          }
        }
      }
    }
    
    return tasks;
  }

  // Split line by arrows while preserving connections
  splitByArrows(line) {
    const parts = [];
    let current = '';
    let i = 0;
    
    while (i < line.length) {
      if (line.substr(i, 2) === '->' || line.substr(i, 2) === '<-') {
        if (current.trim()) {
          // Store the current part
          const lastPart = parts.length > 0 ? parts[parts.length - 1] : null;
          
          if (lastPart && lastPart.type === 'content') {
            // Add forward connection to previous content
            if (!lastPart.connections) lastPart.connections = [];
            lastPart.connections.push({
              direction: line.substr(i, 2),
              target: null // Will be filled with next content
            });
          }
          
          parts.push({
            type: 'content',
            content: current.trim(),
            connections: []
          });
        }
        
        // Store the arrow
        parts.push({
          type: 'arrow',
          arrow: line.substr(i, 2)
        });
        
        current = '';
        i += 2;
      } else {
        current += line[i];
        i++;
      }
    }
    
    // Add last part
    if (current.trim()) {
      parts.push({
        type: 'content',
        content: current.trim(),
        connections: []
      });
    }
    
    // Now connect the parts based on arrows
    for (let j = 0; j < parts.length; j++) {
      if (parts[j].type === 'arrow') {
        const arrow = parts[j].arrow;
        const prevPart = j > 0 ? parts[j - 1] : null;
        const nextPart = j < parts.length - 1 ? parts[j + 1] : null;
        
        if (arrow === '->' && prevPart && nextPart && 
            prevPart.type === 'content' && nextPart.type === 'content') {
          // Forward connection
          if (!prevPart.connections) prevPart.connections = [];
          prevPart.connections.push({
            direction: '->',
            target: nextPart.content
          });
        } else if (arrow === '<-' && prevPart && nextPart && 
                   prevPart.type === 'content' && nextPart.type === 'content') {
          // Backward connection
          if (!nextPart.connections) nextPart.connections = [];
          nextPart.connections.push({
            direction: '->',
            target: prevPart.content
          });
        }
      }
    }
    
    return parts.filter(p => p.type === 'content');
  }

  // Identify element type and return its task ID
  identifyAndGetTaskId(content, lineNumber) {
    const firstChar = content.charAt(0);
    
    // Handle different element types
    switch(firstChar) {
      case '?': // Gateway
        return this.findTaskByContent(content.substring(1).trim(), 'gateway');
      case '!': // Event
        return this.findTaskByContent(content.substring(1).trim(), 'event');
      case '+': // Positive branch
      case '-': // Negative branch
        // For branches, extract just the branch name part
        let branchName = content.substring(1).trim();
        if (branchName.includes('->') || branchName.includes('<-')) {
          branchName = branchName.split(/->|<-/)[0].trim();
        }
        return this.findTaskByContent(branchName, 'branch');
      case '#': // Data object
        return null; // Data objects don't participate in sequence flow
      case '^': // Message flow
        return null; // Message flows are handled separately
      case '"': // Comment
        return null; // Comments don't participate in flow
      default:
        // Regular task (including send:/receive:)
        return this.findTaskByContent(content, 'task');
    }
  }

  // Find task by its content/name
  findTaskByContent(content, expectedType = null) {
    // Normalize the content for searching
    const normalized = this.parser.normalizeId(content);
    
    // Search through all tasks
    for (const [taskId, task] of Object.entries(this.parser.tasks)) {
      // Check if content matches task name
      if (this.parser.normalizeId(task.name) === normalized) {
        if (!expectedType || task.type === expectedType || 
            (expectedType === 'task' && ['task', 'send', 'receive'].includes(task.type))) {
          return taskId;
        }
      }
      
      // For message tasks, also check message name
      if (task.messageName && this.parser.normalizeId(task.messageName) === normalized) {
        return taskId;
      }
    }
    
    return null;
  }

  // Create implicit sequential connections
  createImplicitConnections() {
    console.log('Creating implicit sequential connections...');
    let implicitCount = 0;
    
    for (let i = 1; i < this.globalTaskOrder.length; i++) {
      const prevTask = this.globalTaskOrder[i - 1];
      const currTask = this.globalTaskOrder[i];
      
      // Check if there's a connection break between these tasks
      if (this.hasConnectionBreakBetween(prevTask.lineNumber, currTask.lineNumber)) {
        console.log(`Connection break between ${prevTask.id} and ${currTask.id}`);
        continue;
      }
      
      // Create implicit connection
      this.addConnection('flow', prevTask.id, currTask.id);
      implicitCount++;
    }
    
    console.log(`Created ${implicitCount} implicit connections`);
  }

  // Process all explicit arrow connections
  processExplicitConnections() {
    console.log('Processing explicit arrow connections...');
    let explicitCount = 0;
    
    for (const explicit of this.explicitConnections) {
      const sourceId = explicit.sourceId;
      
      for (const conn of explicit.connections) {
        // Resolve target
        const targetId = this.resolveTaskReference(conn.target);
        
        if (targetId) {
          this.addConnection('flow', sourceId, targetId);
          explicitCount++;
          console.log(`Explicit: ${sourceId} -> ${targetId}`);
        } else {
          console.warn(`Could not resolve target: ${conn.target}`);
        }
      }
    }
    
    console.log(`Created ${explicitCount} explicit connections`);
  }

  // Resolve task reference (with FQN support)
  resolveTaskReference(reference) {
    if (!reference) return null;
    
    reference = reference.trim();
    
    // Direct lookup in task scope
    if (this.parser.taskScope[reference]) {
      return this.parser.taskScope[reference];
    }
    
    // Check if it's FQN
    if (reference.includes('.') || reference.includes('@')) {
      // Try to parse as FQN
      let lane, task;
      
      if (reference.startsWith('@')) {
        [lane, task] = reference.substring(1).split('.');
      } else if (reference.includes('.')) {
        [lane, task] = reference.split('.');
      }
      
      if (lane && task) {
        // Try various combinations
        const laneNorm = this.parser.normalizeId(lane);
        const taskNorm = this.parser.normalizeId(task);
        
        const candidates = [
          `${laneNorm}_${taskNorm}`,
          this.parser.taskScope[`${lane}.${task}`],
          this.parser.taskScope[`@${lane}.${task}`],
          this.parser.taskScope[`${laneNorm}.${taskNorm}`]
        ];
        
        for (const candidate of candidates) {
          if (candidate && this.parser.tasks[candidate]) {
            return candidate;
          }
        }
      }
    }
    
    // Search by content
    return this.findTaskByContent(reference);
  }

  // Connect matching send/receive pairs
  connectMessageFlows() {
    console.log('Connecting message flows...');
    let messageCount = 0;
    
    const sendTasks = Object.values(this.parser.tasks).filter(t => t.type === 'send');
    const receiveTasks = Object.values(this.parser.tasks).filter(t => t.type === 'receive');
    
    for (const send of sendTasks) {
      const messageName = send.messageName;
      if (!messageName) continue;
      
      // Find matching receive
      const receive = receiveTasks.find(r => r.messageName === messageName);
      
      if (receive) {
        // Check for connection break
        const sendLine = this.parser.taskLineNumbers[send.id];
        const receiveLine = this.parser.taskLineNumbers[receive.id];
        
        if (!this.hasConnectionBreakBetween(sendLine, receiveLine)) {
          this.addConnection('message', send.id, receive.id, messageName);
          messageCount++;
        }
      }
    }
    
    console.log(`Created ${messageCount} message flows`);
  }

  // Handle special connections (gateways, events)
  handleSpecialConnections() {
    console.log('Handling special connections...');
    
    // Connect gateways to their branches
    Object.values(this.parser.tasks).forEach(task => {
      if (task.type === 'gateway' && task.branches) {
        task.branches.forEach(branchId => {
          this.addConnection('flow', task.id, branchId);
        });
      }
    });
    
    // Connect branches to their merge point
    // Branches should connect to the next task after all branches
    const gateways = Object.values(this.parser.tasks).filter(t => t.type === 'gateway');
    
    for (const gateway of gateways) {
      if (!gateway.branches || gateway.branches.length === 0) continue;
      
      // Find the task that should receive connections from all branches
      const gatewayIndex = this.globalTaskOrder.findIndex(t => t.id === gateway.id);
      
      // Look for the next task after all branches
      let mergeTaskId = null;
      for (let i = gatewayIndex + 1; i < this.globalTaskOrder.length; i++) {
        const candidate = this.globalTaskOrder[i];
        const candidateTask = this.parser.tasks[candidate.id];
        
        // Skip if it's a branch of this gateway
        if (candidateTask.type === 'branch' && gateway.branches.includes(candidate.id)) {
          continue;
        }
        
        // Found the merge point
        mergeTaskId = candidate.id;
        break;
      }
      
      // Connect all branches to the merge point
      if (mergeTaskId) {
        gateway.branches.forEach(branchId => {
          // Only add if branch doesn't have explicit connection
          const hasExplicit = this.explicitConnections.some(e => 
            e.sourceId === branchId && e.connections.length > 0
          );
          
          if (!hasExplicit) {
            this.addConnection('flow', branchId, mergeTaskId);
          }
        });
      }
    }
    
    // Handle Start/End events
    const startEvent = this.parser.tasks['process_start'];
    const endEvent = this.parser.tasks['process_end'];
    
    if (startEvent && this.globalTaskOrder.length > 0) {
      // Connect start to first task
      const firstTask = this.globalTaskOrder[0];
      this.addConnection('flow', 'process_start', firstTask.id);
    }
    
    if (endEvent) {
      // Find tasks that should connect to end
      const tasksWithNoOutgoing = this.globalTaskOrder.filter(task => {
        const hasOutgoing = this.parser.connections.some(conn => 
          conn.sourceRef === task.id && conn.type === 'sequenceFlow'
        );
        return !hasOutgoing;
      });
      
      // Connect them to end event
      tasksWithNoOutgoing.forEach(task => {
        this.addConnection('flow', task.id, 'process_end');
      });
    }
  }

  // Add connection with deduplication
  addConnection(type, sourceId, targetId, name = '') {
    // Check if connection already exists
    const exists = this.parser.connections.some(conn =>
      conn.sourceRef === sourceId && 
      conn.targetRef === targetId && 
      conn.type === (type === 'flow' ? 'sequenceFlow' : type === 'message' ? 'messageFlow' : 'dataAssociation')
    );
    
    if (!exists) {
      this.parser.addConnection(type, sourceId, targetId, name);
    }
  }

  // Check for connection breaks
  hasConnectionBreakBetween(line1, line2) {
    if (line1 === undefined || line2 === undefined) return false;
    
    const minLine = Math.min(line1, line2);
    const maxLine = Math.max(line1, line2);
    
    return this.parser.connectionBreaks.some(breakLine => 
      breakLine > minLine && breakLine < maxLine
    );
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConnectivityEngine;
} else {
  window.ConnectivityEngine = ConnectivityEngine;
}