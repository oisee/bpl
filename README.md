# BPMN-Lite Editor

A revolutionary way to create business process diagrams - write in plain text, see beautiful diagrams instantly! 🚀

<p align="center">
  <img src="https://img.shields.io/badge/Version-0.4.27-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg" alt="PRs Welcome">
</p>

## 🎯 Why BPMN-Lite?

Stop wrestling with complex diagramming tools! BPMN-Lite lets you describe business processes in simple, intuitive text that automatically transforms into professional diagrams.

```
@Customer
  place order
  send: Payment
  receive: Confirmation

@System  
  receive: Payment
  ?Payment Valid
    +ship order
    -cancel order
  send: Confirmation
```

**↓ Instantly becomes ↓**

![demo.gif](demo.gif)

A beautiful, interactive BPMN diagram!

## ✨ Key Features

### 📝 **Simple DSL Syntax**
Write business processes in plain text - no XML, no drag-and-drop, just intuitive notation

### 👁️ **Live Preview** 
See your diagram update in real-time as you type (with VS Code extension!)

### 🎭 **Multiple Views**
Switch between:
- 📊 **Diagram View** - Interactive Mermaid flowchart
- 🌳 **AST View** - Understand the parsed structure
- 📜 **Mermaid Code** - Export-ready diagram syntax

### 🔀 **Smart Connectivity**
- **Gateway Support**: XOR decisions with custom branch labels
- **End Event Normalization**: Smart handling of `!End`, `+!End`, `-!End` variations
- **Auto-Connection Breaks**: Intelligent flow termination to prevent cross-lane leakage
- **Message Flows**: Automatic connection between send/receive tasks
- **Cross-Lane Flows**: Automatic sequential task connectivity with break detection
- **Data Objects**: Attach data to any process step

### 📤 **Export Options**
- `.bpl` - Source code format
- `.json` - Abstract Syntax Tree
- `.mmd` - Mermaid diagram code  
- `.png` - High-resolution PNG images (with custom DPI)
- `.svg` - Scalable vector graphics
- `.xlsx` - Excel format for Visio import
- `.bpmn` - Native BPMN 2.0 XML (Camunda 8 compatible)

## 🚀 Getting Started

### Option 1: Web-Based Editor (Easiest)

```bash
# Clone and setup
git clone <repository-url>
cd bpl
npm install
npm run build

# Launch in browser
npm run start:web
```

Open http://localhost:8080 and start creating!

### Option 2: Desktop Application

```bash
# Same setup as above, then:
npm start
```

### Option 3: VS Code Extension (Recommended!) 

Get the ultimate experience with live preview as you type:

```bash
cd vscode-bpmn-lite
npm install
npm run compile

# In VS Code: Press F5 to test
# Or package for installation:
npm run package
```

### Excel Export Setup (Optional)

```bash
cd tools
pip install -r requirements.txt
```

## 📖 BPMN-lite DSL Specification

### Purpose

A minimal, intuitive domain-specific language for describing business process diagrams that can be rendered to both BPMN and Mermaid formats. The DSL prioritizes simplicity, readability, and expressiveness while minimizing syntax overhead.

### Core Design Principles

- Prefix-based syntax for clear visual distinction
- No brackets, quotes or closing tags needed (except for parallel flows and decision labels)
- Intuitive character choices for each element type
- Support for all essential BPMN elements
- Easy to write by hand and parse programmatically
- Whitespace-insensitive parsing (indentation for readability only)

### Prefix Symbol Reference

|Symbol|BPMN Element|Rationale|
|---|---|---|
|`:`|Process definition|Resembles a label marker, common in many domain languages|
|`@`|Lane/Pool|Represents "at" or "location", indicating where tasks occur|
|`->`|Flow connector|Universal directional arrow symbol|
|`<-`|Incoming flow connector|Reverse arrow showing connection from another task|
|`?`|XOR Gateway|Question mark naturally represents decision points|
|`+`|Positive/Named branch|Plus sign represents an explicit path in a gateway|
|`-`|Negative/Else branch|Minus sign represents fallback or else path|
|`{`|Start parallel/inclusive|Opening bracket suggests the beginning of a grouped section|
|`}`|End parallel/inclusive|Closing bracket naturally pairs with opening bracket|
|`=`|Parallel (AND) branch|Equal signs visually represent parallel tracks|
|`~`|Inclusive (OR) branch|Tilde suggests "approximately" or optionality|
|`[` `]`|Subprocess|Square brackets suggest a contained/nested process|
|`!`|Events|Exclamation mark draws attention to significant events|
|`^`|Message flow|Caret suggests sending/transmitting information|
|`#`|Data object|Resembles a document or container|
|`$`|Data store|Dollar sign represents persistent/valuable data|
|`"`|Diagram comment|Quotation mark is intuitive for visible commentary|
|`//`|Technical comment|Standard comment syntax in many programming languages|
|`---`|Lane boundary marker|Prevents automatic flow connection between lanes|

### DSL Quick Reference

#### Core Elements

| Syntax | Element | Description |
|--------|---------|-------------|
| `:Process Name` | Process | Define the overall process |
| `@Department` | Lane/Pool | Group related activities |
| `  task name` | Task | Any indented line is a task |
| `?Decision` | Gateway | Decision point (XOR) |
| `+choice` | Positive Branch | Yes/True path |
| `-choice` | Negative Branch | No/False path |
| `!Start` / `!End` | Events | Process start/end points |

#### Communication

| Syntax | Element | Description |
|--------|---------|-------------|
| `send: Message` | Send Task | Send a message |
| `receive: Message` | Receive Task | Wait for a message |
| `^Flow @A.task -> @B.task` | Message Flow | Explicit connection |

#### Data & Annotations

| Syntax | Element | Description |
|--------|---------|-------------|
| `#DataObject task` | Data | Attach data to tasks |
| `"Comment text` | Annotation | Visible comment |
| `// Hidden comment` | Comment | Not shown in diagram |

### Advanced Features

```
# Custom gateway labels
?Payment Method
  +|Credit Card| process card payment
  +|PayPal| process PayPal
  -|Cancel| cancel transaction

# Direct connections
task A -> task C  # Skip task B
task D <- task B  # Reverse arrow
```

## Syntax Reference

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

