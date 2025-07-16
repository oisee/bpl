# BPMN-Lite Editor User Guide

This comprehensive guide covers all aspects of using the BPMN-Lite Editor, from basic concepts to advanced features.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Editor Interface](#editor-interface)
3. [DSL Syntax Reference](#dsl-syntax-reference)
4. [Creating Process Diagrams](#creating-process-diagrams)
5. [Advanced Features](#advanced-features)
6. [Export and Import](#export-and-import)
7. [Troubleshooting](#troubleshooting)
8. [Examples](#examples)

## Getting Started

### Installation Options

#### Option 1: Web-based Editor

```bash
git clone <repository-url>
cd bpl
npm install
npm run build
npm run start:web
```

Open http://localhost:8080 in your browser.

#### Option 2: Desktop Application

```bash
npm run build
npm start
```

The Electron app will launch automatically.

#### Option 3: Portable Package (Windows)

```bash
./create-portable.sh
```

Copy the `BPMN-Lite-Editor-Portable` folder to any Windows machine and run `Launch-BPMN-Lite-Editor.bat`.

### First Steps

1. The editor opens with a sample diagram
2. Edit the DSL code in the left panel
3. See live updates in the right panel
4. Switch between Diagram/AST/Mermaid views using tabs

## Editor Interface

### Left Panel - Code Editor

- **Syntax Highlighting**: None (plain text)
- **Live Updates**: Diagram updates as you type (300ms debounce)
- **Keyboard Shortcuts**: Standard text editor shortcuts

### Right Panel - Preview Area

#### Diagram Tab
- Shows the rendered Mermaid flowchart
- Auto-scales to fit the container
- Interactive SVG output

#### AST Tab
- Displays the parsed Abstract Syntax Tree
- JSON format with syntax highlighting
- Useful for debugging parser issues

#### Mermaid Code Tab
- Shows generated Mermaid syntax
- Can be copied for use in other tools
- Includes styling and layout information

### Control Buttons

- **Parse DSL**: Manually trigger parsing
- **Render Diagram**: Manually update diagram
- **Save .bpl**: Export source code
- **Save .json**: Export AST
- **Save .mmd**: Export Mermaid code
- **Save .xlsx**: Export to Excel (Visio-compatible)

## DSL Syntax Reference

### Process Definition

```
:Process Name
```

Defines the overall process. Optional but recommended.

### Lanes/Pools

```
@Department Name
@Customer Service
@IT Support
```

Groups related tasks. Tasks following a lane definition belong to that lane.

### Tasks

#### Basic Task
```
@Sales
  contact customer
  prepare quote
  send proposal
```

#### Message Tasks
```
send: Invoice
receive: Payment
```

#### Events
```
!Start
!End
```

### Gateways (Decision Points)

#### Basic XOR Gateway
```
?Approved
  +continue process
  -reject and notify
```

#### Custom Labels
```
?Payment Method
  +|Credit Card| process card payment
  +|PayPal| process PayPal
  -|Cancel| cancel transaction
```

### Connections

#### Automatic Sequential
Tasks within a lane connect automatically:
```
@HR
  receive application
  screen candidate
  schedule interview
```

#### Explicit Connections
```
task A -> task C  # Skip task B
task D <- task B  # Reverse direction
```

#### Cross-Lane Connections
```
^Application @Candidate.submit -> @HR.receive application
```

### Data Objects
```
#CustomerData contact customer
#OrderDetails prepare quote
```

### Comments
```
"This comment appears in the diagram
// This comment is ignored
```

## Creating Process Diagrams

### Step-by-Step Tutorial

#### 1. Define the Process
```
:Customer Onboarding Process
```

#### 2. Add Participants
```
@Customer
@Sales Team
@Legal Department
@IT Support
```

#### 3. Add Tasks for Each Lane
```
@Customer
  fill application form
  provide documents
  sign contract
  receive credentials

@Sales Team
  review application
  ?Application complete
    +prepare contract
    -request missing info
  send contract
```

#### 4. Add Message Flows
```
@Customer
  send: Application

@Sales Team
  receive: Application
```

#### 5. Add Data Objects
```
#ApplicationData fill application form
#ContractTerms prepare contract
```

### Best Practices

1. **Organize by Lanes**: Group related activities
2. **Use Descriptive Names**: Be specific about actions
3. **Message Naming**: Match send/receive pairs exactly
4. **Gateway Placement**: Put decision logic in the appropriate lane
5. **Comments**: Add context where needed

## Advanced Features

### Complex Gateways

#### Nested Decisions
```
?Initial Check
  +?Detailed Review
    +approve with conditions
    -needs revision
  -reject immediately
```

#### Multiple Branches
```
?Priority Level
  +|High| expedite processing
  +|Medium| normal processing
  +|Low| batch processing
  -|Invalid| return to sender
```

### Message Patterns

#### Request-Response
```
@Client
  send: Request
  receive: Response

@Server
  receive: Request
  process request
  send: Response
```

#### Broadcast
```
@Publisher
  send: Notification

@Subscriber1
  receive: Notification

@Subscriber2
  receive: Notification
```

### Data Flow Patterns

```
#MasterData initialize process
#WorkingCopy task1
#WorkingCopy task2
#FinalData complete process
```

## Export and Import

### Export Formats

#### BPL Format
- Plain text source code
- Human-readable and editable
- Version control friendly

#### JSON (AST) Format
- Complete parse tree
- Programmatic access
- Integration with other tools

#### Mermaid Format
- Standard Mermaid syntax
- Use in documentation
- GitHub/GitLab rendering

#### Excel Format
- Visio-compatible structure
- Columns: ID, Description, Next Steps, etc.
- Named range "Visio_01"

### Importing into Visio

1. Export as .xlsx from editor
2. Open Microsoft Visio
3. Create new BPMN diagram
4. Data → Link Data to Shapes
5. Select your Excel file
6. Map columns:
   - Process Step ID → Shape Text
   - Function → Swimlane
   - Shape Type → Shape Type
7. Auto-layout the diagram

## Troubleshooting

### Common Issues

#### Diagram Not Rendering
- Check for syntax errors in DSL
- Verify lane names match in references
- Ensure message names match exactly

#### Connections Missing
- Tasks must be in defined lanes
- Check task name spelling
- Verify lane references include '@'

#### Excel Export Fails
- Ensure Python is installed
- Check Python dependencies
- Verify write permissions

### Debug Tips

1. **Check AST**: Verify parser interpretation
2. **Console Logs**: Browser DevTools for errors
3. **Mermaid Code**: Check generated syntax
4. **Test Incrementally**: Add elements one by one

## Examples

### Simple Approval Process
```
:Document Approval

@Employee
  submit document
  receive: Feedback
  revise document

@Manager
  receive document
  review content
  ?Approved
    +sign document
    -send: Feedback
```

### Multi-Department Process
```
:Purchase Order Process

@Requester
  identify need
  submit: Purchase Request
  receive: Approval Status

@Purchasing
  receive: Purchase Request
  check budget
  ?Budget Available
    +get quotes
    -reject request
  select vendor
  create: Purchase Order

@Finance
  review order
  ?Amount < $10000
    +auto-approve
    -manual review
  send: Approval Status

@Vendor
  receive: Purchase Order
  deliver goods
  send: Invoice

#PurchaseReq identify need
#PO create: Purchase Order
```

### Complex Service Flow
```
:IT Service Request

@User
  !Start
  report issue
  send: Ticket
  receive: Status Update
  ?Resolved
    +confirm resolution
    -provide more info
  !End

@ServiceDesk
  receive: Ticket
  categorize issue
  ?Type
    +|Hardware| assign to hardware team
    +|Software| assign to software team
    -|Unknown| escalate to manager

@HardwareTeam
  diagnose hardware
  ?Fixable
    +repair device
    -order replacement
  send: Status Update

@SoftwareTeam  
  analyze software issue
  apply fix
  test solution
  send: Status Update

^TicketFlow @User.report issue -> @ServiceDesk.receive: Ticket
#TicketData categorize issue
```

## Tips for Success

1. **Start Simple**: Begin with basic flows, add complexity gradually
2. **Test Often**: Use Parse/Render buttons to verify changes
3. **Use Examples**: Modify provided examples for your needs
4. **Save Frequently**: Export your work regularly
5. **Document Intent**: Use comments to explain business logic

## Keyboard Shortcuts

- **Ctrl/Cmd + A**: Select all
- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Y**: Redo
- **Tab**: Indent (in editor)
- **Shift + Tab**: Outdent

## Further Resources

- [README.md](README.md) - Technical documentation
- [PACKAGING.md](PACKAGING.md) - Build instructions
- Sample files in `samples/` directory
- Source code for parser logic