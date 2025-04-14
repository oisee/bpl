import {
  BpmnDocument,
  Process,
  Lane,
  Task,
  Gateway,
  Event,
  Subprocess,
  DataObject,
  DataStore,
  Comment,
  MessageFlow,
  GatewayBranch,
  ProcessElement // Use the correct type alias
} from '../types/ast.js';

/**
 * Parser for BPMN-lite DSL
 * This is the key function for online text-to-AST translation
 */
export class BpmnLiteParser {
  private currentProcessId: string | null = null;
  private currentLaneId: string | null = null;
  private idCounter: number = 0;

  /**
   * Parse BPMN-lite DSL text into an AST
   * @param input The DSL text to parse
   * @returns A BpmnDocument representing the parsed AST
   */
  parse(input: string): BpmnDocument {
    const lines = input.split('\n');
    const document: BpmnDocument = { processes: [], comments: [] };
    
    // Reset state
    this.currentProcessId = null;
    this.currentLaneId = null;
    this.idCounter = 0;
    
    // Process each line
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (line === '') {
        i++;
        continue;
      }
      
      // Process comments
      if (line.startsWith('//')) {
        document.comments.push(this.parseTechnicalComment(line));
        i++;
        continue;
      }
      
      if (line.startsWith('"')) {
        document.comments.push(this.parseDiagramComment(line));
        i++;
        continue;
      }
      
      // Process process definition
      if (line.startsWith(':')) {
        const process = this.parseProcess(line, lines, i);
        document.processes.push(process);
        this.currentProcessId = process.id;
        i++;
        continue;
      }
      
      // Process lane definition
      if (line.startsWith('@')) {
        if (!this.currentProcessId) {
          // Create an anonymous process if none exists
          const anonymousProcess: Process = {
            id: this.generateId('process'),
            name: 'Anonymous Process',
            lanes: [],
            messageFlows: [],
            dataObjects: [],
            dataStores: [],
            // Add fields for implicit events
            // Use existing fields
            defaultStartEvent: undefined,
            defaultEndEvent: undefined
          };
          document.processes.push(anonymousProcess);
          this.currentProcessId = anonymousProcess.id;
        }
        
        const lane = this.parseLane(line, document);
        const currentProcess = document.processes.find(p => p.id === this.currentProcessId);
        if (currentProcess) {
          currentProcess.lanes.push(lane);
          this.currentLaneId = lane.id;
        }
        i++;
        continue;
      }
      
      // Process elements within a lane
      if (this.currentLaneId) {
        const result = this.parseElement(line, lines, i, document);
        i = result.nextIndex;
        continue;
      }
      
      // If we get here, we couldn't parse the line
      console.warn(`Warning: Could not parse line ${i + 1}: ${line}`);
      i++;
    }
    
    // Post-processing: Link elements, create implicit events, etc.
    this.postProcess(document);
    
