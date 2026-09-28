const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.join(__dirname, '..');
const extension = path.join(root, 'vscode-bpmn-lite');
const output = path.join(root, 'artifacts');
fs.mkdirSync(output, { recursive: true });
const htmlPath = path.join(output, 'extension-web-preview.html');
const result = spawnSync(process.execPath, ['test/test-web.js'], {
    cwd: extension,
    env: { ...process.env, BPL_PREVIEW_HTML: htmlPath },
    encoding: 'utf8'
});
assert.equal(result.status, 0, result.stderr || result.stdout);

(async () => {
    const browser = await playwright.chromium.launch({
        headless: true,
        ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
        args: ['--no-sandbox']
    });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => {
            window.acquireVsCodeApi = () => ({ postMessage() {} });
        });
        await page.route('https://github/extension/media/mermaid.min.js', route =>
            route.fulfill({
                status: 200,
                contentType: 'text/javascript',
                body: fs.readFileSync(path.join(extension, 'media', 'mermaid.min.js'))
            })
        );
        await page.goto(`file://${htmlPath}`);
        await page.locator('.mermaid svg').waitFor();
        assert.match(await page.locator('.mermaid svg').textContent(), /Task A/);
        assert.equal(errors.length, 0, errors.join('\n'));
        await page.screenshot({ path: path.join(output, 'extension-web-preview.png'), fullPage: true });
        console.log('Extension web preview visual: passed');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
