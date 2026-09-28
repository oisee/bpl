const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'out', 'web', 'extension.js'), 'utf8');
const commands = new Map();
const writes = [];
let panel;
let onMessage;

function uri(path, scheme = 'vscode-vfs') {
    return {
        path, scheme,
        with(change) { return uri(change.path ?? path, scheme); },
        toString() { return `${scheme}://github${path}`; }
    };
}

const document = {
    languageId: 'bpmn-lite',
    fileName: '/repo/example.bpl',
    uri: uri('/repo/example.bpl'),
    getText: () => '@Process\n@Lane\n  Task A\n  Task B'
};
const disposable = () => ({ dispose() {} });
const vscode = {
    Uri: {
        file() { throw new Error('Uri.file is unavailable in a virtual workspace'); },
        joinPath(base, ...parts) { return uri(`${base.path}/${parts.join('/')}`, base.scheme); }
    },
    ViewColumn: { Beside: 2, Active: 1 },
    workspace: {
        workspaceFolders: [{ uri: uri('/repo') }],
        getConfiguration: () => ({ get: (_key, fallback) => fallback }),
        fs: { async writeFile(target, bytes) { writes.push({ target, bytes }); } },
        onDidChangeTextDocument: disposable,
        onDidOpenTextDocument: disposable,
        onDidSaveTextDocument: disposable
    },
    window: {
        activeTextEditor: { document },
        visibleTextEditors: [{ document }],
        showSaveDialog: async options => options.defaultUri,
        showInformationMessage() {},
        showErrorMessage(message) { throw new Error(message); },
        onDidChangeActiveTextEditor: disposable,
        createWebviewPanel() {
            panel = {
                webview: {
                    html: '',
                    asWebviewUri: target => uri(target.path, 'https'),
                    onDidReceiveMessage: callback => { onMessage = callback; return disposable(); },
                    postMessage() {}
                },
                visible: true,
                onDidDispose: disposable,
                onDidChangeViewState: disposable,
                reveal() {},
                dispose() {}
            };
            return panel;
        }
    },
    commands: { registerCommand(name, callback) { commands.set(name, callback); return disposable(); } },
    languages: { createDiagnosticCollection: () => ({ set() {}, dispose() {} }) }
};

const webModule = { exports: {} };
vm.runInNewContext(source, {
    module: webModule, exports: webModule.exports,
    require(name) {
        assert.equal(name, 'vscode', 'web bundle must not require Node modules');
        return vscode;
    },
    TextEncoder, atob, Uint8Array, setTimeout, clearTimeout,
    console: { log() {} }
}, { filename: 'out/web/extension.js' });

(async () => {
    webModule.exports.activate({ extensionUri: uri('/extension'), subscriptions: [] });
    await commands.get('bpmn-lite.exportMermaid')();
    await commands.get('bpmn-lite.exportJSON')();
    assert.equal(writes[0].target.toString(), 'vscode-vfs://github/repo/example.mmd');
    assert.equal(writes[1].target.toString(), 'vscode-vfs://github/repo/example-ast.json');
    assert.ok(new TextDecoder().decode(writes[0].bytes).includes('Task A'));

    commands.get('bpmn-lite.showPreview')();
    assert.match(panel.webview.html, /https:\/\/github\/extension\/media\/mermaid\.min\.js/);
    if (process.env.BPL_PREVIEW_HTML) fs.writeFileSync(process.env.BPL_PREVIEW_HTML, panel.webview.html);
    await onMessage({ command: 'exportPNG', pngData: 'iVBORw0KGgo=', dpi: 96 });
    assert.equal(writes[2].target.toString(), 'vscode-vfs://github/repo/example.png');
    assert.equal(Buffer.from(writes[2].bytes).toString('hex'), '89504e470d0a1a0a');
    console.log('Web extension bundle: virtual URI exports and local preview passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
