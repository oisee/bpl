# Implementation Plan for BPMN-lite DSL Parser and Editor

## Objective
Create a robust parser for BPMN-lite DSL that generates an Abstract Syntax Tree (AST) and renders to Mermaid flowcharts.

## Completed Features
- **Whitespace-insensitive parsing**: Lines are trimmed and processed regardless of indentation.
- **Line type detection**: First non-whitespace character determines the line type.
- **Support for connections**: Handles -> and <- operators for explicit connections.
- **Name resolution**: Resolves references from local to wider scope.
- **Normalized node IDs**: Consistent ID generation for all elements.
- **Cross-lane connectivity**: Automatically connects tasks across lanes.
- **Gateway branches**: Processes XOR gateways with positive/negative branches.
- **Custom branch labels**: Supports custom labels for gateway branches.
- **Message flows**: Connects send/receive tasks and supports explicit labeled message connections (^Message source -> target).
- **Data objects**: Handles data objects and their associations.
- **Comments**: Processes both visible and hidden comments.

## Core Implementation
- **BpmnLiteParser Class**: Implemented in JavaScript, with methods for:
  - `parse()`: Main method to convert DSL text to AST
  - `connectSequentialTasks()`: Handles automatic task sequence connections
  - `connectAcrossLanes()`: Connects tasks across different lanes
  - `toMermaid()`: Converts the AST to Mermaid flowchart syntax

## AST Structure
The AST is structured as follows:
```javascript
{
  type: 'bpmnModel',
  processes: [
    {
      type: 'process',
      name: 'Process Name',
      id: 'process_name',
      lanes: [
        {
          type: 'lane',
          name: 'Lane Name',
          id: 'lane_name',
          elements: [/* Tasks, Gateways, etc. */]
        }
      ]
    }
  ],
  connections: [/* Flow, Message, and Data connections */],
  dataObjects: [/* Data objects */]
}
```

## Parser Methods
- **processLinePart**: Determines line type and routes to appropriate parser
- **parseProcess**: Handles process definitions (`:Process`)
- **parseLane**: Handles lane definitions (`@Lane`)
- **parseTask**: Handles regular tasks and specialized tasks
- **parseGateway**: Handles gateway definitions (`?Gateway`)
- **parseGatewayBranch**: Handles positive/negative branches (`+branch`, `-branch`)
- **parseComment**: Handles comment lines (`"Comment`)
- **parseConnection**: Handles message flow connections (`^Message`)
- **parseDataObject**: Handles data object definitions (`#Data`)

## Mermaid Output Implementation
- **Node styling**: Uses CSS classes for different node types
- **Subgraphs**: Creates lane subgraphs with appropriate styling
- **Connection types**: Differentiates between sequence flows, message flows, and data associations
- **Gateway labeling**: Adds labels to gateway connections based on branch type

## Current Status
All features have been implemented and tested, with a working demo available through the web interface.

## Future Enhancements
- **Additional Gateway Types**: Implement parallel (AND) and inclusive (OR) gateways
- **Events**: Add support for start, end, intermediate, and boundary events
- **Export Options**: Add ability to export to other formats (BPMN XML, SVG)
- **Validation**: Implement syntax validation and error reporting
- **Layout Optimization**: Improve automatic layout of complex diagrams