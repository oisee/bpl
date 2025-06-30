import * as vscode from 'vscode';
import { BpmnLiteParser } from './parser';

export class BpmnLitePreviewPanel {
    public static currentPanel: BpmnLitePreviewPanel | undefined;
    private static readonly viewType = 'bpmnLitePreview';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _updateTimer: NodeJS.Timeout | undefined;

    public static createOrShow(extensionUri: vscode.Uri, column?: vscode.ViewColumn) {
        // Always prefer showing beside the editor to not block text editing
        const targetColumn = column || vscode.ViewColumn.Beside;

        // If we already have a panel, show it in the correct column
        if (BpmnLitePreviewPanel.currentPanel) {
            // Move to the target column if needed
            BpmnLitePreviewPanel.currentPanel._panel.reveal(targetColumn, true);
            BpmnLitePreviewPanel.currentPanel._update();
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            BpmnLitePreviewPanel.viewType,
            'BPMN-Lite Preview',
            targetColumn,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        // Set icon for the panel
        panel.iconPath = {
            light: vscode.Uri.joinPath(extensionUri, 'media', 'preview-light.svg'),
            dark: vscode.Uri.joinPath(extensionUri, 'media', 'preview-dark.svg')
        };

        BpmnLitePreviewPanel.currentPanel = new BpmnLitePreviewPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view state changes
        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );

        // Listen to text document changes - only update if it's the active document
        vscode.workspace.onDidChangeTextDocument(e => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && e.document === activeEditor.document && e.document.languageId === 'bpmn-lite') {
                this._scheduleUpdate();
            }
        }, null, this._disposables);

        // Listen to active editor changes
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.languageId === 'bpmn-lite') {
                this._update();
            }
        }, null, this._disposables);
        
        // Listen to save events for immediate update
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.languageId === 'bpmn-lite') {
                this._update();
            }
        }, null, this._disposables);
    }

    private _scheduleUpdate() {
        const config = vscode.workspace.getConfiguration('bpmn-lite');
        const delay = config.get<number>('preview.refreshDelay', 300);

        if (this._updateTimer) {
            clearTimeout(this._updateTimer);
        }

        this._updateTimer = setTimeout(() => {
            this._update();
        }, delay);
    }

    private _update() {
        const webview = this._panel.webview;
        
        // Get the active editor - including preview mode editors
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            // Try to find any open BPMN-Lite document
            const bplEditors = vscode.window.visibleTextEditors.filter(e => 
                e.document.languageId === 'bpmn-lite'
            );
            
            if (bplEditors.length === 0) {
                webview.html = this._getHtmlForWebview(webview, '', 'No BPMN-Lite file is open');
                return;
            }
            
            // Use the first visible BPMN-Lite editor
            const fallbackEditor = bplEditors[0];
            try {
                const parser = new BpmnLiteParser();
                const content = fallbackEditor.document.getText();
                parser.parse(content);
                const mermaid = parser.toMermaid();
                
                this._panel.title = `BPMN-Lite Preview - ${fallbackEditor.document.fileName.split('/').pop()}`;
                webview.html = this._getHtmlForWebview(webview, mermaid, '');
            } catch (error: any) {
                webview.html = this._getHtmlForWebview(webview, '', error.message);
            }
            return;
        }

        if (editor.document.languageId !== 'bpmn-lite') {
            webview.html = this._getHtmlForWebview(webview, '', 'Active file is not a BPMN-Lite file');
            return;
        }

        try {
            const parser = new BpmnLiteParser();
            const content = editor.document.getText();
            parser.parse(content);
            const mermaid = parser.toMermaid();
            
            this._panel.title = `BPMN-Lite Preview - ${editor.document.fileName.split('/').pop()}`;
            webview.html = this._getHtmlForWebview(webview, mermaid, '');
        } catch (error: any) {
            webview.html = this._getHtmlForWebview(webview, '', error.message);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview, mermaidCode: string, error: string) {
        const config = vscode.workspace.getConfiguration('bpmn-lite');
        const theme = config.get<string>('preview.theme', 'default');

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>BPMN-Lite Preview</title>
            <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                
                .controls {
                    display: flex;
                    gap: 8px;
                    padding: 8px;
                    background-color: var(--vscode-editor-background);
                    border-bottom: 1px solid var(--vscode-panel-border);
                    align-items: center;
                    flex-shrink: 0;
                }
                
                .controls button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 4px 8px;
                    cursor: pointer;
                    border-radius: 2px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .controls button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .controls button:active {
                    transform: scale(0.95);
                }
                
                .zoom-level {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    min-width: 50px;
                    text-align: center;
                }
                
                #diagram-container {
                    flex: 1;
                    overflow: auto;
                    position: relative;
                }
                
                #diagram {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100%;
                    padding: 20px;
                    transform-origin: center center;
                    transition: transform 0.1s ease-out;
                }
                
                .error {
                    color: var(--vscode-errorForeground);
                    background-color: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    padding: 10px;
                    border-radius: 4px;
                    margin: 20px;
                }
                
                .empty {
                    color: var(--vscode-descriptionForeground);
                    text-align: center;
                    padding: 50px;
                    font-style: italic;
                }
                
                .mermaid {
                    background-color: white;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                
                @media (prefers-color-scheme: dark) {
                    .mermaid {
                        background-color: #1e1e1e;
                        box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
                    }
                }
                
                /* Hide scrollbars during panning */
                .panning {
                    cursor: grabbing !important;
                }
                
                .panning * {
                    cursor: grabbing !important;
                }
            </style>
        </head>
        <body>
            ${mermaidCode ? `
            <div class="controls">
                <button onclick="panLeft()" title="Pan Left">←</button>
                <button onclick="panRight()" title="Pan Right">→</button>
                <button onclick="panUp()" title="Pan Up">↑</button>
                <button onclick="panDown()" title="Pan Down">↓</button>
                <button onclick="zoomIn()" title="Zoom In">+</button>
                <button onclick="zoomOut()" title="Zoom Out">−</button>
                <button onclick="resetZoom()" title="Reset Zoom">Reset</button>
                <button onclick="fitToWindow()" title="Fit to Window">Fit</button>
                <span class="zoom-level" id="zoomLevel">100%</span>
            </div>
            ` : ''}
            <div id="diagram-container">
                ${error 
                    ? `<div class="error">Error: ${this._escapeHtml(error)}</div>`
                    : mermaidCode
                        ? `<div id="diagram"><pre class="mermaid">${this._escapeHtml(mermaidCode)}</pre></div>`
                        : '<div class="empty">Open a .bpl file to see the preview</div>'
                }
            </div>
            
            <script>
                let currentZoom = 1;
                let currentPanX = 0;
                let currentPanY = 0;
                let isPanning = false;
                let startX = 0;
                let startY = 0;
                let scrollLeft = 0;
                let scrollTop = 0;
                
                const diagram = document.getElementById('diagram');
                const container = document.getElementById('diagram-container');
                const zoomLevelDisplay = document.getElementById('zoomLevel');
                
                function updateTransform() {
                    if (diagram) {
                        diagram.style.transform = \`scale(\${currentZoom})\`;
                        if (zoomLevelDisplay) {
                            zoomLevelDisplay.textContent = Math.round(currentZoom * 100) + '%';
                        }
                    }
                }
                
                function panLeft() {
                    container.scrollLeft -= 100;
                }
                
                function panRight() {
                    container.scrollLeft += 100;
                }
                
                function panUp() {
                    container.scrollTop -= 100;
                }
                
                function panDown() {
                    container.scrollTop += 100;
                }
                
                function zoomIn() {
                    currentZoom = Math.min(currentZoom * 1.2, 5);
                    updateTransform();
                }
                
                function zoomOut() {
                    currentZoom = Math.max(currentZoom / 1.2, 0.1);
                    updateTransform();
                }
                
                function resetZoom() {
                    currentZoom = 1;
                    updateTransform();
                    container.scrollLeft = 0;
                    container.scrollTop = 0;
                }
                
                function fitToWindow() {
                    if (!diagram) return;
                    
                    const mermaidElement = diagram.querySelector('.mermaid svg');
                    if (!mermaidElement) return;
                    
                    const containerRect = container.getBoundingClientRect();
                    const svgRect = mermaidElement.getBoundingClientRect();
                    
                    const scaleX = (containerRect.width - 40) / svgRect.width;
                    const scaleY = (containerRect.height - 40) / svgRect.height;
                    
                    currentZoom = Math.min(scaleX, scaleY, 1);
                    updateTransform();
                }
                
                // Mouse wheel zoom
                if (container) {
                    container.addEventListener('wheel', (e) => {
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            const delta = e.deltaY > 0 ? 0.9 : 1.1;
                            currentZoom = Math.max(0.1, Math.min(5, currentZoom * delta));
                            updateTransform();
                        }
                    });
                    
                    // Mouse panning
                    container.addEventListener('mousedown', (e) => {
                        if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
                            isPanning = true;
                            startX = e.pageX - container.offsetLeft;
                            startY = e.pageY - container.offsetTop;
                            scrollLeft = container.scrollLeft;
                            scrollTop = container.scrollTop;
                            container.classList.add('panning');
                            e.preventDefault();
                        }
                    });
                    
                    container.addEventListener('mousemove', (e) => {
                        if (!isPanning) return;
                        e.preventDefault();
                        const x = e.pageX - container.offsetLeft;
                        const y = e.pageY - container.offsetTop;
                        const walkX = (x - startX) * 1;
                        const walkY = (y - startY) * 1;
                        container.scrollLeft = scrollLeft - walkX;
                        container.scrollTop = scrollTop - walkY;
                    });
                    
                    container.addEventListener('mouseup', () => {
                        isPanning = false;
                        container.classList.remove('panning');
                    });
                    
                    container.addEventListener('mouseleave', () => {
                        isPanning = false;
                        container.classList.remove('panning');
                    });
                }
                
                mermaid.initialize({
                    startOnLoad: true,
                    theme: '${theme}',
                    securityLevel: 'loose',
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true,
                        curve: 'basis'
                    }
                });
                
                // Fit to window after diagram renders
                mermaid.init(undefined, document.querySelectorAll('.mermaid')).then(() => {
                    setTimeout(fitToWindow, 100);
                });
                
                // Re-render on theme change
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'updateTheme') {
                        mermaid.initialize({ theme: message.theme });
                        location.reload();
                    }
                });
            </script>
        </body>
        </html>`;
    }

    private _escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    public dispose() {
        BpmnLitePreviewPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }

        if (this._updateTimer) {
            clearTimeout(this._updateTimer);
        }
    }
}