    return document;
  }
  
  /**
   * Parse a process definition line
   * @param line The line to parse
   * @param lines All lines in the input
   * @param currentIndex The current line index
   * @returns A Process object
   */
  private parseProcess(line: string, lines: string[], currentIndex: number): Process {
    const processName = line.substring(1).trim();
    return {
      id: this.generateId('process'),
      name: processName,
      lanes: [],
      messageFlows: [],
      dataObjects: [],
      dataStores: [],
      // Add fields for implicit events
      // Use existing fields
      defaultStartEvent: undefined,
      defaultEndEvent: undefined
    };
  }
  
  /**
   * Parse a lane definition line
   * @param line The line to parse
   * @param document The current document being built
   * @returns A Lane object
   */
  private parseLane(line: string, document: BpmnDocument): Lane {
    const laneName = line.substring(1).trim();
    return {
      id: this.generateId('lane'),
      name: laneName,
      process: this.currentProcessId!,
      elements: []
    };
  }
  
  /**
   * Parse an element within a lane
   * @param line The line to parse
   * @param lines All lines in the input
   * @param currentIndex The current line index
   * @param document The current document being built
   * @returns The next line index to process
   */
  private parseElement(line: string, lines: string[], currentIndex: number, document: BpmnDocument): { nextIndex: number } {
    // Get the current lane
    const currentProcess = document.processes.find(p => p.id === this.currentProcessId);
    if (!currentProcess) {
      return { nextIndex: currentIndex + 1 };
    }
    
    const currentLane = currentProcess.lanes.find(l => l.id === this.currentLaneId);
    if (!currentLane) {
      return { nextIndex: currentIndex + 1 };
    }
    
    // Check for different element types based on the first character
    if (line.startsWith('?')) {
      // XOR Gateway
      return this.parseXorGateway(line, lines, currentIndex, currentLane, document);
    } else if (line.startsWith('{')) {
      // Parallel/Inclusive Gateway
      return this.parseBlockGateway(line, lines, currentIndex, currentLane, document);
    } else if (line.startsWith('[')) {
      // Subprocess
      return this.parseSubprocess(line, currentLane);
    } else if (line.startsWith('!')) {
      // Event
      return this.parseEvent(line, currentLane);
    } else if (line.startsWith('#')) {
      // Data Object
      return this.parseDataObject(line, currentLane, currentProcess);
    } else if (line.startsWith('$')) {
      // Data Store
      return this.parseDataStore(line, currentLane, currentProcess);
    } else if (line.startsWith('^')) {
      // Message Flow
      return this.parseMessageFlow(line, currentProcess);
    } else {
      // Regular Task
      return this.parseTask(line, currentLane);
    }
  }
  
  /**
   * Parse an XOR gateway and its branches
   * @param line The gateway line
   * @param lines All lines in the input
   * @param currentIndex The current line index
   * @param currentLane The current lane
   * @param document The current document being built
   * @returns The next line index to process
   */
  private parseXorGateway(line: string, lines: string[], currentIndex: number, currentLane: Lane, document: BpmnDocument): { nextIndex: number } {
    const gatewayName = line.substring(1).trim();
    const gateway: Gateway = {
      id: this.generateId('gateway'),
      name: gatewayName,
      type: 'gateway',
      gatewayType: 'xor',
      lane: currentLane.id,
      incoming: [],
      outgoing: [],
      branches: [],
      isJoin: false,
      isSplit: true,
      isImplicit: false
    };
    
    currentLane.elements.push(gateway);
    
    // Process branches
    let i = currentIndex + 1;
    while (i < lines.length) {
      const branchLine = lines[i].trim();
      
      // Check if this is a branch line
      if (branchLine.startsWith('+') || branchLine.startsWith('-')) {
        const branchType = branchLine.startsWith('+') ? 'positive' : 'negative';
        let branchLabel = '';
        let branchContent = '';
        
        // Check for explicit label
        if (branchLine.includes('|')) {
          const match = branchLine.match(/^[+-]\|([^|]+)\|\s*(.*)$/);
          if (match) {
            branchLabel = match[1].trim();
            branchContent = match[2].trim();
          } else {
            branchContent = branchLine.substring(1).trim();
          }
        } else {
          branchContent = branchLine.substring(1).trim();
          branchLabel = branchType === 'positive' ? 'yes' : 'no';
        }
        
        // Create a task for the branch content
        const branchTask: Task = {
          id: this.generateId('task'),
          name: branchContent,
          type: 'task',
          lane: currentLane.id,
          incoming: [],
          outgoing: []
        };
        
        currentLane.elements.push(branchTask);
        
        // Create a branch
        const branch: GatewayBranch = {
          id: this.generateId('branch'),
          label: branchLabel,
          target: branchTask.id,
          branchType: branchType as 'positive' | 'negative'
        };
        
        gateway.branches.push(branch);
        branchTask.incoming.push(gateway.id);
        
        i++;
      } else if (!branchLine.startsWith(' ') && branchLine !== '') {
        // End of gateway branches
        break;
      } else {
        // Skip other lines within the gateway
        i++;
      }
    }
    
    return { nextIndex: i };
  }
  
  /**
   * Parse a block gateway (parallel or inclusive)
   * @param line The gateway line
   * @param lines All lines in the input
   * @param currentIndex The current line index
   * @param currentLane The current lane
   * @param document The current document being built
   * @returns The next line index to process
   */
  private parseBlockGateway(line: string, lines: string[], currentIndex: number, currentLane: Lane, document: BpmnDocument): { nextIndex: number } {
    const gatewayName = line.substring(1).trim();
    const gateway: Gateway = {
      id: this.generateId('gateway'),
      name: gatewayName,
      type: 'gateway',
      gatewayType: 'and', // Default to AND, will be updated based on branch types
      lane: currentLane.id,
      incoming: [],
      outgoing: [],
      branches: [],
      isJoin: false,
      isSplit: true,
      isImplicit: false
    };
    
    currentLane.elements.push(gateway);
    
    // Process branches
    let i = currentIndex + 1;
    let foundClosingBrace = false;
    
    while (i < lines.length) {
      const branchLine = lines[i].trim();
      
      if (branchLine === '}' || branchLine.startsWith('}')) {
        // End of block gateway
        foundClosingBrace = true;
        
        // Create join gateway if there's text after the closing brace
        if (branchLine.length > 1) {
          const joinName = branchLine.substring(1).trim();
          const joinGateway: Gateway = {
            id: this.generateId('gateway'),
            name: joinName,
            type: 'gateway',
            gatewayType: gateway.gatewayType, // Same type as the split gateway
            lane: currentLane.id,
            incoming: [],
            outgoing: [],
            branches: [],
            isJoin: true,
            isSplit: false,
            isImplicit: false
          };
          
          currentLane.elements.push(joinGateway);
          
          // Connect all branch tasks to the join gateway
          gateway.branches.forEach(branch => {
            const branchTask = currentLane.elements.find(e => e.id === branch.target);
            if (branchTask) {
              branchTask.outgoing.push(joinGateway.id);
              joinGateway.incoming.push(branchTask.id);
            }
          });
        }
        
        i++;
        break;
      } else if (branchLine.startsWith('=') || branchLine.startsWith('~')) {
        // Parallel or inclusive branch
        const branchType = branchLine.startsWith('=') ? 'parallel' : 'inclusive';
        
        // Update gateway type based on branch type
        if (branchType === 'inclusive' && gateway.gatewayType === 'and') {
          gateway.gatewayType = 'or';
        }
        
        let branchLabel = '';
        let branchContent = '';
        
        // Check for explicit label
        if (branchLine.includes('|')) {
          const match = branchLine.match(/^[=~]\|([^|]+)\|\s*(.*)$/);
          if (match) {
            branchLabel = match[1].trim();
            branchContent = match[2].trim();
          } else {
            branchContent = branchLine.substring(1).trim();
          }
        } else {
          branchContent = branchLine.substring(1).trim();
        }
        
        // Create a task for the branch content
        const branchTask: Task = {
          id: this.generateId('task'),
          name: branchContent,
          type: 'task',
          lane: currentLane.id,
          incoming: [],
          outgoing: []
        };
        
        currentLane.elements.push(branchTask);
        
        // Create a branch
        const branch: GatewayBranch = {
          id: this.generateId('branch'),
          label: branchLabel,
          target: branchTask.id,
          branchType: branchType as 'parallel' | 'inclusive'
        };
        
        gateway.branches.push(branch);
        branchTask.incoming.push(gateway.id);
        
        i++;
      } else {
        // Skip other lines within the gateway
        i++;
      }
    }
    
    if (!foundClosingBrace) {
      console.warn(`Warning: No closing brace found for block gateway: ${gatewayName}`);
    }
    
    return { nextIndex: i };
  }
  
  /**
   * Parse a subprocess
   * @param line The subprocess line
   * @param currentLane The current lane
   * @returns The next line index to process
   */
  private parseSubprocess(line: string, currentLane: Lane): { nextIndex: number } {
    // Extract subprocess name and check if it's expanded
    const isExpanded = line.endsWith('+]');
    let subprocessName = '';
    
    if (isExpanded) {
      subprocessName = line.substring(1, line.length - 2).trim();
    } else {
      subprocessName = line.substring(1, line.length - 1).trim();
    }
    
    const subprocess: Subprocess = {
      id: this.generateId('subprocess'),
      name: subprocessName,
      type: 'subprocess',
      processRef: '', // Will be linked in post-processing
      lane: currentLane.id,
      incoming: [],
      outgoing: [],
      isExpanded
    };
    
    currentLane.elements.push(subprocess);
    
    return { nextIndex: currentLane.elements.length };
  }
  
  /**
   * Parse an event
   * @param line The event line
   * @param currentLane The current lane
   * @returns The next line index to process
   */
  private parseEvent(line: string, currentLane: Lane): { nextIndex: number } {
    // Extract event type and name
    const eventText = line.substring(1).trim();
    let eventType: 'start' | 'intermediate' | 'end' | 'boundary' = 'intermediate';
    let eventDefinition: Event['eventDefinition'] = 'none';
    let eventName = eventText;
    let eventAttributes: Record<string, string> = {};
    
    // Check for event type prefix
    if (eventText.startsWith('start:')) {
      eventType = 'start';
      eventName = eventText.substring(6).trim();
    } else if (eventText.startsWith('end:')) {
      eventType = 'end';
      eventName = eventText.substring(4).trim();
    } else if (eventText.startsWith('boundary:')) {
      eventType = 'boundary';
      eventName = eventText.substring(9).trim();
    }
    
    // Check for event definition
    if (eventName.startsWith('message:')) {
      eventDefinition = 'message';
      eventName = eventName.substring(8).trim();
    } else if (eventName.startsWith('timer:')) {
      eventDefinition = 'timer';
      eventName = eventName.substring(6).trim();
      
      // Extract timer attributes if present
      const durationMatch = eventName.match(/\[duration:\s*([^\]]+)\]/);
      if (durationMatch) {
        eventAttributes.duration = durationMatch[1].trim();
        eventName = eventName.replace(durationMatch[0], '').trim();
      }
    } else if (eventName.startsWith('error:')) {
      eventDefinition = 'error';
      eventName = eventName.substring(6).trim();
    } else if (eventName.startsWith('signal:')) {
      eventDefinition = 'signal';
      eventName = eventName.substring(7).trim();
    }
    
    const event: Event = {
      id: this.generateId('event'),
      name: eventName,
      type: 'event',
      eventType,
      eventDefinition,
      lane: currentLane.id,
      incoming: [],
      outgoing: [],
      eventAttributes
    };
    
    currentLane.elements.push(event);
    
    return { nextIndex: currentLane.elements.length };
  }
  
  /**
   * Parse a data object
   * @param line The data object line
   * @param currentLane The current lane
   * @param currentProcess The current process
   * @returns The next line index to process
   */
  private parseDataObject(line: string, currentLane: Lane, currentProcess: Process): { nextIndex: number } {
    const dataObjectText = line.substring(1).trim();
    let dataObjectName = dataObjectText;
    let isInput = false;
    let isOutput = false;
    let attachedTo = '';
    
    // Check for attached task
    if (dataObjectText.includes('@')) {
      const parts = dataObjectText.split('@');
      dataObjectName = parts[0].trim();
      attachedTo = parts[1].trim();
    }
    
    const dataObject: DataObject = {
      id: this.generateId('dataObject'),
      name: dataObjectName,
      type: 'dataObject',
      lane: currentLane.id,
      incoming: [],
      outgoing: [],
      isInput,
      isOutput
    };
    
    currentLane.elements.push(dataObject);
    currentProcess.dataObjects.push(dataObject);
    
    // Link to attached task if specified
    if (attachedTo) {
      const task = this.findTaskByName(attachedTo, currentLane);
      if (task) {
        dataObject.outgoing.push(task.id);
        task.incoming.push(dataObject.id);
      }
    }
    
    return { nextIndex: currentLane.elements.length };
  }
  
  /**
   * Parse a data store
   * @param line The data store line
   * @param currentLane The current lane
   * @param currentProcess The current process
   * @returns The next line index to process
   */
  private parseDataStore(line: string, currentLane: Lane, currentProcess: Process): { nextIndex: number } {
    const dataStoreText = line.substring(1).trim();
    let dataStoreName = dataStoreText;
    let isInput = false;
    let isOutput = false;
    let attachedTo = '';
    
    // Check for attached task
    if (dataStoreText.includes('@')) {
      const parts = dataStoreText.split('@');
      dataStoreName = parts[0].trim();
      attachedTo = parts[1].trim();
    }
    
    const dataStore: DataStore = {
      id: this.generateId('dataStore'),
      name: dataStoreName,
      type: 'dataStore',
      lane: currentLane.id,
      incoming: [],
      outgoing: [],
      isInput,
      isOutput
    };
    
    currentLane.elements.push(dataStore);
    currentProcess.dataStores.push(dataStore);
    
    // Link to attached task if specified
    if (attachedTo) {
      const task = this.findTaskByName(attachedTo, currentLane);
      if (task) {
        dataStore.outgoing.push(task.id);
        task.incoming.push(dataStore.id);
      }
    }
    
    return { nextIndex: currentLane.elements.length };
  }
  
  /**
   * Parse a message flow
   * @param line The message flow line
   * @param currentProcess The current process
   * @returns The next line index to process
   */
  private parseMessageFlow(line: string, currentProcess: Process): { nextIndex: number } {
    const messageFlowText = line.substring(1).trim();
    let messageName = '';
    let sourceRef = '';
    let targetRef = '';
    
    // Check for explicit message flow syntax
    if (messageFlowText.includes('->')) {
      const parts = messageFlowText.split('->');
      
      if (parts.length >= 2) {
        // Extract message name if present
        if (parts[0].includes('@')) {
          const nameParts = parts[0].split('@');
          messageName = nameParts[0].trim();
          sourceRef = nameParts[1].trim();
        } else {
          sourceRef = parts[0].trim();
        }
        
        targetRef = parts[1].trim();
      }
    } else {
      messageName = messageFlowText;
    }
    
    const messageFlow: MessageFlow = {
      id: this.generateId('messageFlow'),
      name: messageName,
      sourceRef,
      targetRef
    };
    
    currentProcess.messageFlows.push(messageFlow);
    
    return { nextIndex: currentProcess.messageFlows.length };
  }
  
  /**
   * Parse a regular task
   * @param line The task line
   * @param currentLane The current lane
   * @returns The next line index to process
   */
  private parseTask(line: string, currentLane: Lane): { nextIndex: number } {
    let taskName = line.trim();
    let isMessageSender = false;
    let isMessageReceiver = false;
    let messageName = '';
    
    // Check for message sender/receiver
    if (taskName.startsWith('send:')) {
      isMessageSender = true;
      messageName = taskName.substring(5).trim();
      taskName = messageName;
    } else if (taskName.startsWith('receive:')) {
      isMessageReceiver = true;
      messageName = taskName.substring(8).trim();
      taskName = messageName;
    }
    
    // Check for explicit flow connections
    let outgoingTaskName = '';
    if (taskName.includes('->')) {
      const parts = taskName.split('->');
      taskName = parts[0].trim();
      outgoingTaskName = parts[1].trim();
    }
    
    const task: Task = {
      id: this.generateId('task'),
      name: taskName,
      type: 'task',
      lane: currentLane.id,
      incoming: [],
      outgoing: [],
      isMessageSender,
      isMessageReceiver,
      messageName: isMessageSender || isMessageReceiver ? messageName : undefined
    };
    
    currentLane.elements.push(task);
    
    // Link to outgoing task if specified
    if (outgoingTaskName) {
      // We'll handle this in post-processing
    }
    
    return { nextIndex: currentLane.elements.length };
  }
  
  /**
   * Parse a technical comment
   * @param line The comment line
   * @returns A Comment object
   */
  private parseTechnicalComment(line: string): Comment {
    const commentText = line.substring(2).trim();
    return {
      id: this.generateId('comment'),
      text: commentText,
      type: 'technicalComment'
    };
  }
  
  /**
   * Parse a diagram comment
   * @param line The comment line
   * @returns A Comment object
   */
  private parseDiagramComment(line: string): Comment {
    const commentText = line.substring(1).trim();
    return {
      id: this.generateId('comment'),
      text: commentText,
      type: 'diagramComment'
    };
  }
  
  /**
   * Post-process the document to link elements, create implicit events, etc.
   * @param document The document to post-process
   */
  private postProcess(document: BpmnDocument): void {
    // Link tasks in sequence within lanes
    for (const process of document.processes) {
      for (const lane of process.lanes) {
        this.linkSequentialTasks(lane);
      }
      
      // Link message flows
      this.linkMessageFlows(process);
      
      // Create implicit start/end events if needed
      this.createImplicitEvents(process);
    }
  }
  
  /**
   * Link tasks in sequence within a lane
   * @param lane The lane to process
   */
  private linkSequentialTasks(lane: Lane): void {
    const tasks = lane.elements.filter(e => e.type === 'task' || e.type === 'subprocess' || e.type === 'event');
    
    for (let i = 0; i < tasks.length - 1; i++) {
      const currentTask = tasks[i];
      const nextTask = tasks[i + 1];
      
      // Only link if the current task doesn't already have an outgoing connection
      if (currentTask.outgoing.length === 0) {
        currentTask.outgoing.push(nextTask.id);
        nextTask.incoming.push(currentTask.id);
      }
    }
  }
  
  /**
   * Link message flows between tasks
   * @param process The process to process
   */
  private linkMessageFlows(process: Process): void {
    for (const messageFlow of process.messageFlows) {
      // Find source and target tasks
      const sourceLane = process.lanes.find(l => messageFlow.sourceRef.startsWith(l.name + '.'));
      const targetLane = process.lanes.find(l => messageFlow.targetRef.startsWith(l.name + '.'));
      
      if (sourceLane && targetLane) {
        const sourceTaskName = messageFlow.sourceRef.substring(sourceLane.name.length + 1);
        const targetTaskName = messageFlow.targetRef.substring(targetLane.name.length + 1);
        
        const sourceTask = this.findTaskByName(sourceTaskName, sourceLane);
        const targetTask = this.findTaskByName(targetTaskName, targetLane);
        
        if (sourceTask && targetTask) {
          // Create a special connection for message flows
          // We don't add this to outgoing/incoming to avoid affecting the control flow
        }
      }
    }
  }
  
  /**
   * Create implicit start/end events if needed
   * @param process The process to process
   */
  private createImplicitEvents(process: Process): void {
    let actualFirstElement: ProcessElement | null = null; // Use ProcessElement type
    let firstLaneId: string | null = null;

    // Find the first actual element across all lanes
    for (const lane of process.lanes) {
      if (lane.elements.length > 0) {
        actualFirstElement = lane.elements[0];
        firstLaneId = lane.id;
        break;
      }
    }

    // Create implicit start event if needed
    if (actualFirstElement && firstLaneId) {
      // Check if there's already an explicit start event
      const hasExplicitStartEvent = process.lanes.some(lane =>
        lane.elements.some(e => e.type === 'event' && (e as Event).eventType === 'start')
      );
      
      if (!hasExplicitStartEvent) {
        const startEvent: Event = {
          id: this.generateId('event'),
          name: 'Start',
          type: 'event',
          eventType: 'start',
          eventDefinition: 'none',
          lane: firstLaneId, // Assign to the lane of the first element
          incoming: [],
          outgoing: [actualFirstElement.id] // Link to the actual first element
        };
        
        // Don't add to elements array, store reference on process
        process.defaultStartEvent = startEvent; // Use existing field
        // Ensure the actual first element points back to the implicit start event
        if (!actualFirstElement.incoming.includes(startEvent.id)) {
             actualFirstElement.incoming.push(startEvent.id); // Keep this logic
        }
      }
    }
    
    // Create implicit end event if needed
    let actualLastElement: ProcessElement | null = null; // Use ProcessElement type
    let lastLaneId: string | null = null;

    // Find the last actual element across all lanes
    for (let i = process.lanes.length - 1; i >= 0; i--) {
      const lane = process.lanes[i];
      if (lane.elements.length > 0) {
        actualLastElement = lane.elements[lane.elements.length - 1];
        lastLaneId = lane.id;
        break;
      }
    }

    // Create implicit end event if needed
    if (actualLastElement && lastLaneId) {
      // Check if there's already an explicit end event
      const hasExplicitEndEvent = process.lanes.some(lane =>
        lane.elements.some(e => e.type === 'event' && (e as Event).eventType === 'end')
      );
      
      if (!hasExplicitEndEvent) {
        const endEvent: Event = {
          id: this.generateId('event'),
          name: 'End',
          type: 'event',
          eventType: 'end',
          eventDefinition: 'none',
          lane: lastLaneId, // Assign to the lane of the last element
          incoming: [actualLastElement.id], // Link from the actual last element
          outgoing: []
        };
        
        // Don't add to elements array, store reference on process
        process.defaultEndEvent = endEvent; // Use existing field
        // Ensure the actual last element points forward to the implicit end event
        if (!actualLastElement.outgoing.includes(endEvent.id)) {
            actualLastElement.outgoing.push(endEvent.id); // Keep this logic
        }
      }
    }
  }
  
  /**
   * Find a task by name within a lane
   * @param name The task name to find
   * @param lane The lane to search in
   * @returns The found task or undefined
   */
  private findTaskByName(name: string, lane: Lane): Task | undefined {
    return lane.elements.find(e => e.type === 'task' && e.name === name) as Task | undefined;
  }
  
  /**
   * Generate a unique ID for an element
   * @param prefix The prefix to use for the ID
   * @returns A unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${++this.idCounter}`;
  }
}