- Simple text lines after lane definition
- Tasks are automatically connected in sequence within the same lane
- Explicit connections can be made using `->` or `<-`:
    
    ```
    task A -> task C  // Creates direct flow from A to C
    task C <- task A  // Alternate syntax, same effect as above
    task A -> task C -> task E  // Creates chained connections
    ```

### Task Name Resolution

For task references without lane prefixes, the parser searches in this order:

1. **Current lane first** - searches for the task name in the current lane
2. **Previous lanes (bottom-up)** - searches lanes defined before the current lane, from most recent to oldest
3. **Forward search (top-down)** - searches from current position to end of process definition

Examples:

```
@Customer
  place order -> validate order  // Forward reference, found in Validation lane
  receive confirmation

@Validation  
  validate order                 // Referenced from Customer lane
  check inventory -> update stock // Forward reference to Warehouse lane

@Warehouse
  update stock                   // Referenced from Validation lane
  prepare shipment -> place order // Backward reference to Customer lane
```

### Lane Boundary Marker

Use `---` to prevent automatic flow connection between lanes:

```
@Lane1
  task A
  task B
  ---  // Prevents auto-connection to next lane

@Lane2  
  task C  // Not connected to task B due to boundary marker
  task D
```

### Gateways

#### XOR Gateways (Exclusive Decision)

XOR gateways can be defined in two ways:

**Inline form (simple decisions):**

```
?Decision Point
  +yes path
  -no path
next task  // First + path connects here
```

**Block form (consistent with other gateways):**

```
{?Decision Point
  +yes path
  -no path
}Decision Complete
next task  // First + path connects here
```

For multi-branch decisions:

```
{?Payment Method
  +Credit Card
  +PayPal
  +Bank Transfer
  -Cancel
}Payment Method Selected
process payment  // Only first + path (Credit Card) connects here
```

#### XOR Gateway Connection Rules

1. **Default Behavior**:
    - First `+` path: Automatically connects to the next task after the decision
    - Additional `+` paths: Must be explicitly connected
    - `-` path: Must be explicitly connected
2. **Explicit Connections**:
    
    ```
    {?Payment Method
      +Credit Card  // Auto-connects to "process payment"
      +PayPal -> special PayPal process
      +Bank Transfer -> bank verification
      -Cancel -> cleanup process
    }Payment Method Selected
    process payment  // Only receives flow from Credit Card
    ```

#### Parallel Gateways (AND)

Parallel gateways use `{` prefix for splits and `}` suffix for joins. Branches use `=` prefix:

```
{Parallel Process
  =path 1
  =path 2
  =path 3
}Join Gate
next task  // All = paths connect here
```

#### Inclusive Gateways (OR)

Similar to parallel gateways, but branches use `~` prefix:

```
{Optional Steps
  ~option 1
  ~option 2
  ~option 3
}Choices Complete
next task  // All ~ paths connect here
```

#### Gateway Connection Summary

|Gateway Type|Inline|Block Form|First Branch|Other Branches|
|---|---|---|---|---|
|XOR|`?`|`{?` `}`|Auto-connects|Explicit only|
|AND|N/A|`{=` `}`|Auto-connects|Auto-connects|
|OR|N/A|`{~` `}`|Auto-connects|Auto-connects|

#### Decision Label Overrides

Use quotes to override default decision labels:

```
{?International shipping
  + "yes" prepare customs documents
  - "no" use domestic shipping
}Shipping Decision Complete

{?Payment Method
  + "Credit" process credit card
  + "Debit" process debit card  
  - "Cash" handle cash payment
}Payment Method Selected
```

#### Mixed Gateway Types

Mixed prefixes can be used within a single block. The parser will automatically generate the appropriate nested gateway structure:

```
{Payment Processing
  =Record Transaction       // AND branch
  =Update Inventory        // AND branch
  +Credit Card Processing  // XOR option
  +Bank Transfer          // XOR option
  -Manual Payment         // XOR fallback
  ~Send Receipt          // OR branch
  ~Send Notification     // OR branch
}Payment Complete
```

### Cross-Lane References

Tasks in other lanes can be referenced using the lane name:

```
@Lane 01
  task A
  task B -> @Lane 02.specific task

@Lane 02
  task X
  specific task
  task Y <- @Lane 01.task A
```

### Subprocesses

Collapsed form:

```
[subprocess name]
```

Expanded form (shows internal structure):

```
[subprocess name]+
```

Subprocess definition:

```
:Main Process
@Lane 1
  task 1
  [handle payment]
  task 3

:handle payment
@Payment Lane
  validate card
  process transaction
```

### Events

All events use the `!` prefix followed by the event type:

#### Start and End Events

```
!start
!start Begin process
!end
!end Complete process
```

Default behavior:

- If not specified, `!start` is added to the first task in the first lane
- If not specified, `!end` is added after the last task in the last lane
- Can be explicitly placed anywhere to override defaults

#### Intermediate Events

```
!message Receive confirmation
!timer Wait 24 hours
!error Handle timeout
!signal Process triggered
!send Order Request
!receive Order Confirmation
```

### Message Flows

#### Position-Based (Implicit)

```
@Customer
  place order
  ^Order Confirmation
  receive confirmation
```

#### Direction-Based (Explicit)

```
^Order Details -> @Sales.process order
^Payment Confirmation <- @Finance.payment processed
```

#### Automatic Connection

Tasks with `!send` and `!receive` events are automatically connected:

```
@Customer
  !send Order Request

@System
  !receive Order Request  // Auto-connected from Customer
```

### Data Objects and Stores

#### Data Objects

```
#Order Data
#Customer Info -> process order
#Invoice <- generate invoice
```

#### Data Stores (Persistent)

```
$Customer Database
$Order History -> retrieve past orders
```

#### Position-Based Data Flow

```
validate order
#Order Details
process payment  // Connected via Order Details
```

### Comments

#### Visible Comments (appear in diagram)

```
"This comment will appear in the diagram
"Multi-line comments<br/>use HTML line breaks
```

#### Technical Comments (hidden)

```
// This comment won't appear in the diagram
task A // This is also hidden
```

## Parsing Rules

1. First non-whitespace character determines line type
2. Whitespace is ignored for parsing - indentation is purely for readability
3. Standard pretty-printing uses:
    - Process and lane declarations: column 0
    - Tasks and gateways: indent 2 spaces
    - Gateway branches: indent 4 spaces (additional 2)
    - Nested elements: add 2 spaces per level
