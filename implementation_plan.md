# Implementation Plan for BPMN-lite DSL Editor

## Objective
Develop a BPMN-lite DSL editor with real-time preview capabilities for multiple formats, focusing initially on Mermaid.

## Key Features
- Text editor for BPMN-lite DSL.
- Real-time rendering to Mermaid.
- Modular architecture to support additional backends.
- Error handling and syntax validation.

## Step 1: Implement the Core Components for Mermaid
- **Parser**: Develop a `BpmnLiteParser` class to convert the DSL text into an AST. This will be the key function for online text-to-AST translation.
- **AST Structure**: Define the AST structure using TypeScript interfaces for processes, lanes, tasks, etc.
- **MermaidTranspiler**: Implement a transpiler to convert the AST into Mermaid syntax for rendering.

## Step 2: Develop the User Interface
- **Editor Integration**: Use Monaco Editor for the DSL input with syntax highlighting.
- **Preview Pane**: Create a preview pane to display the Mermaid diagram.
- **AST Preview**: Add a simple switch in the UI to toggle between the Mermaid diagram and the AST JSON view.

## Step 3: Implement Stubs for Other Transpilers
- **DotTranspiler**: Create a stub that returns a placeholder message.
- **BpmnIoTranspiler**: Create a stub that returns a placeholder message.

## Key Function for Online Text-to-AST Translation
- **Function/Method**: `parse(input: string): BpmnDocument`
  - **Class**: `BpmnLiteParser`
  - **Purpose**: Tokenizes and parses the DSL input to generate an AST.
  - **Usage**: This function will be called whenever the text in the editor changes to update the AST and subsequently the Mermaid diagram.

## Example Code Snippet for `BpmnLiteParser`
```typescript
class BpmnLiteParser {
  parse(input: string): BpmnDocument {
    const lines = input.split('\n');
    const document: BpmnDocument = { processes: [], comments: [] };
    
    // Basic parsing logic
    // ...

    return document;
  }
  
  // Helper parsing methods
  private parseProcess(lines: string[]): Process { /* ... */ }
  private parseLane(lines: string[]): Lane { /* ... */ }
  // ...
}
```

## AST Preview Implementation
- **UI Component**: Add a toggle button in the UI to switch between the Mermaid diagram and the AST JSON view.
- **Functionality**: When toggled, display the JSON representation of the AST in a separate pane or overlay.

## Future Enhancements
- **Additional Backends**: Plan for adding more rendering backends like PlantUML or JSON.
- **Advanced Features**: Consider features like drag-and-drop editing, export options, and collaborative editing.