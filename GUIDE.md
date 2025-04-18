# BPMN-lite DSL Parser and Editor - User Guide

This guide will help you understand and use the BPMN-lite DSL Parser and Editor.

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd bpmn-lite-dsl-editor
```

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

## Editor Interface

The editor interface consists of two main panels:

- **Left Panel**: The code editor where you write your BPMN-lite DSL code.
- **Right Panel**: The preview panel with tabs for:
  - **Diagram**: Displays the rendered Mermaid flowchart
  - **AST**: Shows the Abstract Syntax Tree in JSON format
  - **Mermaid Code**: Shows the generated Mermaid syntax

## Features

### DSL Parser Capabilities

- **Whitespace insensitivity**: Indentation and spacing don't affect parsing
- **Cross-lane connectivity**: Tasks automatically connect across lanes
- **Message flows**: Automatic connection between matching send/receive tasks
- **Gateway branches**: Support for decision points with customizable labels
- **Data objects**: Connect data to relevant tasks
- **Comments**: Add notes visible in the diagram

### Creating a Process Diagram

1. Define the process with `:Process Name`
2. Create lanes with `@Lane Name`
3. Add tasks under each lane as simple text lines
4. Add gateways with `?Gateway Name` followed by branches:
   - Positive branches: `+branch name` 
   - Negative branches: `-branch name`
   - Custom labels: `+|Custom Label| branch name`
5. Add message flows with `send:` and `receive:` prefixes
6. Add data objects with `#DataName task`
7. Add comments with `"This is a comment`

## Examples

### Basic Order Process

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

#OrderData place order
```

### Complex Online Shopping Process

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
```

## Viewing and Debugging

- Use the "Parse DSL" button to update the AST
- Use the "Render Diagram" button to update the Mermaid diagram
- Switch between tabs to inspect different aspects of your diagram
- If the diagram doesn't render correctly, check the AST for incorrect connections

## Tips and Best Practices

1. Define all lanes before adding tasks
2. Keep related tasks in the same lane
3. Place gateways and their branches together
4. Use custom labels for clarity in complex decision points
5. Match send/receive task names exactly for automatic message flows
6. Use explicit connections (`->`) for non-standard flows

## Troubleshooting

If you encounter issues:

1. Check your syntax for typos or missing characters
2. Verify gateway branches have the correct prefix (`+` or `-`)
3. Ensure message names match exactly between send/receive tasks
4. Check the console for any JavaScript errors
5. Examine the AST to understand how the parser interpreted your DSL

For more details, see the [README.md](README.md) for full syntax reference.