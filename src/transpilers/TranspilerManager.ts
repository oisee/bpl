import { BpmnDocument } from '../types/ast.js';
import { ITranspiler, MermaidTranspiler } from './MermaidTranspiler.js';

/**
 * Manager for transpilers
 */
export class TranspilerManager {
  private transpilers: Map<string, ITranspiler> = new Map();
  
  /**
   * Create a new TranspilerManager
   */
  constructor() {
    // Register default transpilers
    this.registerTranspiler('mermaid', new MermaidTranspiler());
    this.registerTranspiler('dot', this.createDotStub());
    this.registerTranspiler('bpmn', this.createBpmnStub());
  }
  
  /**
   * Register a transpiler
   * @param name The name of the transpiler
   * @param transpiler The transpiler to register
   */
  registerTranspiler(name: string, transpiler: ITranspiler): void {
    this.transpilers.set(name, transpiler);
  }
  
  /**
   * Get a transpiler by name
   * @param name The name of the transpiler
   * @returns The transpiler
   */
  getTranspiler(name: string): ITranspiler {
    const transpiler = this.transpilers.get(name);
    if (!transpiler) {
      throw new Error(`Transpiler for format '${name}' not found`);
    }
    return transpiler;
  }
  
  /**
   * Get all available transpiler formats
   * @returns Array of available formats
   */
  getAvailableFormats(): string[] {
    return Array.from(this.transpilers.keys());
  }
  
  /**
   * Transpile a BPMN document to a specific format
   * @param ast The AST to transpile
   * @param format The format to transpile to
   * @returns The transpiled output
   */
  transpile(ast: BpmnDocument, format: string): string {
    return this.getTranspiler(format).transpile(ast);
  }
  
  /**
   * Create a stub for DOT transpiler
   * @returns A stub transpiler
   */
  private createDotStub(): ITranspiler {
    return {
      transpile: (ast: BpmnDocument): string => {
        return `digraph G {
  // This is a stub for DOT transpiler
  // It will be implemented in the future
  node [shape=box];
  "DOT Transpiler" [label="DOT Transpiler\\nNot yet implemented"];
}`;
      },
      getOutputFormat: (): string => 'dot',
      supportsDynamicPreview: (): boolean => false
    };
  }
  
  /**
   * Create a stub for BPMN transpiler
   * @returns A stub transpiler
   */
  private createBpmnStub(): ITranspiler {
    return {
      transpile: (ast: BpmnDocument): string => {
        return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_stub"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <!-- This is a stub for BPMN transpiler -->
  <!-- It will be implemented in the future -->
  <bpmn:process id="Process_stub" isExecutable="false">
    <bpmn:task id="Task_stub" name="BPMN Transpiler Not Yet Implemented" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_stub">
    <bpmndi:BPMNPlane id="BPMNPlane_stub" bpmnElement="Process_stub">
      <bpmndi:BPMNShape id="Task_stub_di" bpmnElement="Task_stub">
        <dc:Bounds x="160" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
      },
      getOutputFormat: (): string => 'bpmn',
      supportsDynamicPreview: (): boolean => false
    };
  }
}