# BPMN-Lite (BPL) Language Guidelines

## Table of Contents
1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Syntax Reference](#syntax-reference)
4. [Best Practices](#best-practices)
5. [Advanced Features](#advanced-features)
6. [Integration Guide](#integration-guide)

## Introduction

BPMN-Lite (BPL) is a human-readable, AI-friendly domain-specific language for creating business process diagrams. It bridges the gap between natural language process descriptions and formal BPMN diagrams.

### Why BPMN-Lite?

- **Human-Readable**: Write processes as you would describe them
- **AI-Friendly**: Perfect for LLMs to generate and understand
- **Minimal Syntax**: Focus on the process, not the markup
- **Full BPMN Power**: Supports lanes, gateways, events, and messages
- **Tool Integration**: Export to BPMN, Mermaid, Visio, and more

## Core Concepts

### 1. Processes
Every BPL file starts with a process definition:
```bpl
:Process Name
```

### 2. Lanes (Participants)
Lanes represent different actors or systems:
```bpl
@Customer
@System
@Payment Gateway
```

### 3. Tasks
Simple activities within a lane:
```bpl
@Customer
  browse products
  add to cart
  checkout
```

### 4. Events
Mark the start, end, or intermediate points:
```bpl
@Customer
  !Start
  place order
  !Order Placed
  wait for delivery
  !End
```

#### End Event Variations
All End event formats map to the same terminal event:
```bpl
@Payment Gateway
  ?Payment Valid
    +process payment
    +!End        // Standard end
    -reject payment
    -!End        // Also maps to same end event
```

**Smart End Event Handling:**
- `!End` - Standard end event
- `+!End` - Positive branch to end (becomes gateway → end with "Yes" label)
- `-!End` - Negative branch to end (becomes gateway → end with "No" label)
- Auto-injects connection breaks (`---`) after end events to prevent cross-lane flow

### 5. Gateways
Decision points in your process:
```bpl
?Payment Valid
  +process payment
  +send confirmation
  -cancel order
  -send failure notice
```

### 6. Messages
Communication between lanes:
```bpl
@Customer
  send: Order Details
  receive: Order Confirmation

@System
  receive: Order Details
  send: Order Confirmation
```

## Syntax Reference

### Basic Elements

| Element | Syntax | Example |
|---------|--------|---------|
| Process | `:Name` | `:Order Process` |
| Lane | `@Name` | `@Customer` |
| Task | `task name` | `validate payment` |
| Start Event | `!Start` | `!Start` |
| End Event | `!End` | `!End` |
| Intermediate Event | `!Name` | `!Payment Received` |
| Gateway | `?Question` | `?Is Valid?` |
| Positive Branch | `+task` | `+approve` |
| Negative Branch | `-task` | `-reject` |
| Send Task | `send: Message` | `send: Invoice` |
| Receive Task | `receive: Message` | `receive: Payment` |
| Comment | `"Text` | `"Wait for approval` |
| Data Object | `#Name ref` | `#OrderData order` |

### Advanced Elements

#### Explicit Message Flows
```bpl
^MessageName @Source.task -> @Target.task
```

#### Connection Breaks
Use `---` to prevent automatic connections:
```bpl
@Lane1
  task1
  task2
  ---
  task3  // task2 will NOT connect to task3
```

#### Gateway with Custom Labels
```bpl
?Choose Payment Method
  +|Credit Card| process card payment
  +|PayPal| redirect to paypal
  +|Bank Transfer| show bank details
  -|Cancel| abort transaction
```

#### Technical Comments
Use `//` for comments that won't appear in the diagram:
```bpl
// This is a technical comment
place order  // This won't show in the diagram
"This will show as a note"
```

## Best Practices

### 1. Process Naming
- Use descriptive, action-oriented names
- Keep it concise but meaningful
- Examples: `:Order Fulfillment`, `:Employee Onboarding`

### 2. Lane Organization
- Order lanes by process flow (top to bottom)
- Group related actors together
- Use consistent naming (all systems together, all human actors together)

### 3. Task Descriptions
- Use active voice and present tense
- Be specific but concise
- Examples: `validate payment`, `send confirmation email`

### 4. Gateway Usage
- Make decision questions clear and binary when possible
- Use custom labels for complex branches
- Always provide at least positive and negative paths

### 5. Message Naming
- Use business terms, not technical jargon
- Be consistent across send/receive pairs
- Include the type of information: `Order Details`, `Payment Confirmation`

### 6. Connection Management
- Let BPL handle automatic connections when possible
- Use `---` breaks only when needed for clarity
- Use explicit message flows for complex cross-lane communication

## Advanced Features

### 1. Parallel Processes
Create parallel flows using gateways:
```bpl
@System
  receive order
  ?Process in parallel
    +send to warehouse
    +charge payment
    +notify customer
```

### 2. Complex Message Patterns
```bpl
// Broadcast pattern
@System
  send: Status Update

@Customer
  receive: Status Update
  
@Manager
  receive: Status Update
  
@Warehouse
  receive: Status Update
```

### 3. Error Handling
```bpl
@Payment System
  process payment
  ?Payment successful
    +record transaction
    +send: Success
    -log error
    -?Retry possible
      +retry payment
      -send: Failure
```

### 4. Subprocess References
```bpl
@HR
  receive application
  // Reference to another process
  :Background Check Process
  evaluate results
```

## Integration Guide

### VSCode Extension
1. Install the BPMN-Lite extension
2. Open any `.bpl` file
3. Preview updates in real-time
4. Export to multiple formats

### Export Options

#### BPMN 2.0 (Camunda)
- Full BPMN XML compatible with Camunda Modeler
- Preserves all elements and connections
- Ready for process automation

#### Mermaid
- Web-friendly diagram format
- Easy to embed in documentation
- Supports all major diagram features

#### SVG/PNG
- High-quality images for presentations
- Customizable DPI for print
- Maintains diagram styling

#### Excel (Visio)
- Import into Microsoft Visio
- Edit in familiar tools
- Share with non-technical stakeholders

### Command Line Usage
```bash
# Parse and validate
bpl-parser validate process.bpl

# Convert to BPMN
bpl-parser convert process.bpl --format bpmn

# Generate Mermaid
bpl-parser convert process.bpl --format mermaid
```

### API Integration
```javascript
const { BpmnLiteParser } = require('bpmn-lite');

const parser = new BpmnLiteParser();
const ast = parser.parse(bplContent);
const mermaid = parser.toMermaid();
const bpmn = parser.toBPMN();
```

## Tips for AI/LLM Usage

When using AI to generate BPL:

1. **Provide Context**: Describe the business domain and key actors
2. **List Requirements**: Specify decision points and message flows
3. **Iterate**: Start simple and add complexity gradually
4. **Validate**: Always review generated processes for business logic

Example prompt:
```
Create a BPL diagram for an e-commerce return process with these actors:
- Customer initiates return
- Customer Service approves/rejects
- Warehouse processes physical return
- Finance issues refund
Include decision points for approval and refund method.
```

## Common Patterns

### Request-Response
```bpl
@Client
  send: Request
  receive: Response
  
@Server
  receive: Request
  process request
  send: Response
```

### Approval Workflow
```bpl
@Requester
  submit request
  receive: Decision
  
@Approver
  receive request
  ?Approve?
    +approve request
    +send: Approved
    -reject request
    -send: Rejected
```

### Retry Pattern
```bpl
@System
  attempt operation
  ?Success?
    +continue
    -?Retry limit reached?
      -fail permanently
      +wait
      +attempt operation
```

## Troubleshooting

### Common Issues

1. **Missing Connections**: Ensure lanes are properly ordered
2. **Orphaned Tasks**: Check for typos in explicit connections
3. **Gateway Errors**: Ensure branches follow immediately after gateway
4. **Message Mismatches**: Verify send/receive pairs have matching names

### Validation Rules

- Every process must have at least one lane
- Gateways must have at least one positive and one negative branch
- Message names must match between send and receive tasks
- Events should be used sparingly and meaningfully

## Future Enhancements

We're continuously improving BPL. Upcoming features:
- Timer events and deadlines
- Subprocess expansion
- Conditional flows
- Loop activities
- Business rule integration

---

For more examples and updates, visit the [BPMN-Lite repository](https://github.com/your-repo/bpmn-lite).