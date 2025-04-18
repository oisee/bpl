# BPMN-lite DSL Parser and Editor

A minimal, intuitive domain-specific language for describing business process diagrams that can be parsed into an Abstract Syntax Tree (AST) and rendered to Mermaid flowcharts.

## Features

- Whitespace-insensitive parsing
- Line type detection by first non-whitespace character
- Support for connections with -> and <- operators
- Name resolution from local to wider scope
- Normalized node IDs
- Sequential connectivity within and across lanes
- Gateway branches with custom labels
- Message flows between send/receive tasks
- Data objects and associations
- Process and lane definitions
- Comments and annotations
- AST preview for debugging

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

Tasks are automatically connected in sequence within the same lane and across lanes.

Specialized tasks for sending and receiving messages:

```
  send: Payment Information
  receive: Order Confirmation
```

Explicit connections can be made using `->`:

```
  task A -> task C  // Creates direct flow from A to C
  task A -> task C -> task E  // Creates direct flow from A to C to E
```

Reverse connections can be made using `<-`:

```
  task C <- task A  // Creates flow from A to C
```

### Gateways

#### XOR Gateways (Exclusive Decision)

```
?Decision Point
  +yes path
  -no path
next task  // Implicit join - first non-branch task
```

For custom branch labels:

```
?Payment Method
  +|Credit Card| process credit card
  +|Bank Transfer| process bank transfer
  -|Cancel| cancel order
next task
```

### Message Flows

Connect send and receive tasks with the same message name:

```
@Customer
  send: Payment Information
  
@System
  receive: Payment Information
```

Or explicitly define message flows:

```
^MessageName @SourceLane.source task -> @TargetLane.target task
```

### Data Objects

```
#OrderData place order
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
    +post payment
    -stop order processing
  ship order
  send: Order Confirmation

^Order @Customer.place order -> @System.process order
#OrderData place order
```

## Complex Example

```
:Online Shopping Process
@Customer
  browse catalog
  add items to cart
  checkout
  send: Shipping Address
  send: Payment Information
  "Waiting for confirmation
  receive: Order Tracking Details
  track shipment
  receive: Delivery Notification
  confirm receipt
@OrderSystem
  display products
  manage cart
  process checkout
  receive: Shipping Address
  receive: Payment Information
  validate payment
  ?Payment successful
    +process order
    -send: Payment Failed
  reserve inventory
  generate invoice
  send: Order Tracking Details
@Warehouse
  receive: Order Request
  check inventory
  pick items
  pack order
  ?Express shipping
    +priority handling
    -standard handling
  ship package
  send: Tracking Information
  send: Delivery Notification
@Finance
  receive: Order Details
  record transaction
  process refunds
  generate reports

// Explicit message flows with labels
^CustomerCart @Customer.add items to cart -> @OrderSystem.manage cart
^ShippingInfo @Customer.checkout -> @OrderSystem.process checkout
^OrderRequest @OrderSystem.process order -> @Warehouse.receive: Order Request
^PaymentRecord @OrderSystem.validate payment -> @Finance.receive: Order Details
^DeliveryInfo @Warehouse.ship package -> @Customer.track shipment
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.