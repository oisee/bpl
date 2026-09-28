const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
esbuild.buildSync({
  entryPoints: [path.join(root, 'src', 'extension.ts')],
  outfile: path.join(root, 'out', 'web', 'extension.js'),
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2020',
  external: ['vscode'],
  logLevel: 'info'
});

esbuild.buildSync({
  entryPoints: [path.join(root, 'src', 'web-test.ts')],
  outfile: path.join(root, 'out', 'web', 'test.js'),
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2020',
  external: ['vscode'],
  logLevel: 'silent'
});

fs.copyFileSync(
  require.resolve('mermaid/dist/mermaid.min.js'),
  path.join(root, 'media', 'mermaid.min.js')
);
