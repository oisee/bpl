# BPL Connectivity Guide: Understanding Flow Control

## Core Principles: Two-Layer Connectivity Model

BPL uses a powerful two-layer connectivity model:

1. **Implicit Sequential Flow** (Default Layer): Tasks flow sequentially in the order they are written, regardless of lanes
2. **Explicit Directed Flow** (Override Layer): Arrow operators (`->` and `<-`) create explicit connections that override implicit flow

This dual model provides both simplicity (most connections are automatic) and power (any connection pattern is possible).

## Mental Model: How BPL Flow Works

Think of BPL as describing a **multi-threaded process** where:

1. **The Main Thread** (Implicit Flow):
   - Reads tasks top-to-bottom, left-to-right
   - Connects each task to the previous one automatically
   - Crosses lanes seamlessly (lanes are just "who does it" labels)
   - Like water flowing downhill - it follows the natural path

2. **Jump Instructions** (Explicit Arrows):
   - `->` means "ALSO connect to..." (fork/branch)
   - `<-` means "ALSO get connection from..." (merge/join)
   - These are ADDITIONAL paths, not replacements
   - Like teleportation portals - they add new paths without breaking the main flow

3. **Task Resolution** (Finding Connection Targets):
   - `TaskName` - finds task in current lane, then searches other lanes
   - `@Lane.TaskName` - directly addresses task in specific lane
   - `Lane.TaskName` - same as above, @ is optional for FQN
   - Tasks can be referenced before they're defined (forward references)

4. **Connection Rules**:
   - Every task gets implicit connection from previous task (unless after `---`)
   - Every task can have unlimited explicit connections (in or out)
   - Arrows can chain: `A -> B -> C` creates A→B and B→C
   - Arrows can split: `A -> B -> C <- D` creates A→B, B→C, and D→C
   - Arrows work in any direction, any distance, any lane

### Visual Metaphor

Imagine a **subway map** where:
- Stations (tasks) are connected by default tracks (implicit flow)
- Express tunnels (arrows) create shortcuts and alternative routes
- Different colored lines (lanes) show which company operates each station
- Passengers (process tokens) can take any available route
- Some stations are hubs with many connections

## Key Concepts

### 1. Sequential Flow
- Tasks connect in the order they appear in the DSL
- The parser should read tasks top-to-bottom and connect them sequentially
- Lane boundaries do NOT interrupt sequential flow

### 2. Lanes as Attributes
- A lane (@Customer, @System, etc.) is just an attribute of a task
- It indicates the performer/actor/role responsible for the task
- It does NOT determine connectivity

### 3. Natural Lane Switches
- When sequential tasks belong to different lanes, this represents a handoff
- These handoffs are natural parts of business processes
- No special syntax needed - the flow naturally crosses lanes

## Expected Connectivity Rules

### Rule 1: Basic Sequential Connection
```
@Customer
  Task A
  Task B        <-- connects to Task A (same lane)
```

### Rule 2: Lane Switch Connection
```
@Customer
  Task A        
@System
  Task B        <-- connects to Task A (different lane)
```

### Rule 3: Mid-Lane Switches
```
@Customer
  Task A
  Task B
  Task C        <-- connects to Task B
@System  
  Task D        <-- connects to Task C (lane switch)
  Task E        <-- connects to Task D
@Customer
  Task F        <-- connects to Task E (lane switch back)
```

### Rule 4: Gateways and Branches
- Gateway branches follow their own paths
- After branches merge, flow continues sequentially

```
@System
  Task A
  ?Gateway
    +Branch 1
    -Branch 2
  Task B        <-- both branches connect here
@Customer
  Task C        <-- connects to Task B (lane switch)
```

### Rule 5: Explicit Connections (-> and <-)

Explicit connections are the most powerful feature of BPL. They allow complete control over process flow.

#### 5.1 Forward Arrow (->)
Creates connection from current element to target(s):

```
@Customer
  Task A -> Task C    <-- A connects to C (not to B)
  Task B              <-- B still connects to A (implicit flow continues)
@System
  Task C -> Task D    <-- C connects to D
  Task D
```