4. Empty lines are ignored
5. Tasks in sequence are automatically connected unless separated by `---`
6. Task name resolution follows: current lane → previous lanes (bottom-up) → forward search (top-down)
7. Cross-lane references use `@LaneName.taskName` syntax for explicit lane targeting
8. Gateway branches follow connection rules based on gateway type
9. Mixed gateway types within a block are automatically structured

## Complete Example

```
:Order Fulfillment Process

@Customer
  browse products
  add to cart
  {?Ready to purchase
    + "Yes" proceed to checkout
    - "No" save cart -> !end Exit
  }Purchase Decision Complete
  checkout
  [customer authentication]
  provide shipping address
  {?Express delivery
    + "Express" select express shipping
    - "Standard" select standard shipping
  }Delivery Option Selected
  complete payment
  !send Order Submission
  !timer Wait for confirmation
  !receive Order Confirmation
  "Customer receives confirmation<br/>and tracking information"
  ---

@OrderSystem  
  !receive Order Submission
  #Order Data
  validate order
  process payment
  {?Payment successful
    + "Approved" update order status
    + "Partial" request additional payment -> complete payment
    - "Declined" cancel order -> !send Order Cancelled
  }Payment Processing Complete
  {Process Order
    =update inventory
    =generate invoice
    =[prepare shipment]+
  }Order Processing Complete
  !send Order Confirmation
  $Order Database
  ---

@Warehouse
  !receive Shipment Request
  pick items
  pack order
  {Shipping Options
    ~add insurance
    ~add tracking
  }Shipping Options Complete
  ship package
  ^Shipment Complete -> update order status

:customer authentication
@Security
  {?Have account
    + "Yes" login
    - "No" register
  }Authentication Method Selected
  verify identity
  
:prepare shipment  
@Shipping
  calculate costs
  select carrier
  generate label
```

## Best Practices

1. Use clear, descriptive task names
2. Keep lane names concise but meaningful
3. Use explicit connections for clarity in complex flows
4. Group related tasks within lanes
5. Use comments to explain business rules
6. Define subprocesses for reusable components
7. Use `---` to clearly separate independent process sections
8. Rely on automatic task name resolution for cleaner syntax
9. Use explicit lane references (`@LaneName.taskName`) only when automatic resolution is ambiguous
10. Use block form for gateways when consistency is important or when dealing with complex multi-branch decisions
11. Use inline form for simple binary XOR decisions when brevity is preferred

## Examples

### Simple Order Process

This basic example shows how intuitive it is to describe a business process:

```
:Order Process

@Customer
  place order
  send: Payment Information
  receive: Order Confirmation

@System
  receive: Payment Information
  validate payment
  ?Payment OK
    +ship order
    -cancel order
  send: Order Confirmation

#OrderData place order
```

**Renders as:**

```mermaid
flowchart TD
  subgraph customer[Customer]
    customer_place_order[place order]
    customer_send_payment_information>send: Payment Information]
    customer_receive_order_confirmation>receive: Order Confirmation]
  end
  
  subgraph system[System]
    system_receive_payment_information>receive: Payment Information]
    system_validate_payment[validate payment]
    system_payment_ok{Payment OK?}
    system_ship_order[ship order]
    system_cancel_order[cancel order]
    system_send_order_confirmation>send: Order Confirmation]
  end
  
  data_orderdata[(OrderData)]
  
  customer_place_order --> customer_send_payment_information
  customer_send_payment_information --> customer_receive_order_confirmation
  
  system_receive_payment_information --> system_validate_payment
  system_validate_payment --> system_payment_ok
  system_payment_ok -->|Yes| system_ship_order
  system_payment_ok -->|No| system_cancel_order
  system_ship_order --> system_send_order_confirmation
  
  customer_send_payment_information -.->|Payment Information| system_receive_payment_information
  system_send_order_confirmation -.->|Order Confirmation| customer_receive_order_confirmation
  
  data_orderdata -.-> customer_place_order
```

### Restaurant Order Process

A simple restaurant ordering workflow:

**BPL Code:**
```
:Restaurant Order Process

@Customer
  enter restaurant
  read menu
  place order
  send: Order Details
  receive: Order Ready
  pay bill
  leave restaurant

@Waiter
  receive: Order Details
  send: Kitchen Order
  receive: Food Ready
  serve food
  send: Order Ready
  present bill

@Kitchen
  receive: Kitchen Order
  prepare food
  send: Food Ready

#OrderTicket place order
```

**Renders as Mermaid:**
```mermaid
flowchart TD
  subgraph customer[Customer]
    customer_enter_restaurant[enter restaurant]
    customer_read_menu[read menu]
    customer_place_order[place order]
    customer_send_order_details>send: Order Details]
    customer_receive_order_ready>receive: Order Ready]
    customer_pay_bill[pay bill]
    customer_leave_restaurant[leave restaurant]
  end
  
  subgraph waiter[Waiter]
    waiter_receive_order_details>receive: Order Details]
    waiter_send_kitchen_order>send: Kitchen Order]
    waiter_receive_food_ready>receive: Food Ready]
    waiter_serve_food[serve food]
    waiter_send_order_ready>send: Order Ready]
    waiter_present_bill[present bill]
  end
  
  subgraph kitchen[Kitchen]
    kitchen_receive_kitchen_order>receive: Kitchen Order]
    kitchen_prepare_food[prepare food]
    kitchen_send_food_ready>send: Food Ready]
  end
  
  data_orderticket[(OrderTicket)]
  
  customer_enter_restaurant --> customer_read_menu
  customer_read_menu --> customer_place_order
  customer_place_order --> customer_send_order_details
  customer_send_order_details --> customer_receive_order_ready
  customer_receive_order_ready --> customer_pay_bill
  customer_pay_bill --> customer_leave_restaurant
  
  waiter_receive_order_details --> waiter_send_kitchen_order
  waiter_send_kitchen_order --> waiter_receive_food_ready
  waiter_receive_food_ready --> waiter_serve_food
  waiter_serve_food --> waiter_send_order_ready
  waiter_send_order_ready --> waiter_present_bill
  
  kitchen_receive_kitchen_order --> kitchen_prepare_food
  kitchen_prepare_food --> kitchen_send_food_ready
  
  customer_send_order_details -.->|Order Details| waiter_receive_order_details
  waiter_send_kitchen_order -.->|Kitchen Order| kitchen_receive_kitchen_order
  kitchen_send_food_ready -.->|Food Ready| waiter_receive_food_ready
  waiter_send_order_ready -.->|Order Ready| customer_receive_order_ready
  
  data_orderticket -.-> customer_place_order
```

