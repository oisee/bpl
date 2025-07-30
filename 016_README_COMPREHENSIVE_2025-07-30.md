# BPL (Business Process Modeling Language) - Comprehensive Documentation

## Table of Contents
1. [Overview](#overview)
2. [Philosophy and Design](#philosophy-and-design)
3. [Recent Fixes](#recent-fixes)
4. [Test Suite](#test-suite)
5. [Known Issues](#known-issues)
6. [Usage Guide](#usage-guide)
7. [Technical Documentation](#technical-documentation)

## Overview

BPL (Business Process Modeling Language) is a Domain-Specific Language (DSL) designed to describe business processes in a simple, intuitive text format that compiles to BPMN (Business Process Model and Notation) diagrams.

### Key Features
- Simple text-based syntax
- Lane-based organization (swimlanes)
- Gateway support for decisions
- Message flows between lanes
- Data object associations
- Automatic diagram generation via Mermaid

## Philosophy and Design

BPL follows these core principles:

### 1. **Sequential Flow**
Tasks within a lane flow sequentially by default, representing the natural progression of work within a role.

### 2. **Gateways as Control Structures**
Gateways (`?`) are decision points that control flow. They are NOT decorative - flow MUST go through them.

### 3. **Branch Semantics**
- Positive branches (`+`) represent success/continuation paths
- Negative branches (`-`) represent failure/termination paths
- Only positive branches connect to subsequent tasks by default

### 4. **Explicit Flow Control**
- Connection breaks (`---`) stop automatic flow
- End events (`!End`) terminate branches
- Messages (`send:`/`receive:`) create cross-lane communication

## Recent Fixes

### Issue #4: Unnecessary Gateway Bypass Connections ✅ FIXED

**Problem:** The parser was creating direct connections from tasks before gateways to tasks after gateway branches, completely bypassing the gateway logic.

**Example:**
```
@Developer
  receive: Review Feedback
  ?Tests Pass
    +deploy to staging
    -fix issues
  demo features
```

**Before Fix (WRONG):**
- `receive: Review Feedback` → `demo features` ❌ (bypasses gateway!)

**After Fix (CORRECT):**
- Flow must go through gateway and positive branch
- `receive: Review Feedback` → `Tests Pass` → `deploy to staging` → `demo features` ✅

## Test Suite

### Regression Test Results
- **Total Tests:** 15
- **Passing:** 11 ✅
- **Failing:** 4 ❌

### Test Files
1. `test-regression-suite.js` - Comprehensive test coverage
2. `test-business-processes.js` - Real-world scenarios
3. `test-issue-4-vscode.js` - Specific issue reproduction
4. `test-expected-behavior.js` - Behavior specification

### Failing Tests Analysis
See [TEST_FAILURES_ANALYSIS.md](TEST_FAILURES_ANALYSIS.md) for detailed analysis of the 4 failing tests.

## Known Issues

### 1. Nested Gateways
Indentation-based nesting is not properly supported:
```
?Gateway1
  +path1
    ?Gateway2    // Not recognized as nested
```

### 2. End Events in Branches
`-!End` in branches creates a branch named "!End" rather than an End event.

### 3. Default Process Creation
Parser always creates a "Default Process" even with explicit processes.

### 4. Test Implementation
Some tests have incorrect AST navigation expectations.

## Usage Guide

### Basic Syntax

#### Process Definition
```
:Process Name
```

#### Lanes (Actors/Roles)
```
@ActorName
  task1
  task2
```

#### Gateways (Decisions)
```
?Decision Name
  +positive outcome
  -negative outcome
```

#### Messages
```
@Sender
  send: Message Name

@Receiver
  receive: Message Name
```

#### Data Objects
```
#DataObject taskReference
```

#### Events
```
!Start
!End
```

#### Connection Breaks
```
---
```

### Complete Example

```bpl
:Order Processing System

@Customer
  place order
  send: Order Details
  receive: Order Confirmation
  ?Happy with order
    +make payment
    -cancel order

@Store
  receive: Order Details
  check inventory
  ?In Stock
    +process order
    -notify unavailable
  send: Order Confirmation

@Warehouse
  pick items
  pack order
  ship order

#OrderData place order
#Inventory check inventory
```

## Technical Documentation

### File Structure
```
bpl/
├── dist/
│   └── index.html          # Main application with parser
├── vscode-bpmn-lite/
│   ├── src/
│   │   ├── parser.ts       # Original parser
│   │   └── parser-fixed.ts # Fixed parser implementation
│   └── out/
│       └── parser-fixed.js # Compiled fixed parser
├── test-*.js              # Various test files
├── README.md              # Original README
├── TEST_FAILURES_ANALYSIS.md # Failing tests documentation
├── BPL_PHILOSOPHY_AND_TESTS.md # Design philosophy
└── FIX_SUMMARY.md         # Recent fixes summary
```

### Parser Architecture

The parser uses a multi-pass approach:
1. **First Pass:** Collect processes, lanes, and tasks
2. **Connection Phase:** Connect sequential tasks (with gateway logic)
3. **AST Building:** Generate Abstract Syntax Tree
4. **Output:** Mermaid diagram or other formats

### Key Methods

- `parse(text)` - Main parsing method
- `connectSequentialTasks()` - Handles automatic connections (fixed for Issue #4)
- `parseGateway()` - Processes decision points
- `parseTask()` - Handles regular tasks and messages
- `addConnection()` - Creates connections between elements

### Running Tests

```bash
# Run regression suite
node test-regression-suite.js

# Test specific issue
node test-issue-4-vscode.js

# Test business processes
node test-business-processes.js

# Test with fixed parser
node test-fixed-parser.js
```

## Contributing

When contributing to BPL:
1. Ensure gateway logic is preserved
2. Add tests for new features
3. Update documentation
4. Run the regression suite

## Future Improvements

1. **Nested Gateway Support** - Implement hierarchical decision structures
2. **Better End Event Handling** - Properly parse End events in branches
3. **Conditional Default Process** - Only create when needed
4. **Indentation Awareness** - Support Python-like indentation for structure

## References

- [Original Issue #4](https://github.com/oisee/bpl/issues/4) - Unnecessary connections bug
- [BPMN Specification](http://www.bpmn.org/) - Business Process Model and Notation
- [Mermaid Documentation](https://mermaid-js.github.io/) - Diagram generation

---

*This documentation reflects the state of BPL after fixing Issue #4. For the most recent updates, check the git repository.*