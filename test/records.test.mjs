import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readRecords, writeRecords, localDate } from '../src/records.mjs';
test('番号と最小限の記録を保存・再読込できる', () => {
  let raw = null;
  const storage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
  const data = { learners: [{ id:'a', name:'01' }], records:[{id:'r', learnerId:'a', date:'2026-10-21',correct:3}] };
  writeRecords(storage, data);
  assert.deepEqual(readRecords(storage), data);
});
test('保存不可と破損は成功扱いにしない', () => {
  assert.throws(() => writeRecords({setItem(){throw new Error('保存不可');}}, {}));
  assert.throws(() => readRecords({getItem:() => '{broken'}));
  assert.throws(() => readRecords({getItem:() => '{"learners":[],"records":[{}]}'}));
});
test('日付は端末の年月日を使う', () => {
  assert.equal(localDate(new Date(2026,9,21,0,1)), '2026-10-21');
});