### Software Development Sprint

A typical agile development sprint workflow:

**BPL Code:**
```
:Sprint Development Process

@ProductOwner
  define user stories
  prioritize backlog
  send: Sprint Goals
  review demo
  ?Accept Stories
    +update release notes
    -request changes

@Developer
  receive: Sprint Goals
  estimate tasks
  implement features
  send: Code Review Request
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features

@QA
  receive: Code Review Request
  review code
  run tests
  send: Review Feedback
  ?Quality Check
    +approve release
    -report bugs

#SprintBacklog define user stories
#TestResults run tests
```

**Renders as Mermaid:**
```mermaid
flowchart TD
  subgraph productowner[ProductOwner]
    productowner_define_user_stories[define user stories]
    productowner_prioritize_backlog[prioritize backlog]
    productowner_send_sprint_goals>send: Sprint Goals]
    productowner_review_demo[review demo]
    productowner_accept_stories{Accept Stories?}
    productowner_update_release_notes[update release notes]
    productowner_request_changes[request changes]
  end
  
  subgraph developer[Developer]
    developer_receive_sprint_goals>receive: Sprint Goals]
    developer_estimate_tasks[estimate tasks]
    developer_implement_features[implement features]
    developer_send_code_review_request>send: Code Review Request]
    developer_receive_review_feedback>receive: Review Feedback]
    developer_tests_pass{Tests Pass?}
    developer_deploy_to_staging[deploy to staging]
    developer_fix_issues[fix issues]
    developer_demo_features[demo features]
  end
  
  subgraph qa[QA]
    qa_receive_code_review_request>receive: Code Review Request]
    qa_review_code[review code]
    qa_run_tests[run tests]
    qa_send_review_feedback>send: Review Feedback]
    qa_quality_check{Quality Check?}
    qa_approve_release[approve release]
    qa_report_bugs[report bugs]
  end
  
  data_sprintbacklog[(SprintBacklog)]
  data_testresults[(TestResults)]
  
  productowner_define_user_stories --> productowner_prioritize_backlog
  productowner_prioritize_backlog --> productowner_send_sprint_goals
  productowner_send_sprint_goals --> productowner_review_demo
  productowner_review_demo --> productowner_accept_stories
  productowner_accept_stories -->|Yes| productowner_update_release_notes
  productowner_accept_stories -->|No| productowner_request_changes
  
  developer_receive_sprint_goals --> developer_estimate_tasks
  developer_estimate_tasks --> developer_implement_features
  developer_implement_features --> developer_send_code_review_request
  developer_send_code_review_request --> developer_receive_review_feedback
  developer_receive_review_feedback --> developer_tests_pass
  developer_tests_pass -->|Yes| developer_deploy_to_staging
  developer_tests_pass -->|No| developer_fix_issues
  developer_deploy_to_staging --> developer_demo_features
  
  qa_receive_code_review_request --> qa_review_code
  qa_review_code --> qa_run_tests
  qa_run_tests --> qa_send_review_feedback
  qa_send_review_feedback --> qa_quality_check
  qa_quality_check -->|Yes| qa_approve_release
  qa_quality_check -->|No| qa_report_bugs
  
  productowner_send_sprint_goals -.->|Sprint Goals| developer_receive_sprint_goals
  developer_send_code_review_request -.->|Code Review Request| qa_receive_code_review_request
  qa_send_review_feedback -.->|Review Feedback| developer_receive_review_feedback
  
  data_sprintbacklog -.-> productowner_define_user_stories
  data_testresults -.-> qa_run_tests
```

### Complex E-Commerce Order Fulfillment

A more complex example showing multiple departments, parallel processes, and decision points:

```
:E-Commerce Order Fulfillment

@Customer
  !Start
  browse products
  add to cart
  checkout
  send: Payment Details
  send: Shipping Address
  receive: Order Confirmation
  receive: Tracking Number
  receive: Package
  rate experience
  !End

@OrderManagement
  receive: Payment Details
  receive: Shipping Address
  validate order
  ?Fraud Check
    +|Pass| process payment
    -|Fail| cancel order
  ?Payment Success
    +create fulfillment request
    -notify payment failure
  send: Order Confirmation

@Inventory
  check stock availability
  ?In Stock
    +|Available| reserve items
    +|Partial| split order
    -|Out of Stock| backorder items
  update inventory
  pack items

@Shipping
  receive fulfillment request
  ?Shipping Method
    +|Express| priority handling
    +|Standard| regular handling
    -|International| customs processing
  generate shipping label
  send: Tracking Number
  dispatch courier

@CustomerService
  monitor order status
  ?Customer Issue
    +resolve complaint
    -escalate to manager
  process returns
  send feedback survey

#OrderData checkout
#PaymentData process payment
#ShippingLabel generate shipping label
```

### Employee Onboarding Process

A complete HR onboarding workflow:

**BPL Code:**
```
:Employee Onboarding

@NewEmployee
  !Start
  accept offer
  send: Signed Contract
  receive: Welcome Package
  attend orientation
  complete paperwork
  receive: Equipment
  meet team
  !End

@HR
  receive: Signed Contract
  create employee record
  send: Welcome Package
  schedule orientation
  process paperwork
  ?Background Check
    +|Pass| approve start
    -|Fail| revoke offer

@IT
  receive equipment request
  prepare workstation
  create accounts
  send: Equipment
  provide access credentials

@Manager
  assign buddy
  create training plan
  introduce to team
  set initial goals

#EmployeeRecord create employee record
#AccessCredentials create accounts
```

