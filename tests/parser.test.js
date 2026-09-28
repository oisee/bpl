const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
const source = html.match(/class BpmnLiteParser \{[\s\S]*?(\n    \})\n/);
assert.ok(source, 'web parser exists');
const Parser = vm.runInNewContext(`${source[0]}\nBpmnLiteParser`, { console: { log() {} } });

function parse(text) {
  const parser = new Parser();
  return { parser, ast: parser.parse(text) };
}
function edges(ast) {
  return Array.from(ast.connections, c => c.type === 'sequenceFlow' ? `${c.sourceRef}->${c.targetRef}` : null).filter(Boolean);
}

test('sequential tasks have exactly the expected edges', () => {
  const { ast } = parse('@A\n  one\n  two\n  three');
  assert.deepEqual(edges(ast), ['a_one->a_two', 'a_two->a_three']);
});

test('lane changes preserve sequence', () => {
  const { ast } = parse('@A\n  one\n@B\n  two');
  assert.deepEqual(edges(ast), ['a_one->b_two']);
});

test('connection break stops implicit flow', () => {
  const { ast } = parse('@A\n  one\n  ---\n  two');
  assert.deepEqual(edges(ast), []);
});

test('gateway branches merge without a bypass edge', () => {
  const { ast } = parse('@A\n  one\n  ?Decision\n    +yes\n    -no\n  next');
  const result = edges(ast);
  assert.equal(result.includes('a_decision->a_next'), false);
  for (const edge of ['a_one->a_decision', 'a_decision->a_yes', 'a_decision->a_no', 'a_yes->a_next', 'a_no->a_next']) {
    assert.ok(result.includes(edge), `missing ${edge}`);
  }
  assert.equal(new Set(result).size, result.length);
});

test('parser state resets between documents', () => {
  const parser = new Parser();
  parser.parse('@A\n  one\n  two');
  const ast = parser.parse('@B\n  fresh');
  assert.deepEqual(edges(ast), []);
  assert.equal(ast.processes.flatMap(p => p.lanes).some(l => l.name === 'A'), false);
  assert.match(parser.toMermaid(), /b_fresh\[fresh\]/);
  assert.doesNotMatch(parser.toMermaid(), /a_one/);
});

test('qualified forward reference creates a task in the target lane', () => {
  const { parser, ast } = parse('@Customer\n  order -> @System.future\n@System\n  validate');
  assert.equal(parser.tasks.system_future.implicit, true);
  assert.equal(parser.tasks.customer_future, undefined);
  assert.ok(edges(ast).includes('customer_order->system_future'));
});

test('unqualified forward reference resolves to its later definition', () => {
  const { parser, ast } = parse('@Customer\n  order -> done\n@System\n  done');
  assert.equal(parser.tasks.customer_done, undefined);
  assert.ok(edges(ast).includes('customer_order->system_done'));
});

test('qualified reference stays in its named lane when another lane defines the same name', () => {
  const { parser, ast } = parse('@A\n  start -> @System.future\n@Other\n  future');
  assert.ok(parser.tasks.system_future);
  assert.ok(parser.tasks.other_future);
  assert.ok(edges(ast).includes('a_start->system_future'));
  assert.equal(ast.processes.flatMap(p => p.lanes).find(l => l.name === 'System').elements.length, 1);
});

test('qualified forward reference produces one edge and unique connection IDs', () => {
  const { ast } = parse('@A\n  one -> @B.done\n@B\n  done\n  next');
  const result = edges(ast);
  assert.equal(result.filter(edge => edge === 'a_one->b_done').length, 1);
  assert.equal(new Set(ast.connections.map(c => c.id)).size, ast.connections.length);
});

test('connection break prevents branch merge after gateway', () => {
  const { ast } = parse('@A\n  one\n  ?Decision\n    +yes\n    -no\n  ---\n  next');
  assert.equal(edges(ast).includes('a_yes->a_next'), false);
  assert.equal(edges(ast).includes('a_no->a_next'), false);
});

test('sequence and message flows between the same nodes have different IDs', () => {
  const { ast } = parse('@A\n  send: Payment\n@B\n  receive: Payment');
  assert.equal(ast.connections.some(c => c.type === 'messageFlow'), true);
  assert.equal(new Set(ast.connections.map(c => c.id)).size, ast.connections.length);
});

