import * as vscode from 'vscode';

export async function run(): Promise<void> {
    const extension = vscode.extensions.getExtension('oisee.bpl');
    if (!extension) throw new Error('oisee.bpl was not loaded in the web extension host');
    await extension.activate();
    if (!extension.isActive) throw new Error('Web extension did not activate');

    const commands = await vscode.commands.getCommands(true);
    if (!commands.includes('bpmn-lite.showPreview')) {
        throw new Error('Preview command is unavailable');
    }

    const document = await vscode.workspace.openTextDocument({
        language: 'bpmn-lite',
        content: '@Demo\n@Sales\n  Receive order\n  Validate order'
    });
    if (document.languageId !== 'bpmn-lite') throw new Error('BPL language was not registered');
    await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand('bpmn-lite.showPreview');
    console.log('BPMN-Lite web host: activation, language, and preview passed');
}
