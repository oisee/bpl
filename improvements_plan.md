# BPMN-lite Parser Improvements Plan

## Current Implementation Status
The BPMN-lite parser currently supports:
- Basic BPMN elements (process, lanes, tasks, gateways, branches)
- Events (start, end)
- Data objects with associations
- Message flows (both implicit and explicit)
- Cross-lane sequential connectivity
- Whitespace-insensitive parsing and name resolution

## Resolution and Reference Challenge
Our current approach for resolving task references uses several fallback strategies with increasing complexity:
1. Direct lookup in taskScope dictionary
2. Normalized name lookup
3. Lane-qualified lookups (with/without @ prefix)
4. Direct ID format lookup (lane_task)
5. Searching tasks within specific lanes
6. Global search by name

While this works, it's complex, has potential for ambiguity, and lacks clear documentation for users.

## Improvement Goals

### 1. Standardized Reference Syntax
- Establish a clear, consistent reference syntax for all entity types
- Document the preferred format: `@Lane.task` for tasks, `#dataObject` for data objects, `^messageName` for messages
- Deprecate alternative formats while maintaining backward compatibility

### 2. Explicit Reference Resolution
- Implement a unified reference resolution mechanism for all entity types
- Clearly document resolution order and fallback strategies
- Add configurable strict mode that only accepts fully-qualified references
- Add warning messages for ambiguous references

### 3. Type-Specific Resolution
- Specialized resolution for different entity types (tasks, data objects, messages, events)
- Clear visual indicators in diagrams for entities with different reference types
- Type-specific search methods for the API (findTask, findDataObject, etc.)

### 4. Model Validation
- Validate references during parsing to detect broken links
- Check for duplicate IDs and ambiguous references
- Prevent circular references and other invalid structures
- Generate validation reports with line numbers and context

### 5. Improved Error Reporting
- Structured error objects with error codes, types, and severities
- Line number and context information for all errors
- Suggestions for fixing common errors (e.g., "Did you mean @Customer.place_order?")
- Configurable error handling (strict mode vs. warning mode)

### 6. Reference Documentation
- Generate reference documentation from the parser
- List all entity types and their reference formats
- Provide examples of correct and incorrect references
- Include best practices and common patterns

### 7. Visual Reference Resolution
- Add visual indicators for resolved references in the diagram
- Highlight unresolved or ambiguous references
- Show reference relationships on hover or click
- Enable visualization of reference chains

### 8. Smart Reference Suggestions
- Auto-completion for references in the editor
- Suggestions based on context and available entities
- Quick fix options for broken references
- Refactoring support for renaming entities and updating references

## Implementation Priorities
1. **Immediate Focus**: Unify message and data object resolution, add reference validation
2. **Short-term**: Standardize reference syntax documentation and error reporting
3. **Medium-term**: Implement model validation and reference visualization
4. **Long-term**: Add smart suggestions and refactoring support

## Technical Approach
- Create a ReferenceResolver class to centralize resolution logic
- Implement entity registries for each entity type
- Use a consistent ID generation and reference format
- Add context tracking for better error reporting
- Generate structured validation results
- Support programmatic model manipulation

## User Experience Goals
- Make references intuitive and predictable
- Provide clear feedback for resolution failures
- Enable efficient editing of complex models
- Support an evolving modeling workflow
- Balance flexibility with validation

This plan addresses the current challenges with reference resolution while laying groundwork for future enhancements to the BPMN-lite parser.