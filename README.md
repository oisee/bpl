# BPMN-Lite Editor

A revolutionary way to create business process diagrams - write in plain text, see beautiful diagrams instantly! 🚀

<p align="center">
  <img src="https://img.shields.io/badge/Version-0.4.0-blue.svg" alt="Version">
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

## 📖 DSL Quick Reference

### Core Elements

| Syntax | Element | Description |
|--------|---------|-------------|
| `:Process Name` | Process | Define the overall process |
| `@Department` | Lane/Pool | Group related activities |
| `  task name` | Task | Any indented line is a task |
| `?Decision` | Gateway | Decision point (XOR) |
| `+choice` | Positive Branch | Yes/True path |
| `-choice` | Negative Branch | No/False path |
| `!Start` / `!End` | Events | Process start/end points |

### Communication

| Syntax | Element | Description |
|--------|---------|-------------|
| `send: Message` | Send Task | Send a message |
| `receive: Message` | Receive Task | Wait for a message |
| `^Flow @A.task -> @B.task` | Message Flow | Explicit connection |

### Data & Annotations

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

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

<p align="center">
  Made with ❤️ by the BPMN-Lite team<br>
  <strong>Transform your business processes today!</strong>
</p>