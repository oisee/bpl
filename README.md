# BPMN-lite DSL Parser and Editor

A minimal, intuitive domain-specific language for describing business process diagrams that can be parsed into an Abstract Syntax Tree (AST) and rendered to Mermaid flowcharts. Now with support for exporting to Visio-compatible Excel format.

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
- Save & export functionality:
  - Export to .bpl files (source code)
  - Export to .json files (AST)
  - Export to .mmd files (Mermaid diagram)
  - Export to .xlsx files (Visio-compatible format)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Python 3.6+ (required only for Visio export functionality)
  - pandas
  - openpyxl
  - numpy

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. For Visio export functionality, install Python dependencies:

```bash
cd tools
pip install -r requirements.txt
cd ..
```

4. Build the project:

```bash
npm run build
```

5. Start the development server:

```bash
npm start
```

This will open the editor in your default browser.

### Building from Source

For a complete build process:

1. Ensure Node.js and npm are installed
2. Install project dependencies:
   ```bash
   npm install
   ```

3. Install Python dependencies for Visio export:
   ```bash
   pip install pandas openpyxl numpy
   ```

4. Run the build script:
   ```bash
   npm run build
   ```
   
   This build process:
   - Creates the `dist` directory
   - Copies the HTML files from `src` to `dist`
   - Copies the Python export tools to `dist/tools`
   - Creates a server-helper.js file for server-side integration
   - Copies sample files to `dist/samples`

5. The compiled application will be available in the `dist` directory
6. To test the application, run:
   ```bash
   npm start
   ```

### Docker Build (Optional)

For containerized deployment:

1. Build the Docker image:
   ```bash
   docker build -t bpmn-lite-dsl .
   ```

2. Run the container:
   ```bash
   docker run -p 8080:8080 bpmn-lite-dsl
   ```

3. Access the application at http://localhost:8080

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

## Exporting to Visio

The BPL editor provides functionality to export business process diagrams to Visio-compatible Excel format. This allows for further refinement and professional visualization in Microsoft Visio.

### Export Process:

1. Create your business process diagram in the BPL editor
2. Click the "Save .json" button to export the AST
3. Click the "Save .xlsx" button to generate a Visio-compatible Excel file
4. Import the Excel file into Visio:
   - Open Visio and create a new BPMN diagram
   - Select "Data" > "Link Data to Shapes"
   - Browse for your exported Excel file
   - Map columns to Visio shape properties
   - Complete the import wizard

### Python Tool

The Visio export functionality is powered by a Python script (`tools/ast_to_visio.py`) that converts the AST JSON to Excel format. For server-side integration, you can use the provided NodeJS helper:

```javascript
const { convertAstToVisio } = require('./server-helper');

// Convert AST to Excel
const success = convertAstToVisio('input.json', 'output.xlsx');
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---