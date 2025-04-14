/**
 * AST structure for BPMN-lite DSL
 */

export interface BpmnDocument {
  processes: Process[];
  comments: Comment[];
}

export interface Process {
  id: string;            // Generated unique ID
  name: string;          // Process name from :Process Name
  lanes: Lane[];         // Lanes in this process
  messageFlows: MessageFlow[];  // Cross-lane message flows
  dataObjects: DataObject[];    // Data objects
  dataStores: DataStore[];      // Data stores
  defaultStartEvent?: Event;    // Implicit or explicit start event
  defaultEndEvent?: Event;      // Implicit or explicit end event
}

export interface Lane {
  id: string;           // Generated unique ID
  name: string;         // Lane name from @Lane Name
  process: string;      // Reference to parent process ID
  elements: ProcessElement[];  // Ordered elements in this lane
}

export type ProcessElement = 
  | Task 
  | Gateway 
  | Event 
  | Subprocess 
  | DataObject 
  | DataStore;

export interface BaseElement {
  id: string;           // Generated unique ID
  name: string;         // Element name/label
  lane: string;         // Reference to containing lane ID
  incoming: string[];   // IDs of elements with flows to this element
  outgoing: string[];   // IDs of elements with flows from this element
  type: string;         // Type of element ('task', 'gateway', 'event', 'subprocess', 'dataObject', 'dataStore')
}

export interface Task extends BaseElement {
  type: 'task';
  isMessageSender?: boolean;    // For send: tasks
  isMessageReceiver?: boolean;  // For receive: tasks
  messageName?: string;         // For message tasks
  boundaryEvents?: Event[];     // For boundary events
}

export interface Subprocess extends BaseElement {
  type: 'subprocess';
  processRef: string;    // Reference to subprocess definition
  isExpanded: boolean;   // For [subprocess]+ expanded notation
}

export interface Comment {
  id: string;
  text: string;
  attachedTo?: string;   // ID of element comment is attached to
  type: 'diagramComment' | 'technicalComment';  // " vs //
}

export interface Gateway extends BaseElement {
  type: 'gateway';
  gatewayType: 'xor' | 'and' | 'or' | 'complex';
  branches: GatewayBranch[];
  isJoin: boolean;      // Is this a joining gateway?
  isSplit: boolean;     // Is this a splitting gateway?
  isImplicit: boolean;  // For automatic gateways
}

export interface GatewayBranch {
  id: string;
  label?: string;        // Branch label (from +|label| syntax)
  condition?: string;    // Condition text
  target: string;        // ID of target element
  branchType: 'positive' | 'negative' | 'parallel' | 'inclusive';  // +, -, =, ~
}

export interface Flow {
  id: string;
  sourceRef: string;     // ID of source element
  targetRef: string;     // ID of target element
  condition?: string;    // Optional condition
  type: 'sequence' | 'message' | 'data';  // Flow type
}

export interface Event extends BaseElement {
  type: 'event';
  eventType: 'start' | 'intermediate' | 'end' | 'boundary';
  eventDefinition: 'none' | 'message' | 'timer' | 'error' | 'signal' | 'compensation' | 'conditional' | 'link' | 'escalation' | 'terminate';
  eventAttributes?: Record<string, string>;  // For timer durations, etc.
}

export interface MessageFlow {
  id: string;
  name?: string;
  sourceRef: string;     // ID of source element/lane
  targetRef: string;     // ID of target element/lane
}

export interface DataObject extends BaseElement {
  type: 'dataObject';
  isInput: boolean;      // Is this input to connected tasks?
  isOutput: boolean;     // Is this output from connected tasks?
}

export interface DataStore extends BaseElement {
  type: 'dataStore';
  isInput: boolean;      // Is this input to connected tasks?
  isOutput: boolean;     // Is this output from connected tasks?
}