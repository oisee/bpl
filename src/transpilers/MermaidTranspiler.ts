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
  BaseElement
} from '../types/ast.js';

/**
 * Interface for all transpilers
 */
export interface ITranspiler {
  transpile(ast: BpmnDocument): string;
  getOutputFormat(): string;
  supportsDynamicPreview(): boolean;
}

/**
 * Transpiler for Mermaid syntax
 */
export class MermaidTranspiler implements ITranspiler {
  /**
   * Transpile a BPMN document to Mermaid syntax
   * @param ast The AST to transpile
   * @returns Mermaid syntax
   */
  transpile(ast: BpmnDocument): string {
    let mermaidCode = 'graph TD\n';
    
    // Process each process in the document
    for (const process of ast.processes) {
      mermaidCode += this.transpileProcess(process);
    }
    
    // Add diagram comments
    for (const comment of ast.comments) {
      if (comment.type === 'diagramComment') {
        mermaidCode += `    comment_${comment.id}[${comment.text}]\n`;
      }
    }
    
    return mermaidCode;
  }
  
  /**
   * Transpile a process to Mermaid syntax
   * @param process The process to transpile
   * @returns Mermaid syntax
   */
  private transpileProcess(process: Process): string {
    let mermaidCode = '';
    
    // Add process title as a subgraph if supported in target mermaid version
    mermaidCode += `    %% Process: ${process.name}\n`;
    
    // Add lanes as subgraphs
    for (const lane of process.lanes) {
      mermaidCode += this.transpileLane(lane);
    }
    
    // Add implicit start/end events if needed
    if (process.defaultStartEvent) {
      mermaidCode += this.transpileEvent(process.defaultStartEvent);
    }
    
    if (process.defaultEndEvent) {
      mermaidCode += this.transpileEvent(process.defaultEndEvent);
    }
    
    // Add sequence flows
    for (const lane of process.lanes) {
      for (const element of lane.elements) {
        mermaidCode += this.transpileFlows(element);
      }
    }
    
    // Add message flows
    for (const messageFlow of process.messageFlows) {
      mermaidCode += `    %% Message Flow: ${messageFlow.name || 'unnamed'}\n`;
      mermaidCode += `    ${messageFlow.sourceRef} -.-> |${messageFlow.name || 'message'}| ${messageFlow.targetRef}\n`;
    }
    
    // Add data objects
    for (const dataObject of process.dataObjects) {
      mermaidCode += this.transpileDataObject(dataObject);
    }
    
    // Add data stores
    for (const dataStore of process.dataStores) {
      mermaidCode += this.transpileDataStore(dataStore);
    }
    
    return mermaidCode;
  }
  
  /**
   * Transpile a lane to Mermaid syntax
   * @param lane The lane to transpile
   * @returns Mermaid syntax
   */
  private transpileLane(lane: Lane): string {
    let mermaidCode = '';
    
    // Add lane title as a subgraph if supported in target mermaid version
    mermaidCode += `    %% Lane: ${lane.name}\n`;
    
    // Add elements in the lane
    for (const element of lane.elements) {
      if (element.type === 'task') {
        mermaidCode += this.transpileTask(element as Task);
      } else if (element.type === 'gateway') {
        mermaidCode += this.transpileGateway(element as Gateway);
      } else if (element.type === 'event') {
        mermaidCode += this.transpileEvent(element as Event);
      } else if (element.type === 'subprocess') {
        mermaidCode += this.transpileSubprocess(element as Subprocess);
      }
    }
    
    return mermaidCode;
  }
  
  /**
   * Transpile a task to Mermaid syntax
   * @param task The task to transpile
   * @returns Mermaid syntax
   */
  private transpileTask(task: Task): string {
    let taskLabel = task.name;
    
    // Add message sender/receiver indicator
    if (task.isMessageSender) {
      taskLabel = `Send: ${task.messageName || task.name}`;
    } else if (task.isMessageReceiver) {
      taskLabel = `Receive: ${task.messageName || task.name}`;
    }
    
    return `    ${task.id}[${taskLabel}]\n`;
  }
  
  /**
   * Transpile a gateway to Mermaid syntax
   * @param gateway The gateway to transpile
   * @returns Mermaid syntax
   */
  private transpileGateway(gateway: Gateway): string {
    let mermaidCode = '';
    
    // Different shapes for different gateway types
    if (gateway.gatewayType === 'xor') {
      mermaidCode += `    ${gateway.id}{${gateway.name || 'XOR'}}\n`;
    } else if (gateway.gatewayType === 'and') {
      mermaidCode += `    ${gateway.id}{{${gateway.name || 'AND'}}}\n`;
    } else if (gateway.gatewayType === 'or') {
      mermaidCode += `    ${gateway.id}{${gateway.name || 'OR'}}\n`;
    }
    
    return mermaidCode;
  }
  
  /**
   * Transpile an event to Mermaid syntax
   * @param event The event to transpile
   * @returns Mermaid syntax
   */
  private transpileEvent(event: Event): string {
    let eventLabel = event.name;
    
    // Add event type indicator
    if (event.eventType === 'start') {
      eventLabel = `Start: ${event.name}`;
      return `    ${event.id}([${eventLabel}])\n`;
    } else if (event.eventType === 'end') {
      eventLabel = `End: ${event.name}`;
      return `    ${event.id}([${eventLabel}])\n`;
    } else {
      // Intermediate or boundary event
      return `    ${event.id}((${eventLabel}))\n`;
    }
  }
  
  /**
   * Transpile a subprocess to Mermaid syntax
   * @param subprocess The subprocess to transpile
   * @returns Mermaid syntax
   */
  private transpileSubprocess(subprocess: Subprocess): string {
    return `    ${subprocess.id}[[${subprocess.name}]]\n`;
  }
  
  /**
   * Transpile a data object to Mermaid syntax
   * @param dataObject The data object to transpile
   * @returns Mermaid syntax
   */
  private transpileDataObject(dataObject: DataObject): string {
    return `    ${dataObject.id}[(${dataObject.name})]\n`;
  }
  
  /**
   * Transpile a data store to Mermaid syntax
   * @param dataStore The data store to transpile
   * @returns Mermaid syntax
   */
  private transpileDataStore(dataStore: DataStore): string {
    return `    ${dataStore.id}[(${dataStore.name})]\n`;
  }
  
  /**
   * Transpile flows from an element to Mermaid syntax
   * @param element The element to transpile flows from
   * @returns Mermaid syntax
   */
  private transpileFlows(element: BaseElement): string {
    let mermaidCode = '';
    
    // Add outgoing flows
    for (const targetId of element.outgoing) {
      mermaidCode += `    ${element.id} --> ${targetId}\n`;
    }
    
    // Add special flows for gateways
    if (element.type === 'gateway') {
      const gateway = element as Gateway;
      
      for (const branch of gateway.branches) {
        mermaidCode += `    ${gateway.id} -->|${branch.label || ''}| ${branch.target}\n`;
      }
    }
    
    return mermaidCode;
  }
  
  /**
   * Get the output format of this transpiler
   * @returns The output format
   */
  getOutputFormat(): string {
    return 'mermaid';
  }
  
  /**
   * Check if this transpiler supports dynamic preview
   * @returns True if dynamic preview is supported
   */
  supportsDynamicPreview(): boolean {
    return true;
  }
}