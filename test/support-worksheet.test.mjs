import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateSupportPages} from '../src/support-worksheet.mjs';
test('25問を10・10・5問に分け、重複禁止を全体で守る',()=>{
  const pages=generateSupportPages({count:25});
  assert.deepEqual(pages.map(p=>p.questions.length),[10,10,5]);
  assert.deepEqual(pages.map(p=>p.offset),[0,10,20]);
  assert.equal(new Set(pages.flatMap(p=>p.questions.map(q=>q.key))).size,25);
});
test('3問を増やさず1枚に収め、100問は10枚に分ける',()=>{
  assert.equal(generateSupportPages({count:3})[0].questions.length,3);
  assert.equal(generateSupportPages({count:100,topMax:10,leftMax:10}).length,10);
});
test('生成できない条件を無断で補わない',()=>{
  assert.throws(()=>generateSupportPages({count:100}));
});
