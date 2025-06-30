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
        const activeColumn = column || (vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined);

        // If we already have a panel, show it
        if (BpmnLitePreviewPanel.currentPanel) {
            BpmnLitePreviewPanel.currentPanel._panel.reveal(activeColumn);
            BpmnLitePreviewPanel.currentPanel._update();
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            BpmnLitePreviewPanel.viewType,
            'BPMN-Lite Preview',
            activeColumn || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

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

        // Listen to text document changes
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.languageId === 'bpmn-lite') {
                this._scheduleUpdate();
            }
        }, null, this._disposables);

        // Listen to active editor changes
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.languageId === 'bpmn-lite') {
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
        
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'bpmn-lite') {
            webview.html = this._getHtmlForWebview(webview, '', 'No BPMN-Lite file is open');
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
                    padding: 20px;
                    margin: 0;
                    overflow: auto;
                }
                
                #diagram {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 400px;
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
            </style>
        </head>
        <body>
            ${error 
                ? `<div class="error">Error: ${this._escapeHtml(error)}</div>`
                : mermaidCode
                    ? `<div id="diagram"><pre class="mermaid">${this._escapeHtml(mermaidCode)}</pre></div>`
                    : '<div class="empty">Open a .bpl file to see the preview</div>'
            }
            
            <script>
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