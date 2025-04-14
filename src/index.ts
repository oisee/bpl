import { BpmnLiteParser } from './parser/BpmnLiteParser.js';
import { TranspilerManager } from './transpilers/TranspilerManager.js';
import { BpmnDocument } from './types/ast.js';

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true
  }
});

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
 * Main editor class
 */
export class BpmnLiteEditor {
  private editor!: monaco.editor.IStandaloneCodeEditor; // Using the definite assignment assertion
  private parser: BpmnLiteParser;
  private transpilerManager: TranspilerManager;
  private currentFormat: string = 'mermaid';
  private showAst: boolean = false;
  
  /**
   * Create a new BpmnLiteEditor
   */
  constructor() {
    this.parser = new BpmnLiteParser();
    this.transpilerManager = new TranspilerManager();
    
    // Initialize Monaco Editor
    this.initMonacoEditor();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initial update will happen after editor initialization
  }
  
  /**
   * Initialize Monaco Editor
   */
  private initMonacoEditor(): void {
    // Configure Monaco loader
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });
    
    // Load Monaco Editor
    require(['vs/editor/editor.main'], () => {
      // Register BPMN-lite language
      this.registerBpmnLiteLanguage();
      
      // Create editor
      this.editor = monaco.editor.create(document.getElementById('editor')!, {
        value: sampleDSL,
        language: 'bpmn-lite',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: {
          enabled: true
        }
      });
      
      // Set up change listener
      const debounce = (func: Function, delay: number) => {
        let timeoutId: number | null = null;
        return (...args: any[]) => {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func(...args), delay);
        };
      };

      const debouncedUpdatePreview = debounce(() => this.updatePreview(), 300);

      this.editor.onDidChangeModelContent(() => {
        debouncedUpdatePreview();
      });

      // Perform initial update *after* editor is created
      this.updatePreview();
    });
  }
  
  /**
   * Register BPMN-lite language in Monaco Editor
   */
  private registerBpmnLiteLanguage(): void {
    monaco.languages.register({ id: 'bpmn-lite' });
    
    monaco.languages.setMonarchTokensProvider('bpmn-lite', {
      tokenizer: {
        root: [
          [/^:.*$/, 'process'],
          [/^@.*$/, 'lane'],
          [/^\s*\?.*$/, 'gateway'],
          [/^\s*[+\-=~].*$/, 'branch'],
          [/^\s*{.*$/, 'parallel-start'],
          [/^\s*}.*$/, 'parallel-end'],
          [/^\s*!.*$/, 'event'],
          [/^\s*\[.*\]/, 'subprocess'],
          [/^\s*#.*$/, 'data-object'],
          [/^\s*\$.*$/, 'data-store'],
          [/^\s*".*$/, 'comment'],
          [/\/\/.*$/, 'technical-comment'],
        ]
      }
    });
    
    monaco.editor.defineTheme('bpmn-lite-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'process', foreground: '569cd6', fontStyle: 'bold' },
        { token: 'lane', foreground: '4ec9b0' },
        { token: 'gateway', foreground: 'c586c0' },
        { token: 'branch', foreground: 'ce9178' },
        { token: 'parallel-start', foreground: 'd7ba7d' },
        { token: 'parallel-end', foreground: 'd7ba7d' },
        { token: 'event', foreground: 'dcdcaa' },
        { token: 'subprocess', foreground: '4fc1ff' },
        { token: 'data-object', foreground: '9cdcfe' },
        { token: 'data-store', foreground: '4fc1ff' },
        { token: 'comment', foreground: '6a9955' },
        { token: 'technical-comment', foreground: '6a9955', fontStyle: 'italic' },
      ],
      colors: {}
    });
    
    monaco.editor.setTheme('bpmn-lite-theme');
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    const formatSelector = document.getElementById('preview-format') as HTMLSelectElement;
    if (formatSelector) {
        formatSelector.addEventListener('change', () => {
            console.log('Format selector changed');
            this.currentFormat = formatSelector.value;
            this.updatePreview();
        });
    } else {
        console.error('Format selector element not found');
    }

    const toggleAstButton = document.getElementById('toggle-ast') as HTMLButtonElement;
    if (toggleAstButton) {
        toggleAstButton.addEventListener('click', () => {
            console.log('AST toggle button clicked');
            this.showAst = !this.showAst;
            this.updatePreviewVisibility();
        });
    } else {
        console.error('AST toggle button element not found');
    }

    const tabs = document.querySelectorAll('.preview-tab');
    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                console.log('Tab clicked');
                const target = e.target as HTMLElement;
                const tabName = target.dataset.tab;

                tabs.forEach(t => t.classList.remove('active'));
                target.classList.add('active');

                if (tabName === 'diagram') {
                    document.getElementById('diagram-preview')?.classList.remove('hidden');
                    document.getElementById('ast-preview')?.classList.add('hidden');
                    this.showAst = false;
                } else if (tabName === 'ast') {
                    document.getElementById('diagram-preview')?.classList.add('hidden');
                    document.getElementById('ast-preview')?.classList.remove('hidden');
                    this.showAst = true;
                }
                this.updatePreview();
            });
        });
    } else {
        console.error('Preview tabs not found');
    }
  }
  
  /**
   * Update preview visibility based on showAst flag
   */
  private updatePreviewVisibility(): void {
    const diagramPreview = document.getElementById('diagram-preview')!;
    const astPreview = document.getElementById('ast-preview')!;
    const diagramTab = document.querySelector('.preview-tab[data-tab="diagram"]')!;
    const astTab = document.querySelector('.preview-tab[data-tab="ast"]')!;
    
    if (this.showAst) {
      diagramPreview.classList.add('hidden');
      astPreview.classList.remove('hidden');
      diagramTab.classList.remove('active');
      astTab.classList.add('active');
    } else {
      diagramPreview.classList.remove('hidden');
      astPreview.classList.add('hidden');
      diagramTab.classList.add('active');
      astTab.classList.remove('active');
    }
  }
  
  /**
// Log start of updatePreview
console.log('updatePreview started');
   * Update the preview
   */
  private updatePreview(): void {
    if (!this.editor) {
      return;
// Log code being parsed
const code = this.editor.getValue();
console.log('Code:', code); // Log code after assignment
    }
    
    const code = this.editor.getValue();
    
// Log before parsing
console.log('Parsing DSL...');
    try {
// Log after parsing
console.log('AST:', ast);
      // Parse the DSL
      const ast = this.parser.parse(code);
      
      // Update AST preview
      this.updateAstPreview(ast);
// Log before diagram preview update
console.log('Updating diagram preview...');
      
      // Update diagram preview
      this.updateDiagramPreview(ast);
// Log before hiding error container
console.log('Hiding error container...');
      
      // Hide error container
// Log error if caught
console.error('Error caught:', error); // Move inside catch block
      document.getElementById('error-container')!.classList.add('hidden');
    } catch (error: any) { // Type assertion for error
      // Show error
      const errorContainer = document.getElementById('error-container')!;
      errorContainer.textContent = `Error: ${error.message || 'Unknown error'}`;
      errorContainer.classList.remove('hidden');
      
      console.error('BPMN-lite DSL parsing error:', error);
    }
  }
  
  /**
   * Update the AST preview
   * @param ast The AST to display
   */
  private updateAstPreview(ast: BpmnDocument): void {
    const astPreview = document.getElementById('ast-preview')!;
    astPreview.textContent = JSON.stringify(ast, null, 2);
  }
  
  /**
   * Update the diagram preview
   * @param ast The AST to display
   */
  private updateDiagramPreview(ast: BpmnDocument): void {
    const mermaidPreview = document.getElementById('mermaid-preview')!;
    
    // Get the transpiled code
    const transpiled = this.transpilerManager.transpile(ast, this.currentFormat);
    
    // Render the diagram
    if (this.currentFormat === 'mermaid') {
      // Clear previous diagram
      mermaidPreview.innerHTML = '';
      
      // Create a new diagram
      const diagramId = `diagram-${Date.now()}`;
      const diagramContainer = document.createElement('div');
      diagramContainer.id = diagramId;
      mermaidPreview.appendChild(diagramContainer);
      
      // Render Mermaid diagram
      mermaid.render(diagramId, transpiled, (svgCode) => {
        requestAnimationFrame(() => {
          diagramContainer.innerHTML = svgCode;
        });
      });
    } else {
      // For other formats, just show the code
      mermaidPreview.innerHTML = `<pre>${transpiled}</pre>`;
    }
  }
}
// Note: The initialization is now handled in the HTML file