**Renders as Mermaid:**
```mermaid
flowchart TD
  subgraph newemployee[NewEmployee]
    newemployee_start([Start])
    newemployee_accept_offer[accept offer]
    newemployee_send_signed_contract>send: Signed Contract]
    newemployee_receive_welcome_package>receive: Welcome Package]
    newemployee_attend_orientation[attend orientation]
    newemployee_complete_paperwork[complete paperwork]
    newemployee_receive_equipment>receive: Equipment]
    newemployee_meet_team[meet team]
    newemployee_end([End])
  end
  
  subgraph hr[HR]
    hr_receive_signed_contract>receive: Signed Contract]
    hr_create_employee_record[create employee record]
    hr_send_welcome_package>send: Welcome Package]
    hr_schedule_orientation[schedule orientation]
    hr_process_paperwork[process paperwork]
    hr_background_check{Background Check?}
    hr_approve_start[approve start]
    hr_revoke_offer[revoke offer]
  end
  
  subgraph it[IT]
    it_receive_equipment_request[receive equipment request]
    it_prepare_workstation[prepare workstation]
    it_create_accounts[create accounts]
    it_send_equipment>send: Equipment]
    it_provide_access_credentials[provide access credentials]
  end
  
  subgraph manager[Manager]
    manager_assign_buddy[assign buddy]
    manager_create_training_plan[create training plan]
    manager_introduce_to_team[introduce to team]
    manager_set_initial_goals[set initial goals]
  end
  
  data_employeerecord[(EmployeeRecord)]
  data_accesscredentials[(AccessCredentials)]
  
  newemployee_start --> newemployee_accept_offer
  newemployee_accept_offer --> newemployee_send_signed_contract
  newemployee_send_signed_contract --> newemployee_receive_welcome_package
  newemployee_receive_welcome_package --> newemployee_attend_orientation
  newemployee_attend_orientation --> newemployee_complete_paperwork
  newemployee_complete_paperwork --> newemployee_receive_equipment
  newemployee_receive_equipment --> newemployee_meet_team
  newemployee_meet_team --> newemployee_end
  
  hr_receive_signed_contract --> hr_create_employee_record
  hr_create_employee_record --> hr_send_welcome_package
  hr_send_welcome_package --> hr_schedule_orientation
  hr_schedule_orientation --> hr_process_paperwork
  hr_process_paperwork --> hr_background_check
  hr_background_check -->|Pass| hr_approve_start
  hr_background_check -->|Fail| hr_revoke_offer
  
  it_receive_equipment_request --> it_prepare_workstation
  it_prepare_workstation --> it_create_accounts
  it_create_accounts --> it_send_equipment
  it_send_equipment --> it_provide_access_credentials
  
  manager_assign_buddy --> manager_create_training_plan
  manager_create_training_plan --> manager_introduce_to_team
  manager_introduce_to_team --> manager_set_initial_goals
  
  newemployee_send_signed_contract -.->|Signed Contract| hr_receive_signed_contract
  hr_send_welcome_package -.->|Welcome Package| newemployee_receive_welcome_package
  it_send_equipment -.->|Equipment| newemployee_receive_equipment
  
  data_employeerecord -.-> hr_create_employee_record
  data_accesscredentials -.-> it_create_accounts
```

### Bank ATM Transaction

A simple ATM withdrawal process:

**BPL Code:**
```
:ATM Cash Withdrawal

@Customer
  insert card
  enter PIN
  ?PIN Valid
    +select withdrawal
    +enter amount
    +receive: Cash
    +take card
    -receive: Card
  !End

@ATM
  read card
  verify PIN
  ?Account Valid
    +display options
    +?Sufficient Funds
      +dispense cash
      +send: Cash
      -show insufficient funds
    -return card
  send: Card
  
@BankSystem
  validate account
  check balance
  debit account
  log transaction

#TransactionLog log transaction
```

**Renders as Mermaid:**
```mermaid
flowchart TD
  subgraph customer[Customer]
    customer_insert_card[insert card]
    customer_enter_pin[enter PIN]
    customer_pin_valid{PIN Valid?}
    customer_select_withdrawal[select withdrawal]
    customer_enter_amount[enter amount]
    customer_receive_cash>receive: Cash]
    customer_take_card[take card]
    customer_receive_card>receive: Card]
    customer_end([End])
  end
  
  subgraph atm[ATM]
    atm_read_card[read card]
    atm_verify_pin[verify PIN]
    atm_account_valid{Account Valid?}
    atm_display_options[display options]
    atm_sufficient_funds{Sufficient Funds?}
    atm_dispense_cash[dispense cash]
    atm_send_cash>send: Cash]
    atm_show_insufficient_funds[show insufficient funds]
    atm_return_card[return card]
    atm_send_card>send: Card]
  end
  
  subgraph banksystem[BankSystem]
    banksystem_validate_account[validate account]
    banksystem_check_balance[check balance]
    banksystem_debit_account[debit account]
    banksystem_log_transaction[log transaction]
  end
  
  data_transactionlog[(TransactionLog)]
  
  customer_insert_card --> customer_enter_pin
  customer_enter_pin --> customer_pin_valid
  customer_pin_valid -->|Yes| customer_select_withdrawal
  customer_select_withdrawal --> customer_enter_amount
  customer_enter_amount --> customer_receive_cash
  customer_receive_cash --> customer_take_card
  customer_take_card --> customer_end
  customer_pin_valid -->|No| customer_receive_card
  customer_receive_card --> customer_end
  
  atm_read_card --> atm_verify_pin
  atm_verify_pin --> atm_account_valid
  atm_account_valid -->|Yes| atm_display_options
  atm_display_options --> atm_sufficient_funds
  atm_sufficient_funds -->|Yes| atm_dispense_cash
  atm_dispense_cash --> atm_send_cash
  atm_sufficient_funds -->|No| atm_show_insufficient_funds
  atm_account_valid -->|No| atm_return_card
  atm_return_card --> atm_send_card
  
  banksystem_validate_account --> banksystem_check_balance
  banksystem_check_balance --> banksystem_debit_account
  banksystem_debit_account --> banksystem_log_transaction
  
  atm_send_cash -.->|Cash| customer_receive_cash
  atm_send_card -.->|Card| customer_receive_card
  
  data_transactionlog -.-> banksystem_log_transaction
```

### IT Incident Management Process

This example demonstrates how BPMN-Lite handles service desk workflows with multiple teams:

```
:IT Incident Management

@User
  !Start
  report issue
  send: Incident Details
  receive: Ticket Number
  receive: Status Updates
  ?Resolved
    +confirm resolution
    -provide more info
  !End

@ServiceDesk
  receive: Incident Details
  create ticket
  send: Ticket Number
  categorize incident
  ?Priority
    +|Critical| escalate immediately
    +|High| assign to specialist
    +|Medium| queue for team
    -|Low| self-service guide
  
@L1Support
  receive ticket
  initial diagnosis
  ?Can Resolve
    +apply fix
    -escalate to L2
  document solution
  send: Status Updates

@L2Support
  deep investigation
  ?Root Cause Found
    +implement solution
    -escalate to vendor
  test resolution
  update knowledge base

@Management
  receive escalations
  ?Major Incident
    +convene war room
    -monitor progress
  approve changes
  send communications

^IncidentFlow @User.report issue -> @ServiceDesk.receive: Incident Details
#TicketData create ticket
#KnowledgeBase update knowledge base
```

