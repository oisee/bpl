# BPMN-lite Parser Development Context

## Project Evolution

### Initial State
- Started with a basic HTML file containing a rudimentary BPMN-lite parser
- Parser had limited functionality and rendering capabilities
- No proper handling of complex elements like gateways and message flows

### Major Enhancements

1. **Core Parser Improvements (v1.0-1.2)**
   - Implemented a robust BpmnLiteParser class with proper DSL parsing
   - Added support for processes, lanes, tasks, gateways, branches
   - Implemented proper gateway branching logic with Yes/No connections
   - Added comments and data objects support
   - Fixed task connectivity within lanes

2. **Message and Event Handling (v1.3-1.5)**
   - Added support for explicit message flows with ^Message prefix
   - Implemented event handling with !start and !end notations
   - Created a dedicated messages array in the AST
   - Fixed cross-lane connectivity
   - Enhanced task resolution logic to handle complex references

3. **Visualization Enhancements (v2.0+)**
   - Integrated Mermaid.js library for proper diagram rendering
   - Implemented live diagram updates on editor changes
   - Added panning and zooming capabilities
   - Enhanced diagram styling and readability
   - Added user instructions for diagram navigation

## Key Features Implemented

### Parser Capabilities
- Whitespace-insensitive parsing
- Line type detection by first non-whitespace character 
- Support for connections with -> and <- operators
- Name resolution from local to wider scope
- Normalized node IDs
- Gateway branches with custom labels
- Events (start, end)
- Advanced task resolution logic

### Entity Types
- Processes: `:Process Name`
- Lanes: `@Lane Name`
- Tasks: Regular text lines under lanes
- Message tasks: `send:` and `receive:` prefixes
- Gateways: `?Gateway`
- Gateway branches: `+positive` and `-negative`
- Data objects: `#DataObject task`
- Message flows: `^MessageName source -> target`
- Comments: `"Comment text`
- Events: `!start` and `!end`

### AST Structure
- Hierarchical representation with processes, lanes, and elements
- Dedicated sections for connections, data objects, and messages
- Properly typed entities with unique IDs and references

### Visualization
- Dynamic Mermaid syntax generation
- Live diagram rendering
- Interactive zoom and pan controls
- Different node styles for different entity types
- Proper connection styling (sequence, message, data)
- Subgraphs for lanes/pools

## Planned Improvements
See the separate file `improvements_plan.md` for detailed future enhancements.

## Technical Implementation

### Core Components
- `BpmnLiteParser` class: Main parsing and processing logic
- AST construction: Converts DSL to structured object
- Mermaid renderer: Generates diagram syntax from AST
- Interactive editor: Live updates with the diagram

### Key Methods
- `parse()`: Main entry point for DSL processing
- `processLinePart()`: Routes lines to appropriate handlers
- `resolveTaskId()`: Advanced reference resolution
- `connectSequentialTasks()`: Auto-connects tasks in order
- `connectAcrossLanes()`: Handles cross-lane connections
- `connectEvents()`: Special handling for event connections
- `toMermaid()`: Generates Mermaid diagram syntax

## Sample DSL
```
:Order Process

@Customer
  place order
  send: Payment Information
  "Customer waits for confirmation
  receive: Order Confirmation

@System
  receive: Payment Information
  process order
  validate payment
  ?Payment successful
    +post payment
    -stop order processing
  ship order
  send: Order Confirmation

^Order @Customer.place order -> @System.process order
#OrderData place order
```

## Current Version
v2.1.0 - Features live diagram rendering with pan & zoom capabilities