#### 5.2 Backward Arrow (<-)
Creates connection from target to current element:

```
@Customer
  Task A
  Task B <- Task D    <-- D connects to B
  Task C              <-- C connects to B (implicit flow)
@System
  Task D              <-- D explicitly connects back to B
```

#### 5.3 Multiple Connections
Any element can have multiple explicit connections:

```
@Customer
  Task A -> Task C -> Task E    <-- chained connections
  Task B -> Task D <- Task F    <-- B connects to D, F connects to D
  Task C
@System
  Task D
  Task E <- Task A -> Task F    <-- A connects to both E and F
  Task F
```

#### 5.4 Cross-Lane Connections with FQN
Use Fully Qualified Names (@Lane.Task or Lane.Task) for clarity:

```
@Customer
  Place Order -> @System.Validate Order -> @Manager.Approve
  Wait for Result
@System
  Validate Order -> @Audit.Log Entry
  Process Payment <- @Customer.Wait for Result
@Manager
  Approve -> @System.Process Payment
@Audit
  Log Entry
```

#### 5.5 Mixed Implicit/Explicit Flow
Explicit connections supplement (don't replace) implicit flow:

```
@Customer
  Task A              <-- Start
  Task B -> Task E    <-- B connects to C (implicit) AND to E (explicit)  
  Task C              <-- C connects to D (implicit)
  Task D
  Task E              <-- E receives connection from B
```

#### 5.6 Connection Precedence Rules
1. Explicit connections are ADDITIONAL to implicit flow
2. An element can have multiple outgoing connections
3. An element can have multiple incoming connections
4. Explicit connections can go forward or backward in the flow
5. Explicit connections can cross any number of lanes

### Rule 6: Message Flows
- Message flows (send/receive pairs) create additional connections
- These are IN ADDITION to sequential flow
- They represent asynchronous communication between lanes

```
@Customer
  send: Payment       <-- connects sequentially to next task AND creates message flow
  Task B              
@System
  receive: Payment    <-- receives message flow AND connects to previous task
```

### Rule 7: Connection Breaks (---)
- Three or more dashes interrupt sequential flow
- Used to separate independent process segments
- No automatic connections across breaks

```
@Customer
  Task A
  Task B        <-- connects to Task A
---             
  Task C        <-- does NOT connect to Task B
```

### Rule 8: Events
- Start events connect to the first task
- End events receive connections from final tasks
- Process-level events (Start/End) exist outside lanes

## Implementation Guidelines

### For Parser Developers

#### Phase 1: Parse and Store
1. **Read all elements sequentially**, storing:
   - Element content and type
   - Lane assignment
   - Line number (for break detection)
   - Any explicit arrow expressions

2. **Build element registry** with multiple access patterns:
   - By ID (lane_taskname)
   - By simple name (for current-lane lookup)
   - By FQN (lane.taskname with and without @)
   - Support forward references

#### Phase 2: Create Connections
1. **Implicit Flow** (do this FIRST):
   ```
   for each element in sequence:
     if not first element and no break before this:
       connect previous element -> this element
   ```

2. **Explicit Arrows** (do this SECOND):
   ```
   for each element with arrow expressions:
     parse arrow expression (can have multiple -> and <- in one line)
     for each arrow operation:
       resolve target element (using name resolution rules)
       create additional connection
   ```

3. **Message Flows** (do this THIRD):
   - Match send/receive pairs by message name
   - Create message flow connections

#### Phase 3: Name Resolution Algorithm
```
resolveElement(name, currentLane):
  // 1. Check if it's FQN
  if name contains '.' or '@':
    extract lane and task parts
    return lookup by exact FQN
  
  // 2. Try current lane first
  if currentLane:
    try lookup: currentLane + '_' + name
    if found: return it
  
  // 3. Search all lanes in order
  for each lane in document order:
    try lookup: lane + '_' + name
    if found: return it
  
  // 4. Create implicit task if needed
  if creating implicit tasks enabled:
    create task in current lane
    return new task
  
  return null
```

#### Critical Implementation Notes

1. **Arrows create ADDITIONAL connections**: Don't skip implicit flow when you see arrows
2. **Support chaining**: `A -> B -> C` means A→B and B→C
3. **Support multiple targets**: `A -> B -> C <- D` is valid
4. **Forward references**: Task can reference another task defined later
5. **Break detection**: Track line numbers to detect `---` breaks
6. **Gateway handling**: Gateways still create branches, but branches can have arrows too

### For DSL Authors

1. **Write Tasks in Execution Order**: The order you write tasks is the order they execute
2. **Use Lanes to Show Responsibility**: Lanes show WHO does what, not WHEN
3. **Let Flow Cross Lanes Naturally**: Don't worry about lane boundaries
4. **Use Connection Breaks Sparingly**: Only when you need to separate independent flows

## Advanced Examples

### Example 1: Complex Multi-Path Process
```
@Frontend
  Receive Request -> @Backend.Validate Data -> @Security.Check Auth
  Show Loading     
  Display Result <- @Backend.Send Response
  
@Backend  
  Validate Data -> @Logger.Log Request
  Check Business Rules <- @Security.Check Auth
  Process Data -> Send Response -> @Logger.Log Response
  Send Response -> @Monitor.Track Metrics
  
@Security
  Check Auth -> Verify Token -> @Backend.Check Business Rules
  
@Logger
  Log Request
  Log Response <- @Monitor.Track Metrics
  
@Monitor
  Track Metrics
```

### Example 2: Bidirectional Flow with Loops
```
@User
  Start Process -> Enter Data -> @System.Validate
  Fix Errors <- @System.Validation Failed
  Review Results <- @System.Validation Passed
  Confirm -> @System.Process
  
@System
  Validate -> ?Valid?
    +Validation Passed
    -Validation Failed -> @User.Fix Errors -> @User.Enter Data
  Process <- @User.Confirm
```

### Example 3: Event-Driven with Multiple Triggers
```
@OrderService
  New Order -> @Inventory.Reserve Items -> @Payment.Charge Card
  New Order -> @Notification.Send Email
  New Order -> @Analytics.Track Event
  
  Cancel Order <- @Customer.Request Cancel
  Cancel Order <- @Payment.Payment Failed
  Cancel Order -> @Inventory.Release Items
  Cancel Order -> @Notification.Send Cancellation
  
@Customer
  Request Cancel
  
@Payment
  Charge Card -> ?Success?
    +Payment Success -> @OrderService.Ship Order
    -Payment Failed
    
@Inventory
  Reserve Items
  Release Items
  
@OrderService  
  Ship Order -> @Shipping.Create Label
```

## Common Patterns
```
@Customer
  submit request
  wait for response
@System
  process request
  send response
@Customer
  receive response
  continue process
```

### Pattern 2: Multi-Actor Approval Flow
```
@Requester
  submit request
@Manager
  review request
  ?Approve?
    +approve
    -reject -> notify requester
@Finance
  process payment
@Requester
  receive confirmation
```

### Pattern 3: Parallel Processing with Handoffs
```
@Frontend
  receive order
  validate data
@Backend
  process order
  update inventory
@Shipping
  prepare shipment
  send tracking
@Frontend
  notify customer
```

## Summary: The Complete BPL Flow Model

The BPL connectivity model combines simplicity with unlimited flexibility:

### Default Behavior (Zero Configuration)
- Tasks flow sequentially as written
- Flow crosses lanes automatically
- Matching send/receive pairs connect
- It "just works" for 90% of cases

### Power Features (When Needed)
- `->` and `<-` create any connection pattern imaginable
- Multiple paths, loops, and complex flows are trivial to express
- Forward references and cross-lane connections work naturally
- Every element can be a hub with multiple inputs/outputs

### Key Insights
1. **Lanes are attributes, not containers** - they just label "who does what"
2. **Implicit flow is always active** - arrows add paths, don't replace them
3. **Any graph topology is possible** - linear, branching, merging, cyclic
4. **The syntax matches how we think** - describe the process naturally

This model mirrors how work actually flows in organizations - sometimes sequential, sometimes parallel, always crossing boundaries between people and systems. The syntax stays out of your way for simple flows but gives you complete control when you need it.