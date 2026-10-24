import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, defaults, GenerationError } from '../src/generator.mjs';

test('初期設定は重複しない10問、答えは数字範囲で制限しない', () => {
  const p = generate({});
  assert.equal(p.length, 10);
  assert.equal(new Set(p.map(x => x.key)).size, 10);
  assert.equal(generate({ count: 1, topMin: 5, topMax: 5, leftMin: 5, leftMax: 5 })[0].answer, 10);
});
test('不成立条件を変更せずエラーにする', () => {
  assert.throws(() => generate({ count: 100 }), GenerationError);
  assert.equal(defaults.count, 10);
});
test('繰り上がり・繰り下がりの指定', () => {
  assert.equal(generate({ count: 1, topMin: 9, topMax: 9, leftMin: 1, leftMax: 1, carry: 'required' })[0].answer, 10);
  assert.throws(() => generate({ count: 1, topMin: 9, topMax: 9, leftMin: 1, leftMax: 1, carry: 'forbidden' }), GenerationError);
  assert.equal(generate({ operation: 'subtract', count: 1, topMin: 20, topMax: 20, leftMin: 1, leftMax: 1, borrow: 'required' })[0].answer, 19);
});
test('負の答え禁止と掛け算の段の範囲', () => {
  assert.throws(() => generate({ operation: 'subtract', count: 1, topMin: 1, topMax: 1, leftMin: 2, leftMax: 2 }), GenerationError);
  assert.ok(generate({ operation: 'multiply', tableMin: 2, tableMax: 3 }).every(p => p.a >= 2 && p.a <= 3));
});
test('セット間と重複許可時も同じ問題が連続しない', () => {
  const s = { count: 10, allowDuplicates: true, topMin: 1, topMax: 2, leftMin: 1, leftMax: 1 };
  const p = generate(s, 'add:1:1', () => 0);
  assert.equal(p[0].key, 'add:2:1');
  assert.ok(p.every((x, i) => !i || x.key !== p[i - 1].key));
});
