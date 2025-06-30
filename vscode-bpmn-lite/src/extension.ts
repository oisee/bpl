import * as vscode from 'vscode';
import { BpmnLitePreviewPanel } from './preview';
import { BpmnLiteParser } from './parser';

export function activate(context: vscode.ExtensionContext) {
    console.log('BPMN-Lite extension is now active!');

    // Register preview commands
    context.subscriptions.push(
        vscode.commands.registerCommand('bpmn-lite.showPreview', () => {
            BpmnLitePreviewPanel.createOrShow(context.extensionUri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('bpmn-lite.showPreviewToSide', () => {
            BpmnLitePreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Beside);
        })
    );

    // Register export commands
    context.subscriptions.push(
        vscode.commands.registerCommand('bpmn-lite.exportMermaid', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }

            const document = editor.document;
            if (document.languageId !== 'bpmn-lite') {
                vscode.window.showErrorMessage('Active file is not a BPMN-Lite file');
                return;
            }

            try {
                const parser = new BpmnLiteParser();
                const content = document.getText();
                parser.parse(content);
                const mermaid = parser.toMermaid();

                const uri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file(document.fileName.replace('.bpl', '.mmd')),
                    filters: {
                        'Mermaid': ['mmd', 'mermaid']
                    }
                });

                if (uri) {
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(mermaid, 'utf8'));
                    vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Export failed: ${error.message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('bpmn-lite.exportJSON', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }

            const document = editor.document;
            if (document.languageId !== 'bpmn-lite') {
                vscode.window.showErrorMessage('Active file is not a BPMN-Lite file');
                return;
            }

            try {
                const parser = new BpmnLiteParser();
                const content = document.getText();
                const ast = parser.parse(content);

                const uri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file(document.fileName.replace('.bpl', '-ast.json')),
                    filters: {
                        'JSON': ['json']
                    }
                });

                if (uri) {
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(ast, null, 2), 'utf8'));
                    vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Export failed: ${error.message}`);
            }
        })
    );

    // Auto-open preview for .bpl files
    if (vscode.window.activeTextEditor) {
        const document = vscode.window.activeTextEditor.document;
        if (document && document.languageId === 'bpmn-lite') {
            BpmnLitePreviewPanel.createOrShow(context.extensionUri);
        }
    }

    // Handle opening of .bpl files
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document && editor.document.languageId === 'bpmn-lite') {
                const config = vscode.workspace.getConfiguration('bpmn-lite');
                if (config.get('preview.autoRefresh')) {
                    BpmnLitePreviewPanel.createOrShow(context.extensionUri);
                }
            }
        })
    );

    // Diagnostics for syntax errors
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('bpmn-lite');
    context.subscriptions.push(diagnosticCollection);

    // Update diagnostics on document change
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'bpmn-lite') {
                updateDiagnostics(event.document, diagnosticCollection);
            }
        })
    );

    // Update diagnostics on document open
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            if (document.languageId === 'bpmn-lite') {
                updateDiagnostics(document, diagnosticCollection);
            }
        })
    );
}

function updateDiagnostics(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
    const diagnostics: vscode.Diagnostic[] = [];
    
    try {
        const parser = new BpmnLiteParser();
        parser.parse(document.getText());
        
        // Clear diagnostics if parsing succeeds
        diagnosticCollection.set(document.uri, []);
    } catch (error: any) {
        // Create diagnostic for parsing error
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 0),
            `Parsing error: ${error.message}`,
            vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
        diagnosticCollection.set(document.uri, diagnostics);
    }
}

export function deactivate() {
    BpmnLitePreviewPanel.currentPanel?.dispose();
}