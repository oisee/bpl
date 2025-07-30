      parse(text) {
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
            let prevTaskId = null;
            let prevOperator = null;
            
            for (let j = 0; j < parts.length; j++) {
              const part = parts[j];
              
              // Skip operators
              if (part === '->' || part === '<-') {
                prevOperator = part;
                continue;
              }
              
              // Check if this part needs special handling for cross-lane references
              let taskId = null;
              
              // If we have a previous operator and this might be a reference to another task
              if (prevOperator && !this.isSpecialLine(part)) {
                // Try to resolve it as a task reference first
                taskId = this.resolveTaskId(part, true); // Create if not found
              }
              
              // If not resolved as reference, process normally
              if (!taskId) {
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

        // Automatically connect tasks using the new connectivity engine
        this.connectTasks();

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
      
      splitConnections(line) {
        const parts = [];
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
      
      processLinePart(line, firstChar, lineNumber) {
        // Process based on the first character
        let taskId = null;
        
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
      
      parseEvent(line) {
        const eventName = line.substring(1).trim(); // Remove the ! prefix
        let eventType = 'intermediate';
        let eventId;
        let isProcessLevel = false;
        
        // Determine event type based on common keywords
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
        } else {
          // For non-start/end events, we need a lane
          if (!this.currentLane) {
            // Create a default lane if needed for intermediate events
            this.parseLane('@Default');
          }
          const laneName = this.currentLane.replace('@', '');
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
            lane: isProcessLevel ? null : this.currentLane.replace('@', '') // Process-level events have no lane
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

      ensureProcess(name) {
        if (!this.processes.includes(name)) {
          this.processes.push(name);
          this.currentProcess = name;
        }
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
        this.currentLane = laneName;
        this.lastTask = null; // Reset last task when changing lanes
      }

      parseTask(line) {
        if (!this.currentLane) {
          // Create a default lane if needed
          this.parseLane('@Default');
        }
        
        // Already trimmed the line in the main parse method
        if (!line) return null;
        
        let taskType = 'task';
        let taskName = line;
        let originalName = line; // Keep the original name for display
        
        // Check task type based on prefix
        if (line.startsWith('send:')) {
          taskType = 'send';
          taskName = line.substring(5).trim(); // Extract just the message name
          originalName = `send: ${taskName}`; // Keep the "send:" prefix in display name
        } else if (line.startsWith('receive:')) {
          taskType = 'receive';
          taskName = line.substring(8).trim(); // Extract just the message name
          originalName = `receive: ${taskName}`; // Keep the "receive:" prefix in display name
        }
        
        const laneName = this.currentLane.replace('@', '');
        const normalizedLaneName = this.normalizeId(laneName);
        const taskId = `${normalizedLaneName}_${this.normalizeId(originalName)}`;
        
        this.tasks[taskId] = {
          type: taskType,
          name: originalName, // Use original name with prefix for display
          messageName: taskType === 'send' || taskType === 'receive' ? taskName : null, // Store message name separately
          id: taskId,
          lane: laneName
        };
        
        this.lanes[this.currentLane].tasks.push(taskId);
        
        // Add task to scope for reference in connections
        // Use simplified name without prefixes for lookup
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

      parseGateway(line) {
        if (!this.currentLane) {
          // Create a default lane if needed
          this.parseLane('@Default');
        }
        
        const gatewayName = line.substring(1).trim();
        const laneName = this.currentLane.replace('@', '');
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
        
        this.lanes[this.currentLane].tasks.push(gatewayId);
        
        // Add gateway to scope for reference
        const simpleName = this.normalizeId(gatewayName);
        this.taskScope[simpleName] = gatewayId;
        this.taskScope[`${laneName}.${simpleName}`] = gatewayId;
        this.taskScope[`@${laneName}.${simpleName}`] = gatewayId;
        
        // Push to gateway stack
        this.gatewayStack.push(gatewayId);
        
        return gatewayId;
      }

      parseGatewayBranch(line, branchChar) {
        if (this.gatewayStack.length === 0) {
          // No gateway to attach to
          return null;
        }
        
        const parentGateway = this.gatewayStack[this.gatewayStack.length - 1];
        let branchName = line.substring(1).trim();
        const laneName = this.currentLane.replace('@', '');
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
        
        // Check if this is a special format branch with custom label
        let displayName = branchName;
        let branchLabel = branchChar === '+' ? 'Yes' : 'No';
        
        // Check for custom label format |Label|content
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
        
        // Add branch to parent gateway
        this.tasks[parentGateway].branches.push(branchId);
        
        // Add to lane
        this.lanes[this.currentLane].tasks.push(branchId);
        
        // Add branch to scope for reference
        const simpleName = this.normalizeId(displayName);
        this.taskScope[simpleName] = branchId;
        this.taskScope[`${laneName}.${simpleName}`] = branchId;
        this.taskScope[`@${laneName}.${simpleName}`] = branchId;
        
        // Note: Connections will be added in connectSequentialTasks() to avoid duplicates
        
        return branchId;
      }

      parseComment(line) {
        if (!this.currentLane) {
          // Create a default lane if needed
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
        
        return commentId;
      }

      parseConnection(line) {
        // Format: ^MessageName @Source.task -> @Target.task
        if (line.startsWith('^')) {
          try {
            console.log(`Processing message flow: ${line}`);
            
            // Extract the entire line content after the ^ prefix
            const content = line.substring(1).trim();
            
            // First check for arrow
            let sourcePart, targetPart, messageName, direction;
            
            if (content.includes('->')) {
              [sourcePart, targetPart] = content.split('->').map(s => s.trim());
              direction = 'forward';
            } else if (content.includes('<-')) {
              [targetPart, sourcePart] = content.split('<-').map(s => s.trim());
              direction = 'backward';
            } else {
              // No arrow, assume it's just a message name (old format)
              messageName = content;
              // This is handled differently, return early
              console.log(`Simple message name: ${messageName}`);
              return null;
            }
            
            // Process the source part - first word is the message name if it doesn't contain '@'
            if (sourcePart.includes('@')) {
              // Format is: MessageName @Source.task
              const parts = sourcePart.split(' ');
              messageName = parts[0];
              const sourceRef = parts.slice(1).join(' ');
              console.log(`Complex format - Message: "${messageName}", Source: "${sourceRef}", Target: "${targetPart}"`);
              
              // Resolve source and target
              const sourceId = this.resolveTaskId(sourceRef, false);
              const targetId = this.resolveTaskId(targetPart, false);
              
              if (sourceId && targetId) {
                // Create the message object
                const messageId = `message_${this.normalizeId(messageName)}`;
                
                // Add to messages array if not already there
                if (!this.messages.find(m => m.id === messageId)) {
                  this.messages.push({
                    type: 'message',
                    name: messageName,
                    id: messageId,
                    sourceRef: sourceId,
                    targetRef: targetId
                  });
                  console.log(`Added message: ${messageName} (${messageId})`);
                }
                
                // Check if there's a connection break between these tasks
                const hasBreak = this.hasConnectionBreakBetween(
                  this.taskLineNumbers[sourceId],
                  this.taskLineNumbers[targetId]
                );
                
                if (!hasBreak) {
                  // Create connection in the right direction
                  this.addConnection('message', sourceId, targetId, messageName);
                  console.log(`SUCCESSFULLY added message flow: "${messageName}" from ${sourceId} to ${targetId}`);
                } else {
                  console.log(`Message flow blocked by connection break: "${messageName}" from ${sourceId} to ${targetId}`);
                }
                
                return targetId; // Return the target as the last referenced task
              } else {
                console.error(`Failed to resolve IDs: source="${sourceRef}" (${sourceId || 'null'}), target="${targetPart}" (${targetId || 'null'})`);
              }
            } else {
              // Simple format - source and target are directly provided
              messageName = sourcePart;
              console.log(`Simple format - Message: "${messageName}", Target: "${targetPart}"`);
              
              // Try to find a source (probably the last task)
              const sourceId = this.lastTask;
              const targetId = this.resolveTaskId(targetPart, false);
              
              if (sourceId && targetId) {
                // Create the message object
                const messageId = `message_${this.normalizeId(messageName)}`;
                
                // Add to messages array if not already there
                if (!this.messages.find(m => m.id === messageId)) {
                  this.messages.push({
                    type: 'message',
                    name: messageName,
                    id: messageId,
                    sourceRef: sourceId,
                    targetRef: targetId
                  });
                  console.log(`Added message: ${messageName} (${messageId})`);
                }
                
                this.addConnection('message', sourceId, targetId, messageName);
                console.log(`SUCCESSFULLY added simple message flow: "${messageName}" from ${sourceId} to ${targetId}`);
                return targetId;
              }
            }
          } catch (error) {
            console.error(`Error parsing message flow: ${line}`, error);
          }
        }
        
        return null;
      }

      parseDataObject(line) {
        // Format: #Name task_reference
        try {
          const content = line.substring(1).trim();
          const parts = content.split(' ');
          const name = parts[0];
          const taskRef = parts.slice(1).join(' ');
          
          console.log(`Parsing data object: "${name}", task reference="${taskRef}"`);
          
          const dataObjId = `data_${this.normalizeId(name)}`;
          
          // Create data object even if there's no task reference
          this.dataObjects.push({
            type: 'dataObject',
            name: name,
            id: dataObjId,
            taskRef: taskRef // Store the raw reference
          });
          
          // If task reference can be resolved, create a connection
          if (taskRef) {
            const taskId = this.resolveTaskId(taskRef, false);
            if (taskId) {
              // Create a data association
              this.addConnection('data', dataObjId, taskId);
              console.log(`Added data association from ${dataObjId} to ${taskId}`);
            } else {
              console.log(`Failed to resolve task ID for data object association: "${taskRef}"`);
            }
          }
          
          return dataObjId;
        } catch (error) {
          console.error(`Error parsing data object: ${line}`, error);
          return null;
        }
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

      connectTasks() {
        // Implement the correct connectivity model
        console.log('=== Establishing Connections (New Model) ===');
        
        // Phase 1: Build global task order
        const globalTaskOrder = this.buildGlobalTaskOrder();
        
        // Phase 2: Create implicit sequential connections
        this.createImplicitConnections(globalTaskOrder);
        
        // Phase 3: Process explicit connections from arrows
        this.processExplicitArrowConnections();
        
        // Phase 4: Connect message flows
        this.connectMessageFlows();
        
        // Phase 5: Handle special connections (gateways, events)
        this.handleSpecialConnections(globalTaskOrder);
        
        console.log(`Total connections: ${this.connections.length}`);
      }
      
      buildGlobalTaskOrder() {
        const taskOrder = [];
        const lines = this.originalText.split('\n');
        let currentLane = null;
        
        // Process lines in order to build sequential task list
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Skip breaks, comments, process definitions
          if (line === '---' || line.match(/^-{3,}$/) || line.startsWith('//') || line.startsWith(':')) {
            continue;
          }
          
          // Track lane changes
          if (line.startsWith('@')) {
            currentLane = line;
            continue;
          }
          
          // Find tasks created from this line
          const tasksInLine = this.findTasksCreatedAtLine(i);
          
          // Add non-branch, non-comment tasks to order
          tasksInLine.forEach(taskId => {
            const task = this.tasks[taskId];
            if (task && task.type !== 'branch' && task.type !== 'comment') {
              taskOrder.push({
                id: taskId,
                lineNumber: i,
                lane: task.lane
              });
            }
          });
        }
        
        console.log(`Built global task order: ${taskOrder.length} tasks`);
        return taskOrder;
      }
      
      findTasksCreatedAtLine(lineNumber) {
        const tasks = [];
        for (const [taskId, line] of Object.entries(this.taskLineNumbers)) {
          if (line === lineNumber) {
            tasks.push(taskId);
          }
        }
        return tasks;
      }
      
      createImplicitConnections(globalTaskOrder) {
        console.log('Creating implicit sequential connections...');
        let count = 0;
        
        for (let i = 1; i < globalTaskOrder.length; i++) {
          const prev = globalTaskOrder[i - 1];
          const curr = globalTaskOrder[i];
          
          // Check for connection break
          if (this.hasConnectionBreakBetween(prev.lineNumber, curr.lineNumber)) {
            console.log(`Break between ${prev.id} and ${curr.id}`);
            continue;
          }
          
          // Create implicit connection
          this.addConnection('flow', prev.id, curr.id);
          count++;
        }
        
        console.log(`Created ${count} implicit connections`);
      }
      
      processExplicitArrowConnections() {
        console.log('Processing explicit arrow connections...');
        let count = 0;
        
        // Process each line looking for arrows
        const lines = this.originalText.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || !line.includes('->') && !line.includes('<-')) continue;
          
          // Parse arrow connections in this line
          const connections = this.parseArrowConnections(line, i);
          
          connections.forEach(conn => {
            this.addConnection('flow', conn.from, conn.to);
            count++;
            console.log(`Explicit: ${conn.from} -> ${conn.to}`);
          });
        }
        
        console.log(`Created ${count} explicit connections`);
      }
      
      parseArrowConnections(line, lineNumber) {
        const connections = [];
        const parts = this.splitConnections(line);
        
        // Track what each part resolves to
        const resolvedParts = [];
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          
          if (part === '->' || part === '<-') {
            resolvedParts.push({ type: 'arrow', value: part });
          } else {
            // Resolve this part to task ID(s)
            const taskId = this.resolvePartToTaskId(part, lineNumber);
            if (taskId) {
              resolvedParts.push({ type: 'task', value: taskId });
            }
          }
        }
        
        // Now create connections based on arrows
        for (let i = 0; i < resolvedParts.length; i++) {
          const curr = resolvedParts[i];
          
          if (curr.type === 'arrow') {
            const prev = i > 0 ? resolvedParts[i - 1] : null;
            const next = i < resolvedParts.length - 1 ? resolvedParts[i + 1] : null;
            
            if (curr.value === '->') {
              if (prev && prev.type === 'task' && next && next.type === 'task') {
                connections.push({ from: prev.value, to: next.value });
              }
            } else if (curr.value === '<-') {
              if (prev && prev.type === 'task' && next && next.type === 'task') {
                connections.push({ from: next.value, to: prev.value });
              }
            }
          }
        }
        
        return connections;
      }
      
      resolvePartToTaskId(part, lineNumber) {
        // First check if this part creates a new task
        const tasksAtLine = this.findTasksCreatedAtLine(lineNumber);
        
        // Try to match by content
        const normalized = this.normalizeId(part);
        
        for (const taskId of tasksAtLine) {
          const task = this.tasks[taskId];
          if (task && (this.normalizeId(task.name) === normalized || 
                      (task.messageName && this.normalizeId(task.messageName) === normalized))) {
            return taskId;
          }
        }
        
        // If not found in current line, resolve as reference
        return this.resolveTaskId(part, false);
      }
      
      connectMessageFlows() {
        // Already implemented in original parser
        const sendTasks = Object.values(this.tasks).filter(task => task.type === 'send');
        const receiveTasks = Object.values(this.tasks).filter(task => task.type === 'receive');
        
        sendTasks.forEach(sendTask => {
          const messageName = sendTask.messageName;
          if (!messageName) return;
          
          const matchingReceive = receiveTasks.find(receiveTask => 
            receiveTask.messageName === messageName
          );
          
          if (matchingReceive) {
            const hasBreak = this.hasConnectionBreakBetween(
              this.taskLineNumbers[sendTask.id],
              this.taskLineNumbers[matchingReceive.id]
            );
            
            if (!hasBreak) {
              // Create message if not exists
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
      }
      
      handleSpecialConnections(globalTaskOrder) {
        // Handle gateways
        Object.values(this.tasks).forEach(task => {
          if (task.type === 'gateway' && task.branches) {
            // Connect gateway to branches
            task.branches.forEach(branchId => {
              this.addConnection('flow', task.id, branchId);
            });
            
            // Find merge point for branches
            const gatewayIndex = globalTaskOrder.findIndex(t => t.id === task.id);
            let mergePoint = null;
            
            // Look for next non-branch task
            for (let i = gatewayIndex + 1; i < globalTaskOrder.length; i++) {
              const candidate = globalTaskOrder[i];
              const candidateTask = this.tasks[candidate.id];
              
              if (candidateTask && candidateTask.type !== 'branch') {
                mergePoint = candidate.id;
                break;
              }
            }
            
            // Connect branches to merge point (unless they have explicit connections)
            if (mergePoint) {
              task.branches.forEach(branchId => {
                // Check if branch already has outgoing connections
                const hasOutgoing = this.connections.some(conn => 
                  conn.sourceRef === branchId && conn.type === 'sequenceFlow'
                );
                
                if (!hasOutgoing) {
                  this.addConnection('flow', branchId, mergePoint);
                }
              });
            }
          }
        });
        
        // Handle Start/End events
        if (this.tasks['process_start'] && globalTaskOrder.length > 0) {
          this.addConnection('flow', 'process_start', globalTaskOrder[0].id);
        }
        
        if (this.tasks['process_end']) {
          // Find tasks with no outgoing connections
          globalTaskOrder.forEach(task => {
            const hasOutgoing = this.connections.some(conn => 
              conn.sourceRef === task.id && conn.type === 'sequenceFlow'
            );
            
            if (!hasOutgoing) {
              this.addConnection('flow', task.id, 'process_end');
            }
          });
        }
      }
      
      connectSequentialTasks() {
        // First build a map of tasks and their sequence
