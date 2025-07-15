# BPL Parser Test Suite

This directory contains comprehensive tests for the BPL (Business Process Language) parser.

## Test Files

### Main Test Suite
- **test-suite.js** - Comprehensive test suite covering all parser features

### Legacy Tests (in parent directory)
- **test-parser.js** - Original connection resolution tests
- **../test-*.js** - Various legacy test files

## Running Tests

```bash
# Run all tests
npm test

# Run tests with verbose output
npm test:verbose

# Run specific legacy tests
node test-parser.js
```

## Test Categories

### 1. Basic Parsing
- Simple task parsing
- Process definition
- Multiple lanes
- Send/receive tasks

### 2. Arrow Operators
- Forward arrow operator (->)
- Backward arrow operator (<-)
- Multiple arrows in chain
- Backward arrow chain

### 3. Cross-Lane References
- Cross-lane forward reference
- Cross-lane backward reference
- Cross-lane implicit task creation

### 4. Gateways
- Simple gateway parsing
- Gateway with End events
- Gateway branch connections

### 5. Process Events
- Process Start event
- Process End event
- Event connections

### 6. Message Flows
- Basic message flow
- Complex message flow
- Send/receive matching

### 7. Data Objects
- Data object association
- Data object connections

### 8. Connection Breaks
- Connection break prevents linking
- Break isolation

### 9. Edge Cases
- Empty lines handling
- Special characters in names
- Mixed arrow directions

### 10. Performance
- Large process parsing
- Performance benchmarks

### 11. Mermaid Output
- Mermaid output generation
- Output format validation

## Test Coverage

The test suite covers:
- ✅ Basic task parsing and lane management
- ✅ Arrow operators (forward and backward)
- ✅ Cross-lane references and implicit task creation
- ✅ Gateway parsing and branch handling
- ✅ Process events (Start/End)
- ✅ Message flows between lanes
- ✅ Data object associations
- ✅ Connection breaks
- ✅ Edge cases and error handling
- ✅ Performance testing
- ✅ Mermaid output generation

## Adding New Tests

To add a new test:

1. Open `test-suite.js`
2. Add a new test using `runner.addTest(name, category, testFn)`
3. Use the helper functions for assertions:
   - `expectTaskExists(parser, taskId, taskName?)`
   - `expectConnection(connections, sourceRef, targetRef, type?)`
   - `findConnection(connections, sourceRef, targetRef)`
   - `findMessageFlow(connections, sourceRef, targetRef)`
   - `findDataAssociation(connections, sourceRef, targetRef)`

## Test Result Format

Tests return objects with:
- `success: boolean` - Whether the test passed
- `message?: string` - Error message if test failed

Example:
```javascript
runner.addTest('My test', 'Category', () => {
  const parser = new BpmnLiteParser();
  const bpl = ':Process\n@Lane\n  Task';
  const ast = parser.parse(bpl);
  
  expectTaskExists(parser, 'lane_task', 'Task');
  
  return { success: true };
});
```