### Car Rental Process

A streamlined car rental workflow:

**BPL Code:**
```
:Car Rental Service

@Customer
  search cars
  select vehicle
  send: Booking Request
  provide ID
  sign rental agreement
  receive: Car Keys
  return car
  receive: Receipt

@RentalAgent
  receive: Booking Request
  check availability
  ?Available
    +confirm booking
    +verify documents
    +prepare agreement
    +send: Car Keys
    -suggest alternatives
  inspect returned car
  ?Damage Found
    +calculate charges
    -process return
  send: Receipt

@PaymentSystem
  process deposit
  hold credit card
  charge final amount
  refund deposit

#RentalAgreement prepare agreement
#InspectionReport inspect returned car
```

**Renders as Mermaid:**
```mermaid
flowchart TD
  subgraph customer[Customer]
    customer_search_cars[search cars]
    customer_select_vehicle[select vehicle]
    customer_send_booking_request>send: Booking Request]
    customer_provide_id[provide ID]
    customer_sign_rental_agreement[sign rental agreement]
    customer_receive_car_keys>receive: Car Keys]
    customer_return_car[return car]
    customer_receive_receipt>receive: Receipt]
  end
  
  subgraph rentalagent[RentalAgent]
    rentalagent_receive_booking_request>receive: Booking Request]
    rentalagent_check_availability[check availability]
    rentalagent_available{Available?}
    rentalagent_confirm_booking[confirm booking]
    rentalagent_verify_documents[verify documents]
    rentalagent_prepare_agreement[prepare agreement]
    rentalagent_send_car_keys>send: Car Keys]
    rentalagent_suggest_alternatives[suggest alternatives]
    rentalagent_inspect_returned_car[inspect returned car]
    rentalagent_damage_found{Damage Found?}
    rentalagent_calculate_charges[calculate charges]
    rentalagent_process_return[process return]
    rentalagent_send_receipt>send: Receipt]
  end
  
  subgraph paymentsystem[PaymentSystem]
    paymentsystem_process_deposit[process deposit]
    paymentsystem_hold_credit_card[hold credit card]
    paymentsystem_charge_final_amount[charge final amount]
    paymentsystem_refund_deposit[refund deposit]
  end
  
  data_rentalagreement[(RentalAgreement)]
  data_inspectionreport[(InspectionReport)]
  
  customer_search_cars --> customer_select_vehicle
  customer_select_vehicle --> customer_send_booking_request
  customer_send_booking_request --> customer_provide_id
  customer_provide_id --> customer_sign_rental_agreement
  customer_sign_rental_agreement --> customer_receive_car_keys
  customer_receive_car_keys --> customer_return_car
  customer_return_car --> customer_receive_receipt
  
  rentalagent_receive_booking_request --> rentalagent_check_availability
  rentalagent_check_availability --> rentalagent_available
  rentalagent_available -->|Yes| rentalagent_confirm_booking
  rentalagent_confirm_booking --> rentalagent_verify_documents
  rentalagent_verify_documents --> rentalagent_prepare_agreement
  rentalagent_prepare_agreement --> rentalagent_send_car_keys
  rentalagent_available -->|No| rentalagent_suggest_alternatives
  rentalagent_send_car_keys --> rentalagent_inspect_returned_car
  rentalagent_inspect_returned_car --> rentalagent_damage_found
  rentalagent_damage_found -->|Yes| rentalagent_calculate_charges
  rentalagent_damage_found -->|No| rentalagent_process_return
  rentalagent_calculate_charges --> rentalagent_send_receipt
  rentalagent_process_return --> rentalagent_send_receipt
  
  paymentsystem_process_deposit --> paymentsystem_hold_credit_card
  paymentsystem_hold_credit_card --> paymentsystem_charge_final_amount
  paymentsystem_charge_final_amount --> paymentsystem_refund_deposit
  
  customer_send_booking_request -.->|Booking Request| rentalagent_receive_booking_request
  rentalagent_send_car_keys -.->|Car Keys| customer_receive_car_keys
  rentalagent_send_receipt -.->|Receipt| customer_receive_receipt
  
  data_rentalagreement -.-> rentalagent_prepare_agreement
  data_inspectionreport -.-> rentalagent_inspect_returned_car
```

### Online Course Enrollment

An e-learning platform enrollment process:

**BPL Code:**
```
:Course Enrollment Process

@Student
  browse courses
  ?Found Interest
    +select course
    +send: Enrollment Request
    +receive: Payment Link
    +make payment
    +receive: Access Credentials
    +start learning
    -continue browsing

@Platform
  receive: Enrollment Request
  check prerequisites
  ?Prerequisites Met
    +send: Payment Link
    +receive: Payment Confirmation
    +create student account
    +enroll in course
    +send: Access Credentials
    -send: Prerequisites Info

@Instructor
  receive new enrollment
  send welcome message
  monitor progress
  provide feedback

#CourseContent enroll in course
#StudentProgress monitor progress
```

