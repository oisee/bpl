const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { BpmnLiteParser: ExtensionParser } = require('../out/parser.js');

const html = fs.readFileSync(path.join(__dirname, '../../src/index.html'), 'utf8');
const source = html.match(/class BpmnLiteParser \{[\s\S]*?(\n    \})\n/);
assert.ok(source, 'web parser exists');
const WebParser = vm.runInNewContext(`${source[0]}\nBpmnLiteParser`, { console: { log() {} } });

const scenarios = [
  '@A\n  one\n  two',
  '@A\n  one\n  ---\n  two',
  '@A\n  one\n  ?Decision\n    +yes\n    -no\n  next',
  '@A\n  one\n  ?Decision\n    +yes\n    -no\n  ---\n  next',
  '@Customer\n  order -> @System.future\n@System\n  validate',
  '@Customer\n  order -> done\n@System\n  done',
  '@A\n  start -> @System.future\n@Other\n  future',
  '@A\n  one -> @B.task with spaces\n  next\n@B\n  task with spaces',
  '@A\n  start -> done\n  second -> @A.done\n@B\n  done',
  '@A\n  B done\n  start -> @B.done\n@B\n  done',
  '@A\n  first\n@B\n  second\n@B.second -> @A.first',
  ':First\n@Client\n  start -> @Service.handle\n:Second\n@Service\n  handle',
  '@A\n  start -> @System.done\n@Other\n  done',
  '@A\n  order -> Payment\n@B\n  receive: Payment',
  ':First\n@A\n  one\n:Second\n@B\n  two',
  ':First\n@A\n  one\n  ?Gate\n    +yes\n    -no\n:Second\n@B\n  next',
  ':First\n@A\n  one\n:Second\n@B\n  two\n  !End',
  ':First\n@A\n  one\n:Second\n@B\n  !Start\n  two'
];

for (const scenario of scenarios) {
  const web = new WebParser();
  const extension = new ExtensionParser();
  const webAst = web.parse(scenario);
  const extensionAst = extension.parse(scenario);
  assert.deepEqual(JSON.parse(JSON.stringify(extensionAst)), JSON.parse(JSON.stringify(webAst)), scenario);
  assert.equal(extension.toMermaid(), web.toMermaid(), scenario);
}
console.log(`Parser parity: ${scenarios.length} scenarios passed`);
