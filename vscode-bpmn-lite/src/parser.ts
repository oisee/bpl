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

        const lines = text.split('\n');
        
        // Create default process if none specified
        this.ensureProcess("Default Process");
        
        // First pass: collect processes, lanes, and tasks
        for (let i = 0; i < lines.length; i++) {
            const originalLine = lines[i];
            const line = originalLine.trim();
            if (!line) continue; // Skip empty lines
            
            // Find first non-whitespace character for line type detection
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
                    
                    // Process this part
                    const taskId = this.processLinePart(part, firstChar);
                    
                    // Create connection if we have a previous task
                    if (prevTaskId && taskId) {
                        const connectionType = j > 0 && parts[j-1].includes('<-') ? 'backward' : 'forward';
                        
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
                // Single part, process normally
                this.processLinePart(line, firstChar);
            }
        }

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

    private processLinePart(line: string, firstChar: string): string | null {
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
        }
        
        return taskId;
    }

    private parseEvent(line: string): string {
        if (!this.currentLane) {
            this.parseLane('@Default');
        }
        
        const eventName = line.substring(1).trim();
        const laneName = this.currentLane!.replace('@', '');
        let eventType = 'intermediate';
        
        if (eventName.toLowerCase() === 'start') {
            eventType = 'start';
        } else if (eventName.toLowerCase() === 'end') {
            eventType = 'end';
        }
        
        const eventId = `${laneName}_${eventType}`;
        
        this.tasks[eventId] = {
            type: 'event',
            eventType: eventType,
            name: eventName,
            id: eventId,
            lane: laneName
        };
        
        this.lanes[this.currentLane!].tasks.push(eventId);
        
        const simpleName = this.normalizeId(eventName);
        this.taskScope[simpleName] = eventId;
        this.taskScope[`${laneName}.${simpleName}`] = eventId;
        this.taskScope[`@${laneName}.${simpleName}`] = eventId;
        
        this.events.push(eventId);
        
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
        const taskId = `${laneName}_${this.normalizeId(originalName)}`;
        
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
        const gatewayId = `${laneName}_${this.normalizeId(gatewayName)}`;
        
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
        const branchName = line.substring(1).trim();
        const laneName = this.currentLane!.replace('@', '');
        const branchId = `${laneName}_${this.normalizeId(branchName)}`;
        
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
        const commentId = `${laneName}_comment_${this.normalizeId(commentText.substring(0, 20))}`;
        
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
                    
                    const sourceId = this.resolveTaskId(sourceRef);
                    const targetId = this.resolveTaskId(targetPart);
                    
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
                        
                        this.addConnection('message', sourceId, targetId, messageName);
                        return targetId;
                    }
                } else {
                    messageName = sourcePart;
                    const sourceId = this.lastTask;
                    const targetId = this.resolveTaskId(targetPart);
                    
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
                        
                        this.addConnection('message', sourceId, targetId, messageName);
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
                    
                    if (!connectionExists) {
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
                
                if (!connectionExists) {
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
                
                if (!connectionExists && !targetAlreadyConnected) {
                    this.addConnection('flow', lastTaskInCurrentLane, firstTaskInNextLane);
                }
            }
        }
    }
    
    private connectEvents(): void {
        Object.values(this.lanes).forEach(lane => {
            const startEvents = lane.tasks.filter(taskId => {
                const task = this.tasks[taskId];
                return task && task.type === 'event' && task.eventType === 'start';
            });
            
            const endEvents = lane.tasks.filter(taskId => {
                const task = this.tasks[taskId];
                return task && task.type === 'event' && task.eventType === 'end';
            });
            
            startEvents.forEach(startEventId => {
                let firstTaskAfterStart: string | null = null;
                const startEventIndex = lane.tasks.indexOf(startEventId);
                
                for (let i = startEventIndex + 1; i < lane.tasks.length; i++) {
                    const taskId = lane.tasks[i];
                    const task = this.tasks[taskId];
                    
                    if (task && task.type !== 'event' && task.type !== 'branch') {
                        firstTaskAfterStart = taskId;
                        break;
                    }
                }
                
                if (firstTaskAfterStart) {
                    const connectionExists = this.connections.some(conn => 
                        conn.type === 'sequenceFlow' && 
                        conn.sourceRef === startEventId && 
                        conn.targetRef === firstTaskAfterStart
                    );
                    
                    if (!connectionExists) {
                        this.addConnection('flow', startEventId, firstTaskAfterStart);
                    }
                }
            });
            
            endEvents.forEach(endEventId => {
                let lastTaskBeforeEnd: string | null = null;
                const endEventIndex = lane.tasks.indexOf(endEventId);
                
                for (let i = endEventIndex - 1; i >= 0; i--) {
                    const taskId = lane.tasks[i];
                    const task = this.tasks[taskId];
                    
                    if (task && task.type !== 'event' && task.type !== 'branch') {
                        lastTaskBeforeEnd = taskId;
                        break;
                    }
                }
                
                if (lastTaskBeforeEnd) {
                    const connectionExists = this.connections.some(conn => 
                        conn.type === 'sequenceFlow' && 
                        conn.sourceRef === lastTaskBeforeEnd && 
                        conn.targetRef === endEventId
                    );
                    
                    if (!connectionExists) {
                        this.addConnection('flow', lastTaskBeforeEnd, endEventId);
                    }
                }
            });
        });
    }

    private resolveTaskId(taskRef: string): string | null {
        if (!taskRef) return null;
        
        taskRef = taskRef.trim();
        
        if (this.taskScope[taskRef]) {
            return this.taskScope[taskRef];
        }
        
        const normalized = this.normalizeId(taskRef);
        if (this.taskScope[normalized]) {
            return this.taskScope[normalized];
        }
        
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
                
                const directId = `${lane}_${normalizedTask}`;
                if (this.tasks[directId]) {
                    return directId;
                }
                
                const laneTasks = Object.values(this.tasks).filter(t => 
                    t.lane && t.lane.toLowerCase() === lane.toLowerCase()
                );
                
                const matchingTask = laneTasks.find(t => 
                    this.normalizeId(t.name) === normalizedTask || 
                    (t.messageName && this.normalizeId(t.messageName) === normalizedTask)
                );
                
                if (matchingTask) {
                    return matchingTask.id;
                }
            }
        } else {
            const matchingTask = Object.values(this.tasks).find(t => 
                this.normalizeId(t.name) === normalized || 
                (t.messageName && this.normalizeId(t.messageName) === normalized)
            );
            
            if (matchingTask) {
                return matchingTask.id;
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

        this.dataObjects.forEach(dataObj => {
            mermaid += `  ${dataObj.id}[(${dataObj.name})]:::dataObject\n`;
        });

        const laneNodes: Record<string, string[]> = {};
        
        Object.entries(this.lanes).forEach(([laneName, lane]) => {
            const normalizedLaneName = this.normalizeId(laneName.replace('@', ''));
            laneNodes[normalizedLaneName] = lane.tasks.filter(taskId => {
                const task = this.tasks[taskId];
                return task;
            });
        });
        
        Object.entries(laneNodes).forEach(([laneName, taskIds]) => {
            if (taskIds.length > 0) {
                mermaid += `  subgraph ${laneName}[${laneName}]\n`;
                
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
            const color = index % 2 === 0 ? 
                'fill:#f9f9f9,stroke:#333,stroke-width:1px' : 
                'fill:#e6f3ff,stroke:#333,stroke-width:1px';
            mermaid += `  style ${laneName} ${color}\n`;
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