**Renders as Mermaid:**
```mermaid
flowchart TD
  subgraph student[Student]
    student_browse_courses[browse courses]
    student_found_interest{Found Interest?}
    student_select_course[select course]
    student_send_enrollment_request>send: Enrollment Request]
    student_receive_payment_link>receive: Payment Link]
    student_make_payment[make payment]
    student_receive_access_credentials>receive: Access Credentials]
    student_start_learning[start learning]
    student_continue_browsing[continue browsing]
  end
  
  subgraph platform[Platform]
    platform_receive_enrollment_request>receive: Enrollment Request]
    platform_check_prerequisites[check prerequisites]
    platform_prerequisites_met{Prerequisites Met?}
    platform_send_payment_link>send: Payment Link]
    platform_receive_payment_confirmation>receive: Payment Confirmation]
    platform_create_student_account[create student account]
    platform_enroll_in_course[enroll in course]
    platform_send_access_credentials>send: Access Credentials]
    platform_send_prerequisites_info>send: Prerequisites Info]
  end
  
  subgraph instructor[Instructor]
    instructor_receive_new_enrollment[receive new enrollment]
    instructor_send_welcome_message[send welcome message]
    instructor_monitor_progress[monitor progress]
    instructor_provide_feedback[provide feedback]
  end
  
  data_coursecontent[(CourseContent)]
  data_studentprogress[(StudentProgress)]
  
  student_browse_courses --> student_found_interest
  student_found_interest -->|Yes| student_select_course
  student_select_course --> student_send_enrollment_request
  student_send_enrollment_request --> student_receive_payment_link
  student_receive_payment_link --> student_make_payment
  student_make_payment --> student_receive_access_credentials
  student_receive_access_credentials --> student_start_learning
  student_found_interest -->|No| student_continue_browsing
  
  platform_receive_enrollment_request --> platform_check_prerequisites
  platform_check_prerequisites --> platform_prerequisites_met
  platform_prerequisites_met -->|Yes| platform_send_payment_link
  platform_send_payment_link --> platform_receive_payment_confirmation
  platform_receive_payment_confirmation --> platform_create_student_account
  platform_create_student_account --> platform_enroll_in_course
  platform_enroll_in_course --> platform_send_access_credentials
  platform_prerequisites_met -->|No| platform_send_prerequisites_info
  
  instructor_receive_new_enrollment --> instructor_send_welcome_message
  instructor_send_welcome_message --> instructor_monitor_progress
  instructor_monitor_progress --> instructor_provide_feedback
  
  student_send_enrollment_request -.->|Enrollment Request| platform_receive_enrollment_request
  platform_send_payment_link -.->|Payment Link| student_receive_payment_link
  platform_send_access_credentials -.->|Access Credentials| student_receive_access_credentials
  
  data_coursecontent -.-> platform_enroll_in_course
  data_studentprogress -.-> instructor_monitor_progress
```

### Loan Application Process

A financial process example with multiple decision points and compliance checks:

```
:Loan Application Process

@Applicant
  !Start
  submit application
  send: Financial Documents
  receive: Information Request
  provide additional info
  receive: Decision
  ?Approved
    +sign agreement
    +receive: Funds
    -seek alternatives
  !End

@LoanOfficer
  receive application
  receive: Financial Documents
  initial review
  ?Complete Application
    +proceed to verification
    -send: Information Request
  
@CreditDepartment
  run credit check
  analyze debt ratio
  ?Credit Score
    +|Excellent| fast track
    +|Good| standard process
    +|Fair| additional review
    -|Poor| recommend rejection
  calculate loan terms

@RiskAssessment
  evaluate application
  check fraud indicators
  ?Risk Level
    +|Low| approve
    +|Medium| add conditions
    -|High| reject
  set interest rate

@Underwriting
  final review
  ?Decision
    +prepare agreement
    -prepare rejection letter
  send: Decision

@Disbursement
  receive signed agreement
  verify conditions met
  transfer funds
  send: Funds
  setup payment schedule

#ApplicationData submit application
#CreditReport run credit check
#LoanAgreement prepare agreement
```

### Healthcare Patient Journey

This example shows a patient's journey through a healthcare system:

```
:Patient Emergency Room Visit

@Patient
  !Start
  arrive at ER
  check in
  provide symptoms
  receive: Triage Number
  wait for call
  receive: Treatment
  receive: Discharge Instructions
  !End

@Reception
  register patient
  verify insurance
  create patient record
  send: Triage Number
  
@TriageNurse
  assess symptoms
  take vitals
  ?Severity
    +|Critical| immediate care
    +|Urgent| priority queue
    +|Standard| general queue
    -|Non-urgent| refer to clinic
  assign to doctor

@Doctor
  examine patient
  order tests
  review results
  ?Diagnosis
    +prescribe treatment
    -order more tests
  ?Admission Required
    +admit to ward
    -prepare discharge

@Laboratory
  receive test orders
  collect samples
  run tests
  send results
  
@Pharmacy
  receive prescription
  verify dosage
  dispense medication
  provide instructions

@Billing
  compile charges
  submit to insurance
  ?Coverage
    +process payment
    -bill patient
  close account

^TestOrder @Doctor.order tests -> @Laboratory.receive test orders
#PatientRecord create patient record
#TestResults send results
#InsuranceClaim submit to insurance
```

### Manufacturing Quality Control

A manufacturing process with quality gates and rework loops:

```
:Manufacturing Quality Control Process

@Production
  !Start
  receive work order
  pull raw materials
  setup machinery
  produce batch
  send: Batch for QC

@QualityControl
  receive: Batch for QC
  inspect samples
  run tests
  ?Quality Check
    +|Pass| approve batch
    +|Minor Issues| conditional release
    -|Fail| reject batch
  document results

@Rework
  receive rejected batch
  analyze defects
  ?Fixable
    +repair items
    +send: Batch for QC
    -scrap batch
  update process

@Packaging
  receive approved batch
  package products
  label containers
  ?Final Inspection
    +release to warehouse
    -hold for review

@Warehouse
  receive products
  update inventory
  ?Order Pending
    +ship immediately
    -store in location
  !End

@Engineering
  receive quality reports
  analyze trends
  ?Process Issue
    +modify procedures
    -continue monitoring
  update specifications

#WorkOrder receive work order
#QualityReport document results
#InventorySystem update inventory
```

## 🏗️ Architecture & Development

### Project Structure
```
bpl/
├── src/index.html        # Main application (parser + UI)
├── main.js              # Electron entry point
├── vscode-bpmn-lite/    # VS Code extension
│   ├── src/            # Extension source code
│   └── bpmn-lite-0.1.0.vsix  # Ready-to-install package
├── tools/              # Export utilities
└── samples/            # Example .bpl files
```

### Key Components
- **Parser**: `BpmnLiteParser` class - Converts DSL to AST
- **Renderer**: Mermaid.js - Transforms AST to diagrams
- **Extension**: TypeScript VS Code integration with live preview

### Building from Source

```bash
# Main application
npm install
npm run build

# VS Code extension
cd vscode-bpmn-lite
npm install
npm run compile
npm run package  # Creates .vsix file

# All platforms
npm run dist:all
```

## 🔄 Export & Integration

### Export to Visio
1. Click "Save .xlsx" in the editor
2. Open in Visio: Data → Link Data to Shapes
3. Map columns automatically

