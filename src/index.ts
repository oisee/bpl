import { BpmnLiteParser } from './parser/BpmnLiteParser.js';
import { TranspilerManager } from './transpilers/TranspilerManager.js';
import { BpmnDocument } from './types/ast.js';

// Sample DSL for initial editor content
const sampleDSL = `:Order Process

@Customer
  place order
  send: Payment Information
  "Customer waits for confirmation
  receive: Order Confirmation

@System
  receive: Payment Information
  process order
  validate payment
  ?Payment successful
    +yes
    -no
  ship order
  send: Order Confirmation

^Order @Customer.place order -> @System.process order
#OrderData place order`;

/**
 * Super simple BPMN editor class
 */
export class SimpleBpmnEditor {
  private editor: HTMLTextAreaElement | null = null;
  private parser: BpmnLiteParser;
  private transpilerManager: TranspilerManager;
  private currentFormat: string = 'mermaid';
  private showAst: boolean = false;
  
  /**
   * Create a new SimpleBpmnEditor
   */
  constructor() {
    // Initialize Mermaid here to avoid race conditions
    // @ts-ignore - mermaid is loaded via script tag
    window.mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true
      }
    });
    
    this.parser = new BpmnLiteParser();
    this.transpilerManager = new TranspilerManager();
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
      this.initEditor();
      this.setupEventListeners();
    });
    
    // Also try to initialize if called after DOMContentLoaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(() => {
        this.initEditor();
        this.setupEventListeners();
      }, 1);
    }
  }
  
  /**
   * Initialize the editor (simple textarea)
   */
  private initEditor(): void {
    this.editor = document.getElementById('code-editor') as HTMLTextAreaElement;
    if (!this.editor) {
      console.error('Editor element not found');
      return;
    }
    
    // Set default content
    this.editor.value = sampleDSL;
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Format selector
    const formatSelector = document.getElementById('preview-format');
    if (formatSelector) {
      formatSelector.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.currentFormat = target.value;
        this.renderPreview();
      });
    } else {
      console.error('Format selector not found');
    }

    // Toggle AST button
    const toggleAstButton = document.getElementById('toggle-ast-button');
    if (toggleAstButton) {
      toggleAstButton.addEventListener('click', () => {
        this.showAst = !this.showAst;
        this.updatePreviewVisibility();
      });
    } else {
      console.error('Toggle AST button not found');
    }

    // Render button
    const renderButton = document.getElementById('render-button');
    if (renderButton) {
      renderButton.addEventListener('click', () => {
        this.renderPreview();
      });
    } else {
      console.error('Render button not found');
    }

    // Tab switching
    const tabs = document.querySelectorAll('.preview-tab');
    if (tabs.length > 0) {
      tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLElement;
          const tabName = target.getAttribute('data-tab');
          
          // Update active tab
          tabs.forEach(t => t.classList.remove('active'));
          target.classList.add('active');
          
          // Show/hide corresponding content
          if (tabName === 'diagram') {
            this.showAst = false;
            this.updatePreviewVisibility();
          } else if (tabName === 'ast') {
            this.showAst = true;
            this.updatePreviewVisibility();
          }
        });
      });
    } else {
      console.error('Preview tabs not found');
    }
    
    // Initial render
    this.renderPreview();
  }
  
  /**
   * Update preview visibility based on showAst flag
   */
  private updatePreviewVisibility(): void {
    const diagramPreview = document.getElementById('diagram-preview');
    const astPreview = document.getElementById('ast-preview');
    
    if (!diagramPreview || !astPreview) {
      console.error('Preview elements not found');
      return;
    }
    
    if (this.showAst) {
      diagramPreview.classList.add('hidden');
      astPreview.classList.remove('hidden');
    } else {
      diagramPreview.classList.remove('hidden');
      astPreview.classList.add('hidden');
    }
  }
  
  /**
   * Render the preview based on the current editor content
   */
  private renderPreview(): void {
    if (!this.editor) {
      console.error('Editor not initialized');
      return;
    }
    
    const code = this.editor.value;
    console.log('Parsing code...');
    
    try {
      // Parse the DSL
      const ast = this.parser.parse(code);
      console.log('AST created successfully');
      
      // Update AST preview
      this.updateAstPreview(ast);
      
      // Update diagram preview
      this.updateDiagramPreview(ast);
      
      // Hide error container
      const errorContainer = document.getElementById('error-container');
      if (errorContainer) {
        errorContainer.classList.add('hidden');
      }
    } catch (error: any) {
      console.error('BPMN-lite DSL parsing error:', error);
      
      // Show error
      const errorContainer = document.getElementById('error-container');
      if (errorContainer) {
        errorContainer.textContent = `Error: ${error.message || 'Unknown error'}`;
        errorContainer.classList.remove('hidden');
      }
    }
  }
  
  /**
   * Update the AST preview
   * @param ast The AST to display
   */
  private updateAstPreview(ast: BpmnDocument): void {
    const astPreview = document.getElementById('ast-preview');
    if (!astPreview) {
      console.error('AST preview element not found');
      return;
    }
    astPreview.textContent = JSON.stringify(ast, null, 2);
  }
  
  /**
   * Update the diagram preview
   * @param ast The AST to display
   */
  private updateDiagramPreview(ast: BpmnDocument): void {
    const mermaidPreview = document.getElementById('mermaid-preview');
    if (!mermaidPreview) {
      console.error('Mermaid preview element not found');
      return;
    }
    
    // Get the transpiled code
    const transpiled = this.transpilerManager.transpile(ast, this.currentFormat);
    console.log('Transpiled code:', transpiled);
    
    // Render the diagram
    if (this.currentFormat === 'mermaid') {
      try {
        // Clear previous diagram
        mermaidPreview.innerHTML = '';
        
        // Create a new diagram
        const diagramId = `diagram-${Date.now()}`;
        const diagramContainer = document.createElement('div');
        diagramContainer.id = diagramId;
        mermaidPreview.appendChild(diagramContainer);
        
        // Render Mermaid diagram
        // @ts-ignore - mermaid is loaded via script tag
        window.mermaid.render(diagramId, transpiled, (svgCode: string) => {
          diagramContainer.innerHTML = svgCode;
          console.log('Diagram rendered successfully');
        });
      } catch (error) {
        console.error('Error rendering Mermaid diagram:', error);
        mermaidPreview.innerHTML = `<div class="error">Error rendering diagram: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
      }
    } else {
      // For other formats, just show the code
      mermaidPreview.innerHTML = `<pre>${transpiled}</pre>`;
    }
  }
}