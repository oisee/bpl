// This is a TypeScript port of the BpmnLiteParser from the main application
export class BpmnLiteParser {
    private processes: string[] = [];
    private lanes: Record<string, { process: string | null; tasks: string[] }> = {};
    private tasks: Record<string, any> = {};
    private connections: any[] = [];
    private dataObjects: any[] = [];
    private messages: any[] = [];
    private events: string[] = [];
    private currentProcess: string | null = null;
    private currentLane: string | null = null;
    private lastTask: string | null = null;
    private taskScope: Record<string, string> = {};
    private gatewayStack: string[] = [];
    private connectionBreaks: number[] = [];
    private taskLineNumbers: Record<string, number> = {};
    private originalText: string = '';
    private currentLineIndex: number = 0;
    private endEventLane: string | null = null; // Track which lane contains the !End event

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
            if (!line) continue; // Skip empty lines
            
            // Check for connection break line
            if (line === '---' || line.match(/^-{3,}$/)) {
                this.connectionBreaks.push(i);
                continue; // Skip processing this line further
            }
            
            // Find first non-whitespace character for line type detection
            const firstNonWhitespace = line.match(/\S/);
            if (!firstNonWhitespace) continue;
            
            const firstChar = firstNonWhitespace[0];
            
            // Check for connected parts with -> or <- operators
            const parts = this.splitConnections(line);
            
            
            if (parts.length > 1) {
                // Process each part and create the connections
                let prevTaskId: string | null = null;
                let prevOperator: string | null = null;
                
                for (let j = 0; j < parts.length; j++) {
                    const part = parts[j];
                    
                    // Skip operators
                    if (part === '->' || part === '<-') {
                        prevOperator = part;
                        continue;
                    }
                    
                    // Check if this part needs special handling for cross-lane references
                    let taskId: string | null = null;
                    
                    // If we have a previous operator, this is always a reference
                    if (prevOperator) {
                        // Always try to resolve it as a task reference
                        taskId = this.resolveTaskId(part, true); // Create if not found
                    } else {
                        // First part of the line - process normally
                        taskId = this.processLinePart(part, part.charAt(0), i);
                    }
                    
                    // Create connection if we have a previous task and operator
                    if (prevTaskId && taskId && prevOperator) {
                        if (prevOperator === '->') {
                            this.addConnection('flow', prevTaskId, taskId);
                        } else if (prevOperator === '<-') {
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

    private splitConnections(line: string): string[] {
        const parts: string[] = [];
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

    private processLinePart(line: string, firstChar: string, lineNumber?: number): string | null {
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
                    break;
                }
                taskId = this.parseTask(line);
                break;
            default:
                taskId = this.parseTask(line);
        }
        
        if (taskId) {
            this.lastTask = taskId;
            // Store line number for this task
            if (lineNumber !== undefined) {
                this.taskLineNumbers[taskId] = lineNumber;
            }
        }
        
        return taskId;
    }

    private parseEvent(line: string): string {
        const eventName = line.substring(1).trim();
        let eventType = 'intermediate';
        let eventId: string;
        let isProcessLevel = false;
        
        if (eventName.toLowerCase() === 'start') {
            eventType = 'start';
            // Start events are process-level, not lane-specific
            eventId = 'process_start';
            isProcessLevel = true;
        } else if (eventName.toLowerCase() === 'end') {
            eventType = 'end';
            // End events are process-level, not lane-specific
            eventId = 'process_end';
            isProcessLevel = true;
            // Track which lane contains the End event
            this.endEventLane = this.currentLane;
        } else {
            // For non-start/end events, we need a lane
            if (!this.currentLane) {
                this.parseLane('@Default');
            }
            const laneName = this.currentLane!.replace('@', '');
            const normalizedLaneName = this.normalizeId(laneName);
            // Intermediate events can be lane-specific
            eventId = `${normalizedLaneName}_${this.normalizeId(eventName)}`;
        }
        
        // Only create the event if it doesn't already exist (for Start/End)
        if (!this.tasks[eventId]) {
            this.tasks[eventId] = {
                type: 'event',
                eventType: eventType,
                name: eventName,
                id: eventId,
                lane: isProcessLevel ? null : this.currentLane!.replace('@', '') // Process-level events have no lane
            };
            
            this.events.push(eventId);
        }
        
        // For process-level events (Start/End), don't add to lane tasks
        if (!isProcessLevel && this.currentLane) {
            this.lanes[this.currentLane!].tasks.push(eventId);
        }
        
        // Add event to scope for reference
        const simpleName = this.normalizeId(eventName);
        this.taskScope[simpleName] = eventId;
        if (this.currentLane) {
            const laneName = this.currentLane!.replace('@', '');
            this.taskScope[`${laneName}.${simpleName}`] = eventId;
            this.taskScope[`@${laneName}.${simpleName}`] = eventId;
        }
        
        return eventId;
    }

    private ensureProcess(name: string): void {
        if (!this.processes.includes(name)) {
            this.processes.push(name);
            this.currentProcess = name;
        }
    }

    private parseProcess(line: string): void {
        const processName = line.substring(1).trim();
        this.ensureProcess(processName);
    }

    private parseLane(line: string): void {
        const laneName = line.trim();
        if (!this.lanes[laneName]) {
            this.lanes[laneName] = {
                process: this.currentProcess,
                tasks: []
            };
        }
        this.currentLane = laneName;
        this.lastTask = null;
    }

    private parseTask(line: string): string | null {
        if (!this.currentLane) {
            this.parseLane('@Default');
        }
        
        if (!line) return null;
        
        let taskType = 'task';
        let taskName = line;
        let originalName = line;
        
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
        
        const simpleName = this.normalizeId(taskName);
        this.taskScope[simpleName] = taskId;
        this.taskScope[`${laneName}.${simpleName}`] = taskId;
        this.taskScope[`@${laneName}.${simpleName}`] = taskId;
        
        const fullName = this.normalizeId(originalName);
        this.taskScope[fullName] = taskId;
        this.taskScope[`${laneName}.${fullName}`] = taskId;
        this.taskScope[`@${laneName}.${fullName}`] = taskId;
        
        return taskId;
    }

    private parseGateway(line: string): string {
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
        
        const simpleName = this.normalizeId(gatewayName);
        this.taskScope[simpleName] = gatewayId;
        this.taskScope[`${laneName}.${simpleName}`] = gatewayId;
        this.taskScope[`@${laneName}.${simpleName}`] = gatewayId;
        
        this.gatewayStack.push(gatewayId);
        
        return gatewayId;
    }

    private parseGatewayBranch(line: string, branchChar: string): string | null {
        if (this.gatewayStack.length === 0) {
            return null;
        }
        
        const parentGateway = this.gatewayStack[this.gatewayStack.length - 1];
        let branchName = line.substring(1).trim();
        const laneName = this.currentLane!.replace('@', '');
        const normalizedLaneName = this.normalizeId(laneName);
        
        // Check if branch contains arrow operators (e.g., "cancel order -> !End")
        // If so, only use the first part as the branch name
        if (branchName.includes('->') || branchName.includes('<-')) {
            const parts = this.splitConnections(branchName);
            if (parts.length > 0) {
                branchName = parts[0]; // Use only the first part as branch name
            }
        }
        
        // Check if this is a direct End event branch (just "!End" or "End")
        if (branchName.toLowerCase() === '!end' || branchName.toLowerCase() === 'end') {
            // Don't create a branch task, connect directly to the process-level end event
            const endEventId = 'process_end';
            
            // Ensure process-level end event exists
            if (!this.tasks[endEventId]) {
                this.tasks[endEventId] = {
                    type: 'event',
                    eventType: 'end',
                    name: 'End',
                    id: endEventId,
                    lane: null // Process-level event has no lane
                };
                
                // Add to events list
                if (!this.events.includes(endEventId)) {
                    this.events.push(endEventId);
                }
            }
            
            // Connect gateway to end event directly with appropriate label
            const branchLabel = branchChar === '+' ? 'Yes' : 'No';
            this.addConnection('flow', parentGateway, endEventId, branchLabel);
            
            return endEventId;
        }
        
        const branchId = `${normalizedLaneName}_${this.normalizeId(branchName)}`;
        
        let displayName = branchName;
        let branchLabel = branchChar === '+' ? 'Yes' : 'No';
        
        if (branchName.startsWith('|') && branchName.includes('|', 1)) {
            const labelEnd = branchName.indexOf('|', 1);
            branchLabel = branchName.substring(1, labelEnd);
            displayName = branchName.substring(labelEnd + 1).trim();
        }
        
        this.tasks[branchId] = {
            type: 'branch',
            branchType: branchChar === '+' ? 'positive' : 'negative',
            name: displayName,
            label: branchLabel,
            id: branchId,
            lane: laneName,
            parentGateway: parentGateway
        };
        
        this.tasks[parentGateway].branches.push(branchId);
        this.lanes[this.currentLane!].tasks.push(branchId);
        
        const simpleName = this.normalizeId(displayName);
        this.taskScope[simpleName] = branchId;
        this.taskScope[`${laneName}.${simpleName}`] = branchId;
        this.taskScope[`@${laneName}.${simpleName}`] = branchId;
        
        return branchId;
    }

    private parseComment(line: string): string {
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

    private parseConnection(line: string): string | null {
        if (line.startsWith('^')) {
            try {
                const content = line.substring(1).trim();
                
                let sourcePart: string, targetPart: string, messageName: string;
                
                if (content.includes('->')) {
                    [sourcePart, targetPart] = content.split('->').map(s => s.trim());
                } else if (content.includes('<-')) {
                    [targetPart, sourcePart] = content.split('<-').map(s => s.trim());
                } else {
                    messageName = content;
                    return null;
                }
                
                if (sourcePart.includes('@')) {
                    const parts = sourcePart.split(' ');
                    messageName = parts[0];
                    const sourceRef = parts.slice(1).join(' ');
                    
                    const sourceId = this.resolveTaskId(sourceRef, false);
                    const targetId = this.resolveTaskId(targetPart, false);
                    
                    if (sourceId && targetId) {
                        const messageId = `message_${this.normalizeId(messageName)}`;
                        
                        if (!this.messages.find(m => m.id === messageId)) {
                            this.messages.push({
                                type: 'message',
                                name: messageName,
                                id: messageId,
                                sourceRef: sourceId,
                                targetRef: targetId
                            });
                        }
                        
                        // Check if there's a connection break between these tasks
                        const hasBreak = this.hasConnectionBreakBetween(
                            this.taskLineNumbers[sourceId],
                            this.taskLineNumbers[targetId]
                        );
                        
                        if (!hasBreak) {
                            this.addConnection('message', sourceId, targetId, messageName);
                        }
                        return targetId;
                    }
                } else {
                    messageName = sourcePart;
                    const sourceId = this.lastTask;
                    const targetId = this.resolveTaskId(targetPart, false);
                    
                    if (sourceId && targetId) {
                        const messageId = `message_${this.normalizeId(messageName)}`;
                        
                        if (!this.messages.find(m => m.id === messageId)) {
                            this.messages.push({
                                type: 'message',
                                name: messageName,
                                id: messageId,
                                sourceRef: sourceId,
                                targetRef: targetId
                            });
                        }
                        
                        // Check if there's a connection break between these tasks
                        const hasBreak = this.hasConnectionBreakBetween(
                            this.taskLineNumbers[sourceId],
                            this.taskLineNumbers[targetId]
                        );
                        
                        if (!hasBreak) {
                            this.addConnection('message', sourceId, targetId, messageName);
                        }
                        return targetId;
                    }
                }
            } catch (error) {
                console.error(`Error parsing message flow: ${line}`, error);
            }
        }
        
        return null;
    }

    private parseDataObject(line: string): string | null {
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
                const taskId = this.resolveTaskId(taskRef, false);
                if (taskId) {
                    // Check if there's a connection break between these tasks
                    const hasBreak = this.hasConnectionBreakBetween(
                        this.taskLineNumbers[dataObjId],
                        this.taskLineNumbers[taskId]
                    );
                    
                    if (!hasBreak) {
                        this.addConnection('data', dataObjId, taskId);
                    }
                }
            }
            
            return dataObjId;
        } catch (error) {
            console.error(`Error parsing data object: ${line}`, error);
            return null;
        }
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

    private connectSequentialTasks(): void {
        const gatewayMap: Record<string, any> = {};
        const gatewayBranchesMap: Record<string, any> = {};
        
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
            let prevTask: string | null = null;
            
            const gateways = lane.tasks.filter(taskId => 
                this.tasks[taskId] && this.tasks[taskId].type === 'gateway'
            );
            
            gateways.forEach(gatewayId => {
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
                let sourceGateway: string | null = null;
                
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
                    
                    if (fromGatewayConnections.length > 0) {
                        prevTask = currentTaskId;
                        continue;
                    }
                }
                
                if (prevTask) {
                    const connectionExists = this.connections.some(conn => 
                        conn.type === 'sequenceFlow' && 
                        conn.sourceRef === prevTask && 
                        conn.targetRef === currentTaskId
                    );
                    
                    // Check if there's a connection break between these tasks
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
        
        Object.entries(gatewayBranchesMap).forEach(([gatewayId, data]) => {
            const gateway = this.tasks[gatewayId];
            
            gateway.branches.forEach((branchId: string) => {
                this.addConnection('flow', gatewayId, branchId);
            });
            
            data.positive.forEach((branchId: string) => {
                const branch = this.tasks[branchId];
                
                // Always connect positive branches to the next task if available
                if (data.nextTask) {
                    this.addConnection('flow', branchId, data.nextTask);
                }
            });
        });
        
        const sendTasks = Object.values(this.tasks).filter(task => task.type === 'send');
        const receiveTasks = Object.values(this.tasks).filter(task => task.type === 'receive');
        
        sendTasks.forEach(sendTask => {
            const messageName = sendTask.messageName;
            
            if (!messageName) return;
            
            const matchingReceive = receiveTasks.find(receiveTask => 
                receiveTask.messageName === messageName
            );
            
            if (matchingReceive) {
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
                    const messageId = `message_${this.normalizeId(messageName)}`;
                    
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
        
        this.connectAcrossLanes();
        this.connectEvents();
    }
    
    private connectAcrossLanes(): void {
        const allLanes = Object.values(this.lanes);
        
        for (let i = 0; i < allLanes.length - 1; i++) {
            const currentLane = allLanes[i];
            const nextLane = allLanes[i + 1];
            
            if (currentLane.tasks.length === 0 || nextLane.tasks.length === 0) {
                continue;
            }
            
            let lastTaskInCurrentLane: string | null = null;
            for (let j = currentLane.tasks.length - 1; j >= 0; j--) {
                const taskId = currentLane.tasks[j];
                const task = this.tasks[taskId];
                if (task && task.type !== 'branch') {
                    lastTaskInCurrentLane = taskId;
                    break;
                }
            }
            
            let firstTaskInNextLane: string | null = null;
            for (let j = 0; j < nextLane.tasks.length; j++) {
                const taskId = nextLane.tasks[j];
                const task = this.tasks[taskId];
                if (task && task.type !== 'branch') {
                    firstTaskInNextLane = taskId;
                    break;
                }
            }
            
            if (lastTaskInCurrentLane && firstTaskInNextLane) {
                const connectionExists = this.connections.some(conn => 
                    conn.type === 'sequenceFlow' && 
                    conn.sourceRef === lastTaskInCurrentLane && 
                    conn.targetRef === firstTaskInNextLane
                );
                
                const targetAlreadyConnected = this.connections.some(conn =>
                    conn.type === 'sequenceFlow' &&
                    conn.targetRef === firstTaskInNextLane
                );
                
                // Check if there's a connection break between these tasks
                const hasBreak = this.hasConnectionBreakBetween(
                    this.taskLineNumbers[lastTaskInCurrentLane],
                    this.taskLineNumbers[firstTaskInNextLane]
                );
                
                // Only add if no connection exists, target isn't already connected, and no break
                if (!connectionExists && !targetAlreadyConnected && !hasBreak) {
                    this.addConnection('flow', lastTaskInCurrentLane, firstTaskInNextLane);
                }
            }
        }
    }
    
    private connectEvents(): void {
        // Handle process-level Start event connection
        const processStart = this.tasks['process_start'];
        if (processStart) {
            // Find the first task in the entire process
            const firstTask = this.findFirstTaskInProcess();
            if (firstTask) {
                // Check if connection already exists
                const connectionExists = this.connections.some(conn => 
                    conn.type === 'sequenceFlow' && 
                    conn.sourceRef === 'process_start' && 
                    conn.targetRef === firstTask
                );
                
                if (!connectionExists) {
                    this.addConnection('flow', 'process_start', firstTask);
                }
            }
        }
        
        // Handle process-level End event connections
        // Only connect to End event from the lane that contains the !End event
        const processEnd = this.tasks['process_end'];
        if (processEnd && this.endEventLane) {
            // Find the lane that contains the End event
            const endLane = this.lanes[this.endEventLane];
            if (endLane && endLane.tasks.length > 0) {
                const lastTaskInEndLane = endLane.tasks[endLane.tasks.length - 1];
                const lastTask = this.tasks[lastTaskInEndLane];
                
                // Only connect if it's not a branch or gateway (those have their own connections)
                if (lastTask && lastTask.type !== 'branch' && lastTask.type !== 'gateway') {
                    // Check if this task already connects to process_end
                    const alreadyConnected = this.connections.some(conn => 
                        conn.sourceRef === lastTaskInEndLane && 
                        conn.targetRef === 'process_end'
                    );
                    
                    if (!alreadyConnected) {
                        this.addConnection('flow', lastTaskInEndLane, 'process_end');
                    }
                }
            }
        }
    }
    
    private findFirstTaskInProcess(): string | null {
        // Find the very first task that appears in the process
        // This should be the first non-event task in the first lane that contains tasks
        for (const [laneName, lane] of Object.entries(this.lanes)) {
            for (const taskId of lane.tasks) {
                const task = this.tasks[taskId];
                // Return the first non-event, non-branch task
                if (task && task.type !== 'event' && task.type !== 'branch') {
                    return taskId;
                }
            }
        }
        return null;
    }

    private resolveTaskId(taskRef: string, createIfNotFound: boolean = false): string | null {
        if (!taskRef) return null;
        
        taskRef = taskRef.trim();
        
        // 1. Check direct scope lookup
        if (this.taskScope[taskRef]) {
            return this.taskScope[taskRef];
        }
        
        const normalized = this.normalizeId(taskRef);
        if (this.taskScope[normalized]) {
            return this.taskScope[normalized];
        }
        
        // 2. Check if it's a fully qualified reference (lane.task)
        if (taskRef.includes('.')) {
            const parts = taskRef.split('.');
            
            if (parts.length === 2) {
                let [lane, task] = parts;
                
                if (lane.startsWith('@')) {
                    lane = lane.substring(1);
                }
                
                const normalizedTask = this.normalizeId(task);
                
                const lookups = [
                    `${lane}.${normalizedTask}`,
                    `@${lane}.${normalizedTask}`,
                    `${lane}_${normalizedTask}`
                ];
                
                const normalizedLane = this.normalizeId(lane);
                lookups.push(
                    `${normalizedLane}.${normalizedTask}`,
                    `@${normalizedLane}.${normalizedTask}`,
                    `${normalizedLane}_${normalizedTask}`
                );
                
                for (const lookup of lookups) {
                    if (this.taskScope[lookup]) {
                        return this.taskScope[lookup];
                    }
                }
                
                const directId = `${normalizedLane}_${normalizedTask}`;
                if (this.tasks[directId]) {
                    return directId;
                }
                
                // If not found and createIfNotFound is true, create it in the specified lane
                if (createIfNotFound) {
                    // Create the task in the specified lane, not the current lane
                    const targetLane = `@${lane}`;
                    let existingLane = this.lanes[targetLane];
                    
                    // If the lane doesn't exist, create it
                    if (!existingLane) {
                        this.lanes[targetLane] = {
                            process: this.currentProcess,
                            tasks: []
                        };
                        existingLane = this.lanes[targetLane];
                    }
                    
                    // Create task in the target lane
                    const taskId = `${normalizedLane}_${normalizedTask}`;
                    
                    
                    this.tasks[taskId] = {
                        type: 'task',
                        name: task,
                        id: taskId,
                        lane: lane,
                        implicit: true
                    };
                    
                    // Add to target lane
                    existingLane.tasks.push(taskId);
                    
                    // Add to scope
                    this.taskScope[normalizedTask] = taskId;
                    this.taskScope[`${lane}.${normalizedTask}`] = taskId;
                    this.taskScope[`@${lane}.${normalizedTask}`] = taskId;
                    
                    return taskId;
                }
            }
        }
        
        // 3. Search across all lanes in order
        const allLaneNames = Object.keys(this.lanes);
        const currentLaneIndex = this.currentLane ? allLaneNames.indexOf(this.currentLane) : -1;
        
        // 3a. First search in current lane
        if (this.currentLane) {
            const currentLaneName = this.currentLane.replace('@', '');
            const taskInCurrentLane = this.findTaskInLane(currentLaneName, normalized);
            if (taskInCurrentLane) {
                return taskInCurrentLane.id;
            }
        }
        
        // 3b. Search in previous lanes (going up)
        for (let i = currentLaneIndex - 1; i >= 0; i--) {
            const laneName = allLaneNames[i].replace('@', '');
            const task = this.findTaskInLane(laneName, normalized);
            if (task) {
                return task.id;
            }
        }
        
        // 3c. Search in subsequent lanes (going down)
        for (let i = currentLaneIndex + 1; i < allLaneNames.length; i++) {
            const laneName = allLaneNames[i].replace('@', '');
            const task = this.findTaskInLane(laneName, normalized);
            if (task) {
                return task.id;
            }
        }
        
        // 4. If not found and createIfNotFound is true, first check if this task 
        // will be defined later in the text (forward reference)
        if (createIfNotFound && this.currentLane) {
            const futureTaskId = this.findFutureTaskDefinition(taskRef);
            if (futureTaskId) {
                return futureTaskId;
            }
            
            const implicitTaskId = this.createImplicitTask(taskRef);
            return implicitTaskId;
        }
        
        return null;
    }
    
    private findTaskInLane(laneName: string, normalizedTaskName: string): any {
        const laneTasks = Object.values(this.tasks).filter(t => 
            t.lane && t.lane.toLowerCase() === laneName.toLowerCase()
        );
        
        return laneTasks.find(t => 
            this.normalizeId(t.name) === normalizedTaskName || 
            (t.messageName && this.normalizeId(t.messageName) === normalizedTaskName)
        );
    }
    
    private createImplicitTask(taskName: string): string {
        
        if (!this.currentLane) {
            this.parseLane('@Default');
        }
        
        const laneName = this.currentLane!.replace('@', '');
        const normalizedLaneName = this.normalizeId(laneName);
        const taskId = `${normalizedLaneName}_${this.normalizeId(taskName)}`;
        
        
        // Create the implicit task
        this.tasks[taskId] = {
            type: 'task',
            name: taskName,
            id: taskId,
            lane: laneName,
            implicit: true // Mark as implicitly created
        };
        
        // Add to lane tasks
        this.lanes[this.currentLane!].tasks.push(taskId);
        
        // Add to scope
        const simpleName = this.normalizeId(taskName);
        this.taskScope[simpleName] = taskId;
        this.taskScope[`${laneName}.${simpleName}`] = taskId;
        this.taskScope[`@${laneName}.${simpleName}`] = taskId;
        
        return taskId;
    }

    private findFutureTaskDefinition(taskRef: string): string | null {
        if (!this.originalText) return null;
        
        const lines = this.originalText.split('\n');
        const normalized = this.normalizeId(taskRef);
        
        // Look ahead in the text for this task definition
        for (let i = this.currentLineIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Check if this line defines a new lane
            if (line.startsWith('@')) {
                const laneName = line.substring(1).trim();
                const normalizedLaneName = this.normalizeId(laneName);
                
                // Look for task definitions in this lane
                for (let j = i + 1; j < lines.length; j++) {
                    const taskLine = lines[j].trim();
                    if (!taskLine) continue;
                    
                    // Stop if we hit another lane or process definition
                    if (taskLine.startsWith('@') || taskLine.startsWith(':')) {
                        break;
                    }
                    
                    // Skip special lines
                    if (taskLine.startsWith('?') || taskLine.startsWith('+') || 
                        taskLine.startsWith('-') || taskLine.startsWith('!') ||
                        taskLine.startsWith('#') || taskLine.startsWith('"') ||
                        taskLine.startsWith('^') || taskLine.startsWith('//')) {
                        continue;
                    }
                    
                    // Extract task name (handle arrows)
                    let taskName = taskLine;
                    if (taskLine.includes('->') || taskLine.includes('<-')) {
                        // For lines with arrows, we need to check each part
                        const parts = this.splitConnections(taskLine);
                        for (const part of parts) {
                            if (part !== '->' && part !== '<-') {
                                if (this.normalizeId(part) === normalized) {
                                    // Found the task! Create it in the future lane
                                    const futureTaskId = `${normalizedLaneName}_${normalized}`;
                                    
                                    // Ensure the lane exists
                                    const futureLane = `@${laneName}`;
                                    if (!this.lanes[futureLane]) {
                                        this.lanes[futureLane] = {
                                            process: this.currentProcess,
                                            tasks: []
                                        };
                                    }
                                    
                                    // Create the task if it doesn't exist
                                    if (!this.tasks[futureTaskId]) {
                                        this.tasks[futureTaskId] = {
                                            type: 'task',
                                            name: part,
                                            id: futureTaskId,
                                            lane: laneName,
                                            implicit: false // This is a real task definition
                                        };
                                        
                                        // Don't add to lane.tasks here - it will be added when the line is actually processed
                                        // Just add to scope so it can be resolved
                                        this.taskScope[normalized] = futureTaskId;
                                        this.taskScope[`${laneName}.${normalized}`] = futureTaskId;
                                        this.taskScope[`@${laneName}.${normalized}`] = futureTaskId;
                                    }
                                    
                                    return futureTaskId;
                                }
                            }
                        }
                    } else {
                        // Simple task line
                        if (this.normalizeId(taskName) === normalized) {
                            // Found the task! Create it in the future lane
                            const futureTaskId = `${normalizedLaneName}_${normalized}`;
                            
                            // Ensure the lane exists
                            const futureLane = `@${laneName}`;
                            if (!this.lanes[futureLane]) {
                                this.lanes[futureLane] = {
                                    process: this.currentProcess,
                                    tasks: []
                                };
                            }
                            
                            // Create the task if it doesn't exist
                            if (!this.tasks[futureTaskId]) {
                                this.tasks[futureTaskId] = {
                                    type: 'task',
                                    name: taskName,
                                    id: futureTaskId,
                                    lane: laneName,
                                    implicit: false // This is a real task definition
                                };
                                
                                // Don't add to lane.tasks here - it will be added when the line is actually processed
                                // Just add to scope so it can be resolved
                                this.taskScope[normalized] = futureTaskId;
                                this.taskScope[`${laneName}.${normalized}`] = futureTaskId;
                                this.taskScope[`@${laneName}.${normalized}`] = futureTaskId;
                            }
                            
                            return futureTaskId;
                        }
                    }
                }
            }
        }
        
        return null;
    }

    private normalizeId(name: string): string {
        if (!name) return 'unknown';
        return name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }
    
    private isSpecialLine(line: string): boolean {
        if (!line || !line.trim()) return true;
        const firstChar = line.trim().charAt(0);
        return [':', '@', '^', '#', '?', '+', '-', '"', '!', '/'].includes(firstChar);
    }
    
    private hasConnectionBreakBetween(lineNum1: number | undefined, lineNum2: number | undefined): boolean {
        // Check if there's a "---" line between two line numbers
        if (lineNum1 === undefined || lineNum2 === undefined) return false;
        
        const minLine = Math.min(lineNum1, lineNum2);
        const maxLine = Math.max(lineNum1, lineNum2);
        
        // Check if any connection break exists between these lines
        return this.connectionBreaks.some(breakLine => 
            breakLine > minLine && breakLine < maxLine
        );
    }

    toMermaid(): string {
        let mermaid = `flowchart TD
  %% Define node styles
  classDef event fill:#ffd,stroke:#33f,stroke-width:2px
  classDef task fill:#bbf,stroke:#33f,stroke-width:2px
  classDef message fill:#bfb,stroke:#070,stroke-width:2px
  classDef gateway fill:#fcc,stroke:#f00,stroke-width:2px
  classDef comment fill:#ffd,stroke:#bb0,stroke-width:1px
  classDef dataObject fill:#ececff,stroke:#9370db,stroke-width:1px
  classDef branch fill:#d5ffd5,stroke:#3cb371,stroke-width:1px
`;

        // Add process-level events (Start/End) outside of any subgraph
        Object.values(this.tasks).forEach(task => {
            if (task.type === 'event' && (task.eventType === 'start' || task.eventType === 'end') && task.lane === null) {
                mermaid += `  ${task.id}([${task.name}]):::event\n`;
            }
        });

        this.dataObjects.forEach(dataObj => {
            mermaid += `  ${dataObj.id}[(${dataObj.name})]:::dataObject\n`;
        });

        const laneNodes: Record<string, string[]> = {};
        const laneDisplayNames: Record<string, string> = {};
        
        Object.entries(this.lanes).forEach(([laneName, lane]) => {
            const normalizedLaneName = this.normalizeId(laneName.replace('@', ''));
            laneNodes[normalizedLaneName] = lane.tasks.filter(taskId => {
                const task = this.tasks[taskId];
                return task;
            });
            // Store original lane name for display
            laneDisplayNames[normalizedLaneName] = laneName.replace('@', '');
        });
        
        Object.entries(laneNodes).forEach(([laneName, taskIds], index) => {
            if (taskIds.length > 0) {
                // Use sg prefix to ensure valid subgraph names
                const sgName = `sg${index}`;
                // Use the original lane name for display
                const displayName = laneDisplayNames[laneName] || laneName;
                mermaid += `  subgraph ${sgName}["${displayName}"]\n`;
                
                taskIds.forEach(taskId => {
                    const task = this.tasks[taskId];
                    
                    if (!task) return;
                    
                    switch(task.type) {
                        case 'task':
                            mermaid += `    ${task.id}[${task.name}]:::task\n`;
                            break;
                        case 'send':
                        case 'receive':
                            mermaid += `    ${task.id}>${task.name}]:::message\n`;
                            break;
                        case 'gateway':
                            mermaid += `    ${task.id}{${task.name}?}:::gateway\n`;
                            break;
                        case 'branch':
                            mermaid += `    ${task.id}["${task.name}"]:::branch\n`;
                            break;
                        case 'comment':
                            mermaid += `    ${task.id}[/${task.name}/]:::comment\n`;
                            break;
                        case 'event':
                            mermaid += `    ${task.id}([${task.name}]):::event\n`;
                            break;
                    }
                });
                
                mermaid += `  end\n`;
            }
        });
        
        Object.keys(laneNodes).forEach((laneName, index) => {
            const sgName = `sg${index}`;
            const color = index % 2 === 0 ? 
                'fill:#f9f9f9,stroke:#333,stroke-width:1px' : 
                'fill:#e6f3ff,stroke:#333,stroke-width:1px';
            mermaid += `  style ${sgName} ${color}\n`;
        });
        
        mermaid += '\n';
        
        mermaid += '  %% Sequence flows\n';
        this.connections.forEach(conn => {
            if (conn.type === 'sequenceFlow') {
                const source = this.tasks[conn.sourceRef];
                const target = this.tasks[conn.targetRef];
                
                if (source && target) {
                    if (source.type === 'gateway' && target.type === 'branch') {
                        mermaid += `  ${conn.sourceRef} -->|${target.label}| ${conn.targetRef}\n`;
                    } else if (source.type === 'gateway' && target.type === 'event' && target.eventType === 'end') {
                        // Gateway to End event with label (from branch)
                        const label = conn.name || 'Yes'; // Default to 'Yes' if no label specified
                        mermaid += `  ${conn.sourceRef} -->|${label}| ${conn.targetRef}\n`;
                    } else {
                        mermaid += `  ${conn.sourceRef} --> ${conn.targetRef}\n`;
                    }
                }
            }
        });
        
        mermaid += '  %% Message flows\n';
        this.connections.forEach(conn => {
            if (conn.type === 'messageFlow') {
                const label = conn.name ? `|${conn.name}|` : '';
                mermaid += `  ${conn.sourceRef} -.->${ label } ${conn.targetRef}\n`;
            }
        });
        
        mermaid += '  %% Data flows\n';
        this.connections.forEach(conn => {
            if (conn.type === 'dataAssociation') {
                mermaid += `  ${conn.sourceRef} -.-> ${conn.targetRef}\n`;
            }
        });
        
        return mermaid;
    }
}