### Future Integrations
- **BPMN 2.0 XML**: Native bpmn.io support (in development)
- **Camunda Integration**: Direct process deployment
- **API Access**: REST endpoints for automation

## 🐛 Known Limitations

- XOR gateways only (AND/OR coming soon)
- Excel export requires Python
- BPMN 2.0 export in development

## 🎨 VS Code Extension

Experience the **ultimate BPMN-Lite workflow** with our VS Code extension featuring live preview!

### ✨ Extension Features

- **🔴 Live Preview**: Diagram updates instantly as you type - no save required!
- **🎨 Syntax Highlighting**: Full IntelliSense and color coding for all DSL elements
- **📊 Split View**: Edit code and see diagram side-by-side
- **⚡ Real-time Validation**: Instant error detection and highlighting
- **📤 Quick Export**: Export to Mermaid or JSON with one click
- **🎯 Auto-complete**: Coming soon!

### 📦 Installation

#### Quick Install (Recommended)
```bash
# The extension is already built!
code --install-extension vscode-bpmn-lite/bpmn-lite-0.1.1.vsix
```

#### Development Install
1. Open VS Code in the `vscode-bpmn-lite` folder
2. Press `F5` to launch Extension Development Host
3. Open any `.bpl` file - preview appears automatically!

### 🎮 Usage

1. Create a new file with `.bpl` extension
2. Start typing - the preview panel opens automatically
3. Use `Ctrl+Shift+P` → "BPMN-Lite: Show Preview to Side" for split view
4. Your diagram updates live as you type!

[Full extension documentation](vscode-bpmn-lite/README.md)

## 🤝 Contributing

We welcome contributions! Here's how you can help:

- **🐛 Report Bugs**: Open an issue with reproduction steps
- **💡 Suggest Features**: Share your ideas in discussions
- **📝 Improve Docs**: Help us make the documentation better
- **🔧 Submit PRs**: Fork, branch, code, test, and submit!

### Development Workflow
```bash
git checkout -b feature/amazing-feature
npm test  # Run tests
git commit -m 'Add amazing feature'
git push origin feature/amazing-feature
```

## 📚 Theoretical Foundation & References

### Domain-Driven Design (DDD) Principles

BPMN-Lite is built on Domain-Driven Design principles:

- **Ubiquitous Language**: The DSL syntax mirrors business vocabulary
- **Bounded Contexts**: Each lane/pool represents a distinct context
- **Domain Events**: Message flows (`send:`/`receive:`) model domain events
- **Aggregates**: Process definitions encapsulate related activities

### Academic References

1. **Business Process Modeling**
   - van der Aalst, W.M.P. (2013). "Business Process Management: A Comprehensive Survey"
   - Dumas, M., La Rosa, M., Mendling, J., & Reijers, H. (2018). "Fundamentals of Business Process Management"

2. **Domain-Specific Languages**
   - Fowler, M. (2010). "Domain-Specific Languages". Addison-Wesley
   - Mernik, M., Heering, J., & Sloane, A. M. (2005). "When and how to develop domain-specific languages"

3. **Visual Languages & Diagrams**
   - Moody, D. (2009). "The Physics of Notations: Toward a Scientific Basis for Constructing Visual Notations in Software Engineering"

### Internal Documentation & Articles

- **[Architecture Decision Records](007_GEMINI.md)** - Key architectural decisions and rationale
- **[Camunda Integration Proposal](010_CAMUNDA-PROPOSAL.md)** - Vision for enterprise BPMN platform integration
- **[Development Guide](009_GUIDE.md)** - Comprehensive guide for contributors
- **[Implementation Plan](002_implementation_plan.md)** - Technical roadmap and design patterns
- **[Improvements Plan](003_improvements_plan.md)** - Future enhancements and optimizations
- **[Testing Documentation](vscode-bpmn-lite/TESTING.md)** - Test strategies and scenarios

### Design Philosophy

BPMN-Lite follows these core principles:

1. **Simplicity First**: Minimal syntax for maximum expressiveness
2. **Progressive Disclosure**: Advanced features available when needed
3. **Fail-Safe Defaults**: Smart conventions reduce errors
4. **Human-Centric**: Optimized for readability and writability

### Related Technologies

- **BPMN 2.0**: OMG specification we compile to
- **Mermaid.js**: Rendering engine for diagrams
- **Language Server Protocol**: Future IDE integration
- **WebAssembly**: Potential for browser-based parser

## 🔗 External Resources

### Standards & Specifications
- [BPMN 2.0 Specification](https://www.omg.org/spec/BPMN/2.0/)
- [Camunda BPMN Reference](https://docs.camunda.org/manual/reference/bpmn20/)
- [bpmn.io Documentation](https://bpmn.io/toolkit/bpmn-js/)

### Community & Support
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community Q&A and ideas
- **Stack Overflow**: Tag `bpmn-lite` for questions
- **Discord**: Real-time chat (coming soon)

### Tutorials & Examples
- [Getting Started Guide](009_GUIDE.md)
- [Example Processes](examples/)
- [Video Tutorials](https://youtube.com/bpmn-lite) (coming soon)
- [Interactive Playground](https://bpmn-lite.io/playground) (coming soon)

## 📈 Roadmap

### Current Release (v0.4.x)
- ✅ Core DSL implementation
- ✅ VSCode extension with live preview
- ✅ Export to PNG/SVG/Mermaid/BPMN
- ✅ Cross-platform desktop app
- ✅ Smart connection resolution

### Next Release (v0.5.0)
- 🚧 BPMN 2.0 round-trip conversion
- 🚧 Collaborative editing
- 🚧 Cloud storage integration
- 🚧 AI-powered process suggestions

### Future Vision (v1.0+)
- 📋 Full BPMN 2.0 element support
- 📋 Process simulation & analysis
- 📋 Integration with process engines
- 📋 Enterprise features (SSO, audit)

## 📄 License

MIT License - Copyright (c) 2025 BPMN-lite DSL Editor Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

See [LICENSE](LICENSE) file for full details.

---

<p align="center">
  Made with ❤️ by the BPMN-Lite team<br>
  <strong>Transform your business processes today!</strong><br>
  <br>
  <a href="https://github.com/oisee/bpl">GitHub</a> • 
  <a href="https://bpmn-lite.io">Website</a> • 
  <a href="https://docs.bpmn-lite.io">Documentation</a>
</p>