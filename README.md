# BPMN-lite DSL Editor

A minimal, intuitive domain-specific language for describing business process diagrams that can be rendered to both BPMN and Mermaid formats.

## Features

- Text editor for BPMN-lite DSL with syntax highlighting
- Real-time rendering to Mermaid diagrams
- AST preview for debugging
- Modular architecture to support additional backends (DOT, BPMN)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

4. Start the development server:

```bash
npm start
```

This will open the editor in your default browser.

## BPMN-lite DSL Syntax

### Process Definition

```
:Process Name
```

### Lanes/Pools

```
@Lane Name
  task 1
  task 2
```

### Tasks

Simple text lines after lane definition:

```
@Lane Name
  task 1
  task 2
```

Tasks are automatically connected in sequence within the same lane.

Explicit connections can be made using `->`:

```
  task A -> task C  // Creates direct flow from A to C
  task A -> task C -> task E  // Creates direct flow from A to C to E
```

### Gateways

#### XOR Gateways (Exclusive Decision)

```
?Decision Point
  +yes path
  -no path
next task  // Implicit join - first non-branch task
```

For multi-branch decisions:

```
?Payment Method
  +Credit Card
  +PayPal
  +Bank Transfer
  -Fallback / else path
next task  // Implicit join - first non-branch task
```

#### AND Gateways (Parallel)

```
{Parallel Process
  =path 1
  =path 2
}Join Gate
next task
```

#### OR Gateways (Inclusive)

```
{Optional Steps
  ~option 1
  ~option 2
}Choices Complete
next task
```

### Events

```
!start: Begin process
!message: Receive confirmation
!timer: Wait 24 hours [duration: 2d]
!error: Handle timeout
!end: Terminate process
```

### Message Flows

```
^MessageName @SourceLane.source task -> @TargetLane.target task
```

### Data Objects

```
#InputData @ task name
#OutputData @ another task
```

### Data Stores

```
$Database database task
```

### Comments

```
"This is a note that will appear in the diagram
// This comment won't appear in the diagram
```

## Example

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
    +yes
    -no
  ship order
  send: Order Confirmation

^Order @Customer.place order -> @System.process order
#OrderData place order
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.