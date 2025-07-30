// Fixed BpmnLiteParser for TypeScript/VSCode extension
export class BpmnLiteParser {
    private processes: string[] = [];
    private lanes: { [key: string]: { process: string; tasks: string[] } } = {};
    private tasks: { [key: string]: any } = {};
    private connections: any[] = [];
    private dataObjects: any[] = [];
    private messages: any[] = [];
    private events: string[] = [];
    private currentProcess: string | null = null;
    private currentLane: string | null = null;
    private lastTask: string | null = null;
    private taskScope: { [key: string]: string } = {};
    private gatewayStack: any[] = [];
    private connectionBreaks: number[] = [];
    private taskLineNumbers: { [key: string]: number } = {};
    private originalText: string = '';
    private currentLineIndex: number = 0;
    private endEventLane: string | null = null;

    parse(text: string): any {
        // Reset state
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
        this.originalText = text;
        this.currentLineIndex = 0;
        this.endEventLane = null;

        const lines = text.split('\n');
        
        // Create default process if none specified
        this.ensureProcess("Default Process");
        
        // First pass: collect processes, lanes, and tasks
        for (let i = 0; i < lines.length; i++) {
            this.currentLineIndex = i;
            const originalLine = lines[i];
            const line = originalLine.trim();
            if (!line) continue;
            
            // Check for connection break line
            if (line === '---' || line.match(/^-{3,}$/)) {
                this.connectionBreaks.push(i);
                continue;
            }
            
            const firstNonWhitespace = line.match(/\S/);
            if (!firstNonWhitespace) continue;
            
            const firstChar = firstNonWhitespace[0];
            
            // Check for connected parts with -> or <- operators
            const parts = this.splitConnections(line);
            
            if (parts.length > 1) {
                // Process each part and create the connections
                let prevTaskId: string | null = null;
                
                for (let j = 0; j < parts.length; j++) {
                    const part = parts[j].trim();
                    if (!part) continue;
                    
                    // Process this part (pass line number)
                    const taskId = this.processLinePart(part, firstChar, i);
                    
                    // Create connection if we have a previous task
                    if (prevTaskId && taskId) {
                        const connectionType = parts[j-1].includes('<-') ? 'backward' : 'forward';
                        
                        if (connectionType === 'forward') {
                            this.addConnection('flow', prevTaskId, taskId);
                        } else {
                            this.addConnection('flow', taskId, prevTaskId);
                        }
                    }
                    
                    if (taskId) {
                        prevTaskId = taskId;
                    }
                }
            } else {
                // Single part, process normally (pass line number)
                this.processLinePart(line, firstChar, i);
            }
        }

        // Auto-inject connection breaks after End events
        this.injectConnectionBreaksAfterEndEvents(lines);

        // Automatically connect sequential tasks
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

    private connectSequentialTasks(): void {
        // Build maps for gateways and their branches
        const gatewayMap: { [key: string]: any } = {};
        const gatewayBranchesMap: { [key: string]: any } = {};
        
        // Find all gateways and initialize their data
        Object.values(this.tasks).forEach(task => {
            if (task.type === 'gateway') {
                gatewayMap[task.id] = task;
                gatewayBranchesMap[task.id] = {
                    positive: [],
                    negative: [],
                    nextTask: null,
                    taskBeforeGateway: null  // Track the task before this gateway
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
        
        // Process each lane
        Object.values(this.lanes).forEach(lane => {
            let prevTask: string | null = null;
            
            // Find gateways in this lane and identify their context
            const gateways = lane.tasks.filter(taskId => 
                this.tasks[taskId] && this.tasks[taskId].type === 'gateway'
            );
            
            // For each gateway, find the task before it and after its branches
            gateways.forEach(gatewayId => {
                const gatewayIndex = lane.tasks.indexOf(gatewayId);
                
                // Find task before gateway
                for (let i = gatewayIndex - 1; i >= 0; i--) {
                    const taskId = lane.tasks[i];
                    const task = this.tasks[taskId];
                    if (task && task.type !== 'branch' && task.type !== 'gateway') {
                        gatewayBranchesMap[gatewayId].taskBeforeGateway = taskId;
                        break;
                    }
                }
                
                // Find the first non-branch task after the gateway
                for (let i = gatewayIndex + 1; i < lane.tasks.length; i++) {
                    const taskId = lane.tasks[i];
                    const task = this.tasks[taskId];
                    
                    // Skip branches belonging to this gateway
                    if (task.type === 'branch' && task.parentGateway === gatewayId) {
                        continue;
                    }
                    
                    // Skip other gateways
                    if (task.type === 'gateway') {
                        continue;
                    }
                    
                    // Found the next task after branches
                    gatewayBranchesMap[gatewayId].nextTask = taskId;
                    break;
                }
            });
            
            // Now connect tasks sequentially, respecting gateway logic
            for (let i = 0; i < lane.tasks.length; i++) {
                const currentTaskId = lane.tasks[i];
                const currentTask = this.tasks[currentTaskId];
                
                // Skip branches - they're handled separately
                if (currentTask.type === 'branch') {
                    continue;
                }
                
                // Handle gateways
                if (currentTask.type === 'gateway') {
                    if (prevTask) {
                        this.addConnection('flow', prevTask, currentTaskId);
                    }
                    // Don't update prevTask for gateway - we want to break the flow
                    prevTask = null;
                    continue;
                }
                
                // Check if this task comes after a gateway's branches
                let isTaskAfterGatewayBranches = false;
                let skipConnection = false;
                
                for (const [gId, data] of Object.entries(gatewayBranchesMap)) {
                    if (data.nextTask === currentTaskId) {
                        isTaskAfterGatewayBranches = true;
                        // If prevTask is the task before this gateway, skip the connection
                        if (prevTask && prevTask === data.taskBeforeGateway) {
                            skipConnection = true;
                        }
                        break;
                    }
                }
                
                // Connect to previous task if appropriate
                if (prevTask && !skipConnection) {
                    const connectionExists = this.connections.some(conn => 
                        conn.type === 'sequenceFlow' &&
                        conn.sourceRef === prevTask &&
                        conn.targetRef === currentTaskId
                    );
                    
                    // Check for connection breaks
                    const hasBreak = this.hasConnectionBreakBetween(
                        this.taskLineNumbers[prevTask],
                        this.taskLineNumbers[currentTaskId]
                    );
                    
                    if (!connectionExists && !hasBreak) {
                        this.addConnection('flow', prevTask, currentTaskId);
                    }
                }
                
                // Update previous task for next iteration
                prevTask = currentTaskId;
            }
        });
        
        // Handle gateway connections and branches
        Object.entries(gatewayBranchesMap).forEach(([gatewayId, data]) => {
            const gateway = this.tasks[gatewayId];
            
            // Connect gateway to all its branches
            gateway.branches.forEach((branchId: string) => {
                this.addConnection('flow', gatewayId, branchId);
            });
            
            // Connect ONLY positive branches to the next task
            data.positive.forEach((branchId: string) => {
                if (data.nextTask) {
                    this.addConnection('flow', branchId, data.nextTask);
                }
            });
            
            // Negative branches DO NOT connect to the next task
            // They are dead ends unless explicitly connected
        });
        
        // Connect matching send/receive tasks by message name
        const sendTasks = Object.values(this.tasks).filter(task => task.type === 'send');
        const receiveTasks = Object.values(this.tasks).filter(task => task.type === 'receive');
        
        sendTasks.forEach(sendTask => {
            const messageName = sendTask.messageName;
            
            if (!messageName) return;
            
            // Find matching receive task with the same message name
            const matchingReceive = receiveTasks.find(receiveTask => 
                receiveTask.messageName === messageName
            );
            
            if (matchingReceive) {
                // Check if connection already exists
                const connectionExists = this.connections.some(conn => 
                    conn.type === 'messageFlow' && 
                    conn.sourceRef === sendTask.id && 
                    conn.targetRef === matchingReceive.id
                );
                
                // Check if there's a connection break between these tasks
                const hasBreak = this.hasConnectionBreakBetween(
                    this.taskLineNumbers[sendTask.id],
                    this.taskLineNumbers[matchingReceive.id]
                );
                
                if (!connectionExists && !hasBreak) {
                    // Create the message object
                    const messageId = `message_${this.normalizeId(messageName)}`;
                    
                    // Add to messages array if not already there
                    if (!this.messages.find(m => m.id === messageId)) {
                        this.messages.push({
                            type: 'message',
                            name: messageName,
                            id: messageId,
                            sourceRef: sendTask.id,
                            targetRef: matchingReceive.id
                        });
                    }
                    
                    this.addConnection('message', sendTask.id, matchingReceive.id, messageName);
                }
            }
        });
        
        // Connect across lanes for tasks that should follow each other
        this.connectAcrossLanes();
        
        // Special handling for start/end events
        this.connectEvents();
    }

    private connectAcrossLanes(): void {
        // Get all lanes in order
        const allLanes = Object.values(this.lanes);
        
        // Connect last task of one lane to first task of next lane
        for (let i = 0; i < allLanes.length - 1; i++) {
            const currentLane = allLanes[i];
            const nextLane = allLanes[i + 1];
            
            if (currentLane.tasks.length === 0 || nextLane.tasks.length === 0) {
                continue;
            }
            
            // Find the last non-branch task in the current lane
            let lastTaskInCurrentLane: string | null = null;
            for (let j = currentLane.tasks.length - 1; j >= 0; j--) {
                const taskId = currentLane.tasks[j];
                const task = this.tasks[taskId];
                if (task && task.type !== 'branch') {
                    lastTaskInCurrentLane = taskId;
                    break;
                }
            }
            
            // Find the first non-branch task in the next lane
            let firstTaskInNextLane: string | null = null;
            for (let j = 0; j < nextLane.tasks.length; j++) {
                const taskId = nextLane.tasks[j];
                const task = this.tasks[taskId];
                if (task && task.type !== 'branch') {
                    firstTaskInNextLane = taskId;
                    break;
                }
            }
            
            // Connect them if both found
            if (lastTaskInCurrentLane && firstTaskInNextLane) {
                // Check if connection already exists
                const connectionExists = this.connections.some(conn => 
                    conn.type === 'sequenceFlow' && 
                    conn.sourceRef === lastTaskInCurrentLane && 
                    conn.targetRef === firstTaskInNextLane
                );
                
                // Check if the target is after a gateway's branches
                let targetIsAfterGateway = false;
                Object.values(this.tasks).forEach(task => {
                    if (task.type === 'gateway' && task.lane === this.tasks[firstTaskInNextLane!].lane) {
                        // Check if firstTaskInNextLane comes after this gateway's branches
                        const laneTasks = this.lanes[`@${task.lane}`].tasks;
                        const gatewayIndex = laneTasks.indexOf(task.id);
                        const targetIndex = laneTasks.indexOf(firstTaskInNextLane!);
                        
                        if (gatewayIndex >= 0 && targetIndex > gatewayIndex) {
                            // Check if there are branches between
                            for (let k = gatewayIndex + 1; k < targetIndex; k++) {
                                const betweenTask = this.tasks[laneTasks[k]];
                                if (betweenTask && betweenTask.type === 'branch' && betweenTask.parentGateway === task.id) {
                                    targetIsAfterGateway = true;
                                    break;
                                }
                            }
                        }
                    }
                });
                
                // Check for connection breaks
                const hasBreak = this.hasConnectionBreakBetween(
                    this.taskLineNumbers[lastTaskInCurrentLane],
                    this.taskLineNumbers[firstTaskInNextLane]
                );
                
                // Only connect if appropriate
                if (!connectionExists && !targetIsAfterGateway && !hasBreak) {
                    this.addConnection('flow', lastTaskInCurrentLane, firstTaskInNextLane);
                }
            }
        }
    }

    private hasConnectionBreakBetween(fromLine: number | undefined, toLine: number | undefined): boolean {
        if (fromLine === undefined || toLine === undefined) return false;
        
        const minLine = Math.min(fromLine, toLine);
        const maxLine = Math.max(fromLine, toLine);
        
        return this.connectionBreaks.some(breakLine => 
            breakLine > minLine && breakLine < maxLine
        );
    }

    private connectEvents(): void {
        // Implementation for connecting start/end events
        // This is a placeholder - implement based on your needs
    }

    private normalizeId(name: string): string {
        return name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    private ensureProcess(name: string): void {
        if (!this.processes.includes(name)) {
            this.processes.push(name);
            this.currentProcess = name;
        }
    }

    private splitConnections(line: string): string[] {
        // Split the line at -> and <- operators, preserving the operators
        const result: string[] = [];
        let currentPart = '';
        let i = 0;
        
        while (i < line.length) {
            if (line.substr(i, 2) === '->' || line.substr(i, 2) === '<-') {
                result.push(currentPart);
                result.push(line.substr(i, 2));
                currentPart = '';
                i += 2;
            } else {
                currentPart += line[i];
                i++;
            }
        }
        
        if (currentPart) {
            result.push(currentPart);
        }
        
        // Rejoin into proper parts that maintain the operator with the right part
        const parts: string[] = [];
        for (let i = 0; i < result.length; i++) {
            if (result[i] === '->' || result[i] === '<-') {
                parts[parts.length - 1] += result[i];
            } else {
                parts.push(result[i]);
            }
        }
        
        return parts;
    }

    private processLinePart(line: string, firstChar: string, lineNumber: number): string | null {
        // Process based on the first character
        let taskId: string | null = null;
        
        switch(firstChar) {
            case ':': // Process definition
                this.parseProcess(line);
                break;
            case '@': // Lane definition
                this.parseLane(line);
                break;
            case '^': // Message flow
                taskId = this.parseConnection(line);
                break;
            case '#': // Data object
                taskId = this.parseDataObject(line);
                break;
            case '?': // Gateway
                taskId = this.parseGateway(line);
                break;
            case '+': // Positive branch
            case '-': // Negative branch
                taskId = this.parseGatewayBranch(line, firstChar);
                break;
            case '"': // Comment
                taskId = this.parseComment(line);
                break;
            case '!': // Event
                taskId = this.parseEvent(line);
                break;
            case '/': // Technical comment (ignored)
                if (line.startsWith('//')) {
                    // Ignore technical comments
                    break;
                }
                // If not a comment, treat as a task
                taskId = this.parseTask(line);
                break;
            default:
                // Check if this is a task
                taskId = this.parseTask(line);
        }
        
        // Update last task if we created one
        if (taskId) {
            this.lastTask = taskId;
            // Store line number for this task
            if (lineNumber !== undefined) {
                this.taskLineNumbers[taskId] = lineNumber;
            }
        }
        
        return taskId;
    }

    private parseProcess(line: string): void {
        const processName = line.substring(1).trim();
        this.ensureProcess(processName);
    }

    private parseLane(line: string): void {
        const laneName = line.trim();
        if (!this.lanes[laneName]) {
            this.lanes[laneName] = {
                process: this.currentProcess || 'Default Process',
                tasks: []
            };
        }
        this.currentLane = laneName;
        this.lastTask = null; // Reset last task when changing lanes
    }

    private parseTask(line: string): string | null {
        if (!this.currentLane) {
            // Create a default lane if needed
            this.parseLane('@Default');
        }
        
        if (!line) return null;
        
        let taskType = 'task';
        let taskName = line;
        let originalName = line;
        
        // Check task type based on prefix
        if (line.startsWith('send:')) {
            taskType = 'send';
            taskName = line.substring(5).trim();
            originalName = `send: ${taskName}`;
        } else if (line.startsWith('receive:')) {
            taskType = 'receive';
            taskName = line.substring(8).trim();
            originalName = `receive: ${taskName}`;
        }
        
        const laneName = this.currentLane!.replace('@', '');
        const normalizedLaneName = this.normalizeId(laneName);
        const taskId = `${normalizedLaneName}_${this.normalizeId(originalName)}`;
        
        this.tasks[taskId] = {
            type: taskType,
            name: originalName,
            messageName: taskType === 'send' || taskType === 'receive' ? taskName : null,
            id: taskId,
            lane: laneName
        };
        
        this.lanes[this.currentLane!].tasks.push(taskId);
        
        // Add task to scope for reference
        const simpleName = this.normalizeId(taskName);
        this.taskScope[simpleName] = taskId;
        this.taskScope[`${laneName}.${simpleName}`] = taskId;
        this.taskScope[`@${laneName}.${simpleName}`] = taskId;
        
        // Also add the full name with prefix for reference
        const fullName = this.normalizeId(originalName);
        this.taskScope[fullName] = taskId;
        this.taskScope[`${laneName}.${fullName}`] = taskId;
        this.taskScope[`@${laneName}.${fullName}`] = taskId;
        
        return taskId;
    }

    private parseGateway(line: string): string | null {
        if (!this.currentLane) {
            this.parseLane('@Default');
        }
        
        const gatewayName = line.substring(1).trim();
        const laneName = this.currentLane!.replace('@', '');
        const normalizedLaneName = this.normalizeId(laneName);
        const gatewayId = `${normalizedLaneName}_${this.normalizeId(gatewayName)}`;
        
        this.tasks[gatewayId] = {
            type: 'gateway',
            gatewayType: 'exclusive',
            name: gatewayName,
            id: gatewayId,
            lane: laneName,
            branches: []
        };
        
        this.lanes[this.currentLane!].tasks.push(gatewayId);
        
        // Add gateway to scope for reference
        const simpleName = this.normalizeId(gatewayName);
        this.taskScope[simpleName] = gatewayId;
        this.taskScope[`${laneName}.${simpleName}`] = gatewayId;
        this.taskScope[`@${laneName}.${simpleName}`] = gatewayId;
        
        // Push to gateway stack
        this.gatewayStack.push(gatewayId);
        
        return gatewayId;
    }

    private parseGatewayBranch(line: string, branchChar: string): string | null {
        if (this.gatewayStack.length === 0) {
            return null;
        }
        
        const parentGateway = this.gatewayStack[this.gatewayStack.length - 1];
        const branchName = line.substring(1).trim();
        const laneName = this.currentLane!.replace('@', '');
        const normalizedLaneName = this.normalizeId(laneName);
        
        const branchId = `${normalizedLaneName}_${this.normalizeId(branchName)}`;
        
        this.tasks[branchId] = {
            type: 'branch',
            branchType: branchChar === '+' ? 'positive' : 'negative',
            name: branchName,
            id: branchId,
            lane: laneName,
            parentGateway: parentGateway
        };
        
        this.lanes[this.currentLane!].tasks.push(branchId);
        
        // Add branch to parent gateway
        if (this.tasks[parentGateway]) {
            this.tasks[parentGateway].branches.push(branchId);
        }
        
        // Add branch to scope for reference
        const simpleName = this.normalizeId(branchName);
        this.taskScope[simpleName] = branchId;
        this.taskScope[`${laneName}.${simpleName}`] = branchId;
        this.taskScope[`@${laneName}.${simpleName}`] = branchId;
        
        return branchId;
    }

    private parseComment(line: string): string | null {
        if (!this.currentLane) {
            this.parseLane('@Default');
        }
        
        const commentText = line.substring(1).trim();
        const laneName = this.currentLane!.replace('@', '');
        const normalizedLaneName = this.normalizeId(laneName);
        const commentId = `${normalizedLaneName}_comment_${this.normalizeId(commentText.substring(0, 20))}`;
        
        this.tasks[commentId] = {
            type: 'comment',
            name: commentText,
            id: commentId,
            lane: laneName
        };
        
        this.lanes[this.currentLane!].tasks.push(commentId);
        
        return commentId;
    }

    private parseEvent(line: string): string | null {
        const eventName = line.substring(1).trim();
        let eventType = 'intermediate';
        let eventId: string;
        let isProcessLevel = false;
        
        // Determine event type based on common keywords
        if (eventName.toLowerCase() === 'start') {
            eventType = 'start';
            eventId = 'process_start';
            isProcessLevel = true;
        } else if (eventName.toLowerCase() === 'end') {
            eventType = 'end';
            eventId = 'process_end';
            isProcessLevel = true;
        } else {
            if (!this.currentLane) {
                this.parseLane('@Default');
            }
            const laneName = this.currentLane!.replace('@', '');
            const normalizedLaneName = this.normalizeId(laneName);
            eventId = `${normalizedLaneName}_${this.normalizeId(eventName)}`;
        }
        
        // Only create the event if it doesn't already exist (for Start/End)
        if (!this.tasks[eventId]) {
            this.tasks[eventId] = {
                type: 'event',
                eventType: eventType,
                name: eventName,
                id: eventId,
                lane: isProcessLevel ? null : this.currentLane!.replace('@', '')
            };
            
            // Track event for special handling
            this.events.push(eventId);
        }
        
        // For process-level events (Start/End), don't add to lane tasks
        if (!isProcessLevel && this.currentLane) {
            this.lanes[this.currentLane].tasks.push(eventId);
        }
        
        // Add event to scope for reference
        const simpleName = this.normalizeId(eventName);
        this.taskScope[simpleName] = eventId;
        if (this.currentLane) {
            const laneName = this.currentLane.replace('@', '');
            this.taskScope[`${laneName}.${simpleName}`] = eventId;
            this.taskScope[`@${laneName}.${simpleName}`] = eventId;
        }
        
        return eventId;
    }

    private parseConnection(line: string): string | null {
        // Implementation for parsing connections
        // This is a placeholder - implement based on your needs
        return null;
    }

    private parseDataObject(line: string): string | null {
        try {
            const content = line.substring(1).trim();
            const parts = content.split(' ');
            const name = parts[0];
            const taskRef = parts.slice(1).join(' ');
            
            const dataObjId = `data_${this.normalizeId(name)}`;
            
            // Create data object even if there's no task reference
            this.dataObjects.push({
                type: 'dataObject',
                name: name,
                id: dataObjId,
                taskRef: taskRef
            });
            
            // If task reference can be resolved, create a connection
            if (taskRef) {
                const taskId = this.resolveTaskId(taskRef, false);
                if (taskId) {
                    // Create a data association
                    this.addConnection('data', dataObjId, taskId);
                }
            }
            
            return dataObjId;
        } catch (error) {
            console.error(`Error parsing data object: ${line}`, error);
            return null;
        }
    }

    private resolveTaskId(taskRef: string, isMessageFlow: boolean): string | null {
        // Direct lookup in task scope
        if (this.taskScope[taskRef]) {
            return this.taskScope[taskRef];
        }
        
        // Try normalized version
        const normalized = this.normalizeId(taskRef);
        if (this.taskScope[normalized]) {
            return this.taskScope[normalized];
        }
        
        // Try to find by partial match
        const taskEntries = Object.entries(this.taskScope);
        for (const [key, value] of taskEntries) {
            if (key.includes(normalized) || normalized.includes(key)) {
                return value;
            }
        }
        
        return null;
    }

    private addConnection(type: string, sourceId: string, targetId: string, name: string = ''): void {
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

    private injectConnectionBreaksAfterEndEvents(lines: string[]): void {
        // Find all End event references in the text and auto-inject breaks
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check if this line contains an End event reference
            if (line === '!End' || line === '!end' || line === '+!End' || line === '-!End') {
                // Check if there's already a connection break after this line
                const hasBreakAfter = this.connectionBreaks.some(breakLine => 
                    breakLine > i && breakLine <= i + 2
                );
                
                if (!hasBreakAfter) {
                    // Auto-inject a connection break after this End event
                    this.connectionBreaks.push(i + 1);
                    console.log(`Auto-injected connection break after End event at line ${i + 1}`);
                }
            }
        }
    }
}