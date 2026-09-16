import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeChoose, gradeTrace, traceWires } from '../src/engine/selection-answer.js';
import { UNITS, creditExpandedBlocks, nextUnit } from '../src/roadmap/index.js';
import { instantiateUnit } from '../src/roadmap/instantiate.js';

test('Choose requires both the correct part and a correct reason', () => {
  for (const u of UNITS.filter((u) => u.kind === 'choose')) {
    assert.equal(gradeChoose(u, {}).empty, true);
    assert.equal(gradeChoose(u, { option: u.correctOption }).empty, true);
    for (const option of u.options) for (const reason of u.reasons) {
      assert.equal(gradeChoose(u, { option: option.id, reason: reason.id }).passed,
        option.id === u.correctOption && reason.id === u.correctReason, u.id);
    }
    assert.equal(gradeChoose(u, { option: 'unknown', reason: 'unknown' }).passed, false);
    const a = instantiateUnit(u, 123);
    assert.deepEqual(a.options, instantiateUnit(u, 123).options);
    assert.equal(new Set(a.options.map((o) => o.id)).size, u.options.length);
  }
});

test('Trace grading requires the exact net across seeds, including all branches', () => {
  for (const unit of UNITS.filter((u) => u.kind === 'trace')) {
    for (const seed of [1, 2, 7, 42, 1234, 98765]) {
      const work = instantiateUnit(unit, seed);
      assert.ok(work.expected.length);
      assert.equal(gradeTrace(work, work.expected).passed, true);
      assert.equal(gradeTrace(work, []).empty, true);
      assert.equal(gradeTrace(work, [...work.expected, 'unknown']).passed, false);
      const wrong = work.doc.wires.find((w) => !work.expected.includes(w.id));
      assert.ok(wrong);
      assert.equal(gradeTrace(work, [wrong.id]).passed, false);
      assert.deepEqual(traceWires({ ...work.doc, wires: [...work.doc.wires].reverse() }, unit.netName).sort(), [...work.expected].sort());
    }
  }
});

test('Trace resolves a branched net and rejects incomplete selection', () => {
  const unit = UNITS.find((u) => u.kind === 'trace');
  const work = instantiateUnit(unit, 1);
  const wire = work.doc.wires.find((w) => work.expected.includes(w.id));
  const extra = { id: 'branch', x1: wire.x1, y1: wire.y1, x2: wire.x1 + 80, y2: wire.y1 };
  const doc = { ...work.doc, wires: [...work.doc.wires, extra] };
  const expected = traceWires(doc, unit.netName);
  assert.ok(expected.includes('branch'));
  assert.equal(gradeTrace({ ...work, expected }, work.expected).passed, false);
});

test('Curriculum expansion preserves earned build credit without crediting fresh profiles', () => {
  assert.deepEqual(creditExpandedBlocks([]), []);
  assert.equal(creditExpandedBlocks(null), null);
  const legacy = UNITS.filter((u) => !u.anchor);
  const before = legacy.slice(0, 20).map((u) => u.id);
  const after = creditExpandedBlocks(before);
  assert.ok(before.every((id) => after.includes(id)));
  assert.deepEqual(creditExpandedBlocks(after), after);
  assert.equal(nextUnit(after).id, legacy[20].id);
});
