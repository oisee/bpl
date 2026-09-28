#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const html = `file://${path.join(__dirname, '../src/index.html')}`;
const output = path.join(__dirname, '../artifacts');

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await playwright.chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox']
  });
  try {
    for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      if (process.env.MERMAID_JS_PATH) {
        await page.route('https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js', route =>
          route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(process.env.MERMAID_JS_PATH) }));
      }
      await page.goto(html);
      await page.locator('#mermaid-preview svg').waitFor();
      await page.locator('#code-editor').fill('@A\n  first\n  second');
      await page.locator('#render-button').click();
      await page.waitForFunction(() => document.querySelector('#mermaid-code-preview').textContent.includes('a_first --> a_second'));
      await page.locator('#mermaid-preview svg').waitFor();
      assert.match(await page.locator('#ast-preview').innerText(), /"name": "second"/);
      assert.equal(await page.locator('#zoom-level').innerText(), '100%');
      assert.equal(errors.length, 0, errors.join('\n'));
      if (name === 'desktop') {
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.evaluate(() => exportPNG())
        ]);
        assert.match(download.suggestedFilename(), /\.png$/);
        const png = fs.readFileSync(await download.path());
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.ok(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0);
      }
      if (name === 'mobile') {
        const editor = await page.locator('.editor-container').boundingBox();
        const preview = await page.locator('.preview-container').boundingBox();
        assert.ok(preview.y >= editor.y + editor.height, 'preview stacks below editor');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true,
          'mobile page has no horizontal overflow');
      }
      await page.screenshot({ path: path.join(output, `visual-${name}.png`), fullPage: true });
      if (name === 'desktop') {
        await page.evaluate(() => {
          mermaid.render = (_id, source) => new Promise(resolve =>
            setTimeout(() => resolve({ svg: `<svg viewBox="0 0 100 100"><text>${source.includes('slow') ? 'slow' : 'fast'}</text></svg>` }),
              source.includes('slow') ? 600 : 10));
        });
        await page.locator('#code-editor').fill('@A\n  slow');
        await page.locator('#render-button').click();
        await page.locator('#code-editor').fill('@A\n  fast');
        await page.locator('#render-button').click();
        await page.waitForTimeout(700);
        assert.equal(await page.locator('#mermaid-preview svg text').textContent(), 'fast',
          'older render cannot overwrite a newer diagram');
      }
      await page.close();
      console.log(`visual ${name}: passed`);
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
