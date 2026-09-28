# BPL Issue Resolution Tests

This document provides test cases that prove the resolution of reported issues in the BPL parser.

## Issue #4: Unnecessary Connection Between Tasks (Gateway Bypass)

### Problem Description
The parser was creating direct connections from tasks before gateways to tasks after gateway branches, completely bypassing the gateway logic.

### Test Case
```bpl
:Sprint Development Process

@Developer
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features
```

### Expected Behavior
- `receive: Review Feedback` → `Tests Pass` (gateway)
- `Tests Pass` → `deploy to staging` (positive branch)
- `Tests Pass` → `fix issues` (negative branch)  
- `deploy to staging` → `demo features`
- NO direct connection from `receive: Review Feedback` to `demo features`

### Resolution Proof
The parser now correctly:
1. Tracks tasks that appear before gateways
2. Prevents direct connections that would bypass gateway control flow
3. Ensures all flow goes through the gateway decision point

### Test Code
```javascript
// Test Issue #4 - Gateway Bypass Prevention
const testGatewayBypass = {
  name: "Issue #4: Gateway Bypass Prevention",
  dsl: `:Process
@Developer
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features`,
  expectedConnections: [
    { from: "developer_receive__review_feedback", to: "developer_tests_pass", type: "sequenceFlow" },
    { from: "developer_tests_pass", to: "developer_deploy_to_staging", type: "sequenceFlow" },
    { from: "developer_tests_pass", to: "developer_fix_issues", type: "sequenceFlow" },
    { from: "developer_deploy_to_staging", to: "developer_demo_features", type: "sequenceFlow" }
    // NO connection from receive_review_feedback to demo_features
  ]
};
```

## Issue: Cross-Lane Sequential Flow

### Problem Description
The original parser treated lanes as isolated containers, not allowing natural flow between lanes.

### Test Case
```bpl
:Process Name
@Customer
  place order
  send: Payment
  Confirmation 1
@System
  receive: Payment
  process payment
  Confirmation 2
@Customer
  final task
```

### Expected Behavior
- Flow should naturally cross lanes following document order
- `Confirmation 1` → `receive: Payment` (lane switch)
- `Confirmation 2` → `final task` (lane switch back)

### Resolution Proof
With our new connectivity model:
- Tasks connect sequentially regardless of lane boundaries
- Lanes are treated as attributes (WHO does the task) not flow containers
- Natural handoffs between actors are preserved

### Test Code
```javascript
// Test Cross-Lane Flow
const testCrossLaneFlow = {
  name: "Cross-Lane Sequential Flow",
  dsl: `:Process
@Customer
  Task A
  Task B
@System
  Task C
  Task D
@Customer
  Task E`,
  expectedConnections: [
    { from: "customer_task_a", to: "customer_task_b", type: "sequenceFlow" },
    { from: "customer_task_b", to: "system_task_c", type: "sequenceFlow" },
    { from: "system_task_c", to: "system_task_d", type: "sequenceFlow" },
    { from: "system_task_d", to: "customer_task_e", type: "sequenceFlow" }
  ]
};
```

## Issue: Message Flow Connections

### Problem Description
Send/receive task pairs should automatically create message flows.

### Test Case
```bpl
:Order Process
@Customer
  place order
  send: Payment Information
@System
  receive: Payment Information
  process payment
  send: Order Confirmation
@Customer
  receive: Order Confirmation
```

### Expected Behavior
- Automatic message flows between matching send/receive pairs
- Message flows are IN ADDITION to sequential flow

### Resolution Proof
The parser now:
- Matches send/receive tasks by message name
- Creates both sequential AND message flow connections
- Respects connection breaks for message flows

### Test Code
```javascript
// Test Message Flows
const testMessageFlows = {
  name: "Automatic Message Flow Connections",
  dsl: `:Process
@Customer
  send: Payment
  wait
@System
  receive: Payment
  process`,
  expectedConnections: [
    // Sequential flow
    { from: "customer_send__payment", to: "customer_wait", type: "sequenceFlow" },
    { from: "customer_wait", to: "system_receive__payment", type: "sequenceFlow" },
    { from: "system_receive__payment", to: "system_process", type: "sequenceFlow" },
    // Message flow
    { from: "customer_send__payment", to: "system_receive__payment", type: "messageFlow" }
  ]
};
```

## Issue: Explicit Arrow Connections

### Problem Description
Arrow operators (-> and <-) should create additional connections, not replace implicit flow.

### Test Case
```bpl
:Complex Process
@Customer
  Task A -> Task C
  Task B
  Task C <- Task E
@System
  Task D -> @Customer.Task B
  Task E
```

### Expected Behavior
- Implicit sequential flow continues (A→B→C→D→E)
- Explicit arrows create ADDITIONAL connections
- Cross-lane references work with FQN

### Resolution Proof
The new parser:
- Maintains implicit sequential flow
- Adds explicit connections as extras
- Resolves cross-lane references correctly
- Supports chaining (A -> B -> C)

### Test Code
```javascript
// Test Explicit Arrows
const testExplicitArrows = {
  name: "Explicit Arrow Connections",
  dsl: `:Process
@Customer
  Task A -> Task C
  Task B
  Task C
@System
  Task D <- @Customer.Task B`,
  expectedConnections: [
    // Implicit flow
    { from: "customer_task_a", to: "customer_task_b", type: "sequenceFlow" },
    { from: "customer_task_b", to: "customer_task_c", type: "sequenceFlow" },
    { from: "customer_task_c", to: "system_task_d", type: "sequenceFlow" },
    // Explicit arrows
    { from: "customer_task_a", to: "customer_task_c", type: "sequenceFlow" },
    { from: "customer_task_b", to: "system_task_d", type: "sequenceFlow" }
  ]
};
```

## Issue: Connection Breaks

### Problem Description
Three dashes (---) should break sequential flow.

### Test Case
```bpl
:Process with Break
@Customer
  Task A
  Task B
---
  Task C
  Task D
```

### Expected Behavior
- Task A → Task B
- NO connection from Task B to Task C
- Task C → Task D

### Resolution Proof
The parser now:
- Detects connection break lines
- Prevents implicit connections across breaks
- Maintains separate flow segments

### Test Code
```javascript
// Test Connection Breaks
const testConnectionBreak = {
  name: "Connection Break Handling",
  dsl: `:Process
@Customer
  Task A
  Task B
---
  Task C
  Task D`,
  expectedConnections: [
    { from: "customer_task_a", to: "customer_task_b", type: "sequenceFlow" },
    { from: "customer_task_c", to: "customer_task_d", type: "sequenceFlow" }
    // NO connection between B and C
  ]
};
```

## Running the Tests

All these test cases are included in `test-connectivity.js` and can be run with:

```bash
npm run build
node test-parser-node.js
```

Or open `dist/index.html` in a browser to see live test results.

## Summary

The BPL parser has been enhanced to resolve all major connectivity issues:

1. **Issue #4 (Gateway Bypass)** - ✅ Fixed by tracking gateway context
2. **Cross-Lane Flow** - ✅ Fixed with new sequential model
3. **Message Flows** - ✅ Automatic matching implemented
4. **Explicit Arrows** - ✅ Additional connections, not replacements
5. **Connection Breaks** - ✅ Properly respected

The parser now implements a robust two-layer connectivity model that handles both simple linear processes and complex multi-path flows correctly.