test('forward declaration does not duplicate a lane element', () => {
  const { ast } = parse('@A\n  start -> future\n  future');
  const lane = ast.processes.flatMap(p => p.lanes).find(l => l.name === 'A');
  assert.equal(lane.elements.filter(e => e.id === 'a_future').length, 1);
});

test('qualified reference accepts task names with spaces without changing lane', () => {
  const { ast } = parse('@A\n  one -> @B.task with spaces\n  next\n@B\n  task with spaces');
  const lanes = ast.processes.flatMap(p => p.lanes);
  assert.equal(lanes.some(l => l.name === 'B.task with spaces'), false);
  assert.equal(lanes.find(l => l.name === 'A').elements.some(e => e.id === 'a_next'), true);
  assert.equal(edges(ast).includes('a_one->b_task_with_spaces'), true);
});

test('explicit qualified use preserves an implicit task when same name is later defined elsewhere', () => {
  const { parser, ast } = parse('@A\n  start -> done\n  second -> @A.done\n@B\n  done');
  assert.ok(parser.tasks.a_done);
  assert.ok(parser.tasks.b_done);
  assert.equal(edges(ast).includes('a_second->a_done'), true);
});

test('qualified reference ignores a simple name that normalizes to the same ID', () => {
  const { ast } = parse('@A\n  B done\n  start -> @B.done\n@B\n  done');
  assert.equal(edges(ast).includes('a_start->b_done'), true);
  assert.equal(edges(ast).includes('a_start->a_b_done'), false);
});

test('forward referenced lane belongs to the process where it is declared', () => {
  const { ast } = parse(':First\n@Client\n  start -> @Service.handle\n:Second\n@Service\n  handle');
  const first = ast.processes.find(p => p.name === 'First');
  const second = ast.processes.find(p => p.name === 'Second');
  assert.equal(first.lanes.some(l => l.name === 'Service'), false);
  assert.equal(second.lanes.some(l => l.name === 'Service'), true);
});

test('cross-lane arrow does not also connect to an unrelated next lane', () => {
  const { ast } = parse('@A\n  start -> @System.done\n@Other\n  done');
  assert.equal(edges(ast).includes('a_start->system_done'), true);
  assert.equal(edges(ast).includes('a_start->other_done'), false);
});

test('qualified source of an explicit arrow resolves as a task', () => {
  const { ast } = parse('@A\n  first\n@B\n  second\n@B.second -> @A.first');
  assert.equal(ast.processes.flatMap(p => p.lanes).some(l => l.name === 'B.second'), false);
  assert.equal(edges(ast).includes('b_second->a_first'), true);
});

test('forward reference resolves to a receive task by message name', () => {
  const { parser, ast } = parse('@A\n  order -> Payment\n@B\n  receive: Payment');
  assert.equal(parser.tasks.a_payment, undefined);
  assert.equal(edges(ast).includes('a_order->b_receive_payment'), true);
});

test('process boundary stops implicit sequence flow', () => {
  const { ast } = parse(':First\n@A\n  one\n:Second\n@B\n  two');
  assert.deepEqual(edges(ast), []);
});

test('gateway branches do not merge into another process', () => {
  const { ast } = parse(':First\n@A\n  one\n  ?Gate\n    +yes\n    -no\n:Second\n@B\n  next');
  assert.equal(edges(ast).includes('a_yes->b_next'), false);
  assert.equal(edges(ast).includes('a_no->b_next'), false);
  assert.equal(edges(ast).includes('a_gate->a_yes'), true);
});

test('End event connects only within its process and never to itself', () => {
  const { ast } = parse(':First\n@A\n  one\n:Second\n@B\n  two\n  !End');
  assert.deepEqual(edges(ast), ['b_two->process_end']);
});

test('Start event connects to a task in its own process', () => {
  const { ast } = parse(':First\n@A\n  one\n:Second\n@B\n  !Start\n  two');
  assert.equal(edges(ast).includes('process_start->b_two'), true);
  assert.equal(edges(ast).includes('process_start->a_one'), false);
});
