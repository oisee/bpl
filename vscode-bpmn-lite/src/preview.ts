import * as vscode from 'vscode';
import { BpmnLiteParser } from './parser';
import * as sharp from 'sharp';

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
            async message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'exportPNG':
                        await this._exportPNG(message.svgData, message.dpi);
                        return;
                    case 'exportSVG':
                        await this._exportSVG(message.svgData);
                        return;
                    case 'exportMermaid':
                        await this._exportMermaid(message.mermaidCode);
                        return;
                    case 'exportXLSX':
                        await this._exportXLSX(message.ast);
                        return;
                    case 'exportBPMN':
                        await this._exportBPMN(message.ast);
                        return;
                    case 'getAST':
                        this._sendAST();
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
                webview.html = this._getHtmlForWebview(webview, '', 'No BPMN-Lite file is open', null);
                return;
            }
            
            // Use the first visible BPMN-Lite editor
            const fallbackEditor = bplEditors[0];
            try {
                const parser = new BpmnLiteParser();
                const content = fallbackEditor.document.getText();
                const ast = parser.parse(content);
                const mermaid = parser.toMermaid();
                
                this._panel.title = `BPMN-Lite Preview - ${fallbackEditor.document.fileName.split('/').pop()}`;
                webview.html = this._getHtmlForWebview(webview, mermaid, '', ast);
            } catch (error: any) {
                webview.html = this._getHtmlForWebview(webview, '', error.message, null);
            }
            return;
        }

        if (editor.document.languageId !== 'bpmn-lite') {
            webview.html = this._getHtmlForWebview(webview, '', 'Active file is not a BPMN-Lite file', null);
            return;
        }

        try {
            const parser = new BpmnLiteParser();
            const content = editor.document.getText();
            const ast = parser.parse(content);
            const mermaid = parser.toMermaid();
            
            this._panel.title = `BPMN-Lite Preview - ${editor.document.fileName.split('/').pop()}`;
            webview.html = this._getHtmlForWebview(webview, mermaid, '', ast);
        } catch (error: any) {
            webview.html = this._getHtmlForWebview(webview, '', error.message, null);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview, mermaidCode: string, error: string, ast: any) {
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
                
                .export-menu {
                    position: relative;
                    display: inline-block;
                }
                
                .export-dropdown {
                    display: none;
                    position: absolute;
                    background-color: var(--vscode-dropdown-background);
                    min-width: 180px;
                    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
                    z-index: 1000;
                    border: 1px solid var(--vscode-dropdown-border);
                    border-radius: 2px;
                    top: 100%;
                    left: 0;
                    margin-top: 2px;
                }
                
                .export-dropdown button {
                    width: 100%;
                    text-align: left;
                    padding: 8px 12px;
                    border: none;
                    border-radius: 0;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                
                .export-dropdown button:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                
                .export-dropdown button:first-child {
                    border-radius: 2px 2px 0 0;
                }
                
                .export-dropdown button:last-child {
                    border-radius: 0 0 2px 2px;
                }
                
                .export-menu.active .export-dropdown {
                    display: block;
                }
            </style>
        </head>
        <body>
            ${mermaidCode ? `
            <div class="controls">
                <div class="export-menu" id="exportMenu">
                    <button onclick="toggleExportMenu()" title="Export Options">☰ Export</button>
                    <div class="export-dropdown">
                        <button onclick="exportPNG()" title="Export as PNG">📷 PNG Image</button>
                        <button onclick="exportSVG()" title="Export as SVG">🎨 SVG Vector</button>
                        <button onclick="exportMermaid()" title="Export as Mermaid">📊 Mermaid Code</button>
                        <button onclick="exportXLSX()" title="Export for Visio">📈 Excel (Visio)</button>
                        <button onclick="exportBPMN()" title="Export as BPMN">📋 BPMN XML</button>
                    </div>
                </div>
                <span style="margin: 0 10px;">|</span>
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
                let currentAST = ${ast ? JSON.stringify(ast) : 'null'};
                let currentMermaidCode = ${mermaidCode ? JSON.stringify(mermaidCode) : '""'};
                
                const vscode = acquireVsCodeApi();
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
                
                // Toggle export menu
                function toggleExportMenu() {
                    const menu = document.getElementById('exportMenu');
                    menu.classList.toggle('active');
                }
                
                // Close dropdown when clicking outside
                window.addEventListener('click', function(event) {
                    if (!event.target.matches('#exportMenu button')) {
                        const menu = document.getElementById('exportMenu');
                        if (menu && menu.classList.contains('active')) {
                            menu.classList.remove('active');
                        }
                    }
                });
                
                // Export functions
                function exportPNG() {
                    const svgElement = document.querySelector('.mermaid svg');
                    if (!svgElement) {
                        vscode.postMessage({ command: 'alert', text: 'No diagram to export' });
                        return;
                    }
                    
                    // Get user input for DPI
                    const dpi = prompt('Enter DPI for PNG export (default: 300):', '300');
                    if (!dpi) return;
                    
                    const svgData = new XMLSerializer().serializeToString(svgElement);
                    vscode.postMessage({ 
                        command: 'exportPNG', 
                        svgData: svgData,
                        dpi: parseInt(dpi) || 300
                    });
                }
                
                function exportSVG() {
                    const svgElement = document.querySelector('.mermaid svg');
                    if (!svgElement) {
                        vscode.postMessage({ command: 'alert', text: 'No diagram to export' });
                        return;
                    }
                    
                    const svgData = new XMLSerializer().serializeToString(svgElement);
                    vscode.postMessage({ command: 'exportSVG', svgData: svgData });
                }
                
                function exportMermaid() {
                    if (!currentMermaidCode) {
                        vscode.postMessage({ command: 'alert', text: 'No Mermaid code to export' });
                        return;
                    }
                    
                    vscode.postMessage({ command: 'exportMermaid', mermaidCode: currentMermaidCode });
                }
                
                function exportXLSX() {
                    if (!currentAST) {
                        vscode.postMessage({ command: 'alert', text: 'No AST to export' });
                        return;
                    }
                    
                    vscode.postMessage({ command: 'exportXLSX', ast: currentAST });
                }
                
                function exportBPMN() {
                    if (!currentAST) {
                        vscode.postMessage({ command: 'alert', text: 'No AST to export' });
                        return;
                    }
                    
                    vscode.postMessage({ command: 'exportBPMN', ast: currentAST });
                }
                
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

    private getDefaultExportPath(extension: string): vscode.Uri {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.languageId === 'bpmn-lite') {
            const bplPath = activeEditor.document.fileName;
            const baseName = bplPath.replace(/\.bpl$/, '');
            return vscode.Uri.file(`${baseName}.${extension}`);
        }
        return vscode.Uri.file(`diagram.${extension}`);
    }

    private async _exportPNG(svgData: string, dpi: number) {
        try {
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: this.getDefaultExportPath('png'),
                filters: { 'PNG Image': ['png'] }
            });
            
            if (!saveUri) return;
            
            // Convert SVG to PNG using sharp
            const density = Math.round(dpi); // DPI for sharp
            const pngBuffer = await sharp(Buffer.from(svgData, 'utf8'), { density })
                .png()
                .toBuffer();
            
            await vscode.workspace.fs.writeFile(saveUri, pngBuffer);
            vscode.window.showInformationMessage(`PNG exported successfully with ${dpi} DPI!`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to export PNG: ${error.message}`);
        }
    }
    
    private async _exportSVG(svgData: string) {
        try {
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: this.getDefaultExportPath('svg'),
                filters: { 'SVG Image': ['svg'] }
            });
            
            if (!saveUri) return;
            
            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(svgData, 'utf8'));
            vscode.window.showInformationMessage('SVG exported successfully!');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to export SVG: ${error.message}`);
        }
    }
    
    private async _exportMermaid(mermaidCode: string) {
        try {
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: this.getDefaultExportPath('mmd'),
                filters: { 'Mermaid Diagram': ['mmd', 'mermaid'] }
            });
            
            if (!saveUri) return;
            
            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(mermaidCode, 'utf8'));
            vscode.window.showInformationMessage('Mermaid code exported successfully!');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to export Mermaid: ${error.message}`);
        }
    }
    
    private async _exportXLSX(ast: any) {
        try {
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: this.getDefaultExportPath('xlsx'),
                filters: { 'Excel Workbook': ['xlsx'] }
            });
            
            if (!saveUri) return;
            
            // For now, save the AST as JSON and inform about conversion
            const jsonUri = saveUri.with({ path: saveUri.path.replace('.xlsx', '-ast.json') });
            await vscode.workspace.fs.writeFile(jsonUri, Buffer.from(JSON.stringify(ast, null, 2), 'utf8'));
            
            vscode.window.showInformationMessage(
                'AST saved as JSON. Use the ast_to_visio.py tool to convert to XLSX format.'
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to export XLSX: ${error.message}`);
        }
    }
    
    private async _exportBPMN(ast: any) {
        try {
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: this.getDefaultExportPath('bpmn'),
                filters: { 'BPMN 2.0': ['bpmn', 'xml'] }
            });
            
            if (!saveUri) return;
            
            // Convert AST to BPMN XML
            const bpmnXml = this._astToBPMN(ast);
            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(bpmnXml, 'utf8'));
            vscode.window.showInformationMessage('BPMN file exported successfully!');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to export BPMN: ${error.message}`);
        }
    }
    
    private _astToBPMN(ast: any): string {
        // Basic BPMN 2.0 XML structure
        let bpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
`;
        
        // Process each process in the AST
        ast.processes?.forEach((process: any) => {
            bpmn += `  <bpmn:process id="${process.id}" name="${process.name}" isExecutable="true">\n`;
            
            // Add lanes as swimlanes
            process.lanes?.forEach((lane: any) => {
                lane.elements?.forEach((element: any) => {
                    switch (element.type) {
                        case 'task':
                            bpmn += `    <bpmn:task id="${element.id}" name="${element.name}" />\n`;
                            break;
                        case 'event':
                            if (element.eventType === 'start') {
                                bpmn += `    <bpmn:startEvent id="${element.id}" name="${element.name}" />\n`;
                            } else if (element.eventType === 'end') {
                                bpmn += `    <bpmn:endEvent id="${element.id}" name="${element.name}" />\n`;
                            } else {
                                bpmn += `    <bpmn:intermediateThrowEvent id="${element.id}" name="${element.name}" />\n`;
                            }
                            break;
                        case 'gateway':
                            bpmn += `    <bpmn:exclusiveGateway id="${element.id}" name="${element.name}" />\n`;
                            break;
                        case 'send':
                            bpmn += `    <bpmn:sendTask id="${element.id}" name="${element.name}" />\n`;
                            break;
                        case 'receive':
                            bpmn += `    <bpmn:receiveTask id="${element.id}" name="${element.name}" />\n`;
                            break;
                    }
                });
            });
            
            // Add sequence flows
            ast.connections?.filter((c: any) => c.type === 'sequenceFlow').forEach((conn: any) => {
                bpmn += `    <bpmn:sequenceFlow id="${conn.id}" sourceRef="${conn.sourceRef}" targetRef="${conn.targetRef}" />\n`;
            });
            
            bpmn += `  </bpmn:process>\n`;
        });
        
        // Add message flows
        ast.connections?.filter((c: any) => c.type === 'messageFlow').forEach((conn: any) => {
            bpmn += `  <bpmn:messageFlow id="${conn.id}" sourceRef="${conn.sourceRef}" targetRef="${conn.targetRef}" name="${conn.name || ''}" />\n`;
        });
        
        bpmn += `</bpmn:definitions>`;
        return bpmn;
    }
    
    private _sendAST() {
        // This method would send the current AST back to the webview if needed
        // Currently not used but could be useful for future enhancements
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