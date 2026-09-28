import * as vscode from 'vscode';

export function utf8Bytes(value: string): Uint8Array {
    return new TextEncoder().encode(value);
}

export function base64Bytes(value: string): Uint8Array {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

export function exportUri(document: vscode.TextDocument | undefined, extension: string, suffix = ''): vscode.Uri | undefined {
    if (document && document.uri.scheme !== 'untitled') {
        const path = document.uri.path.replace(/\.(?:bpl|bpmn-lite)$/i, '');
        return document.uri.with({ path: `${path}${suffix}.${extension}` });
    }
    const folder = vscode.workspace.workspaceFolders?.[0];
    return folder ? vscode.Uri.joinPath(folder.uri, `diagram${suffix}.${extension}`) : undefined;
}
