import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateWorksheet} from '../src/worksheet.mjs';
test('10問、25問、100問の表と重複禁止',()=>{
  for(const [count,rows,cols] of [[10,2,5],[25,5,5],[100,10,10]]){
    const s=generateWorksheet({count,topMin:0,topMax:9,leftMin:0,leftMax:9});
    assert.equal(s.left.length,rows);assert.equal(s.top.length,cols);
    assert.equal(s.questions.length,count);assert.equal(new Set(s.questions.map(p=>p.key)).size,count);
  }
});
test('全マスの引き算が負にならず繰り下がる',()=>{
  const s=generateWorksheet({count:10,operation:'subtract',topMin:20,topMax:24,leftMin:5,leftMax:9,borrow:'required'});
  assert.ok(s.questions.every(p=>p.answer>=0 && p.a%10<p.b%10));
});
test('成立しない表は無断で条件変更しない',()=>{
  assert.throws(()=>generateWorksheet({count:100,topMin:1,topMax:5,leftMin:1,leftMax:5}));
  assert.throws(()=>generateWorksheet({count:10,topMin:1,topMax:5,leftMin:1,leftMax:5,carry:'required'}));
});
test('重複を許可した25問でも行の境目で同じ問題が続かない',()=>{
  for(let i=0;i<10;i++){
    const s=generateWorksheet({count:25,allowDuplicates:true});
    assert.equal(s.questions.length,25);
    assert.ok(s.questions.every((p,i)=>!i||p.key!==s.questions[i-1].key));
  }
});
test('左段が1種類でも3種類の上段で奇数列の連続を避ける',()=>{
  const s=generateWorksheet({count:25,allowDuplicates:true,topMin:1,topMax:3,leftMin:1,leftMax:1});
  assert.ok(s.questions.every((p,i)=>!i||p.key!==s.questions[i-1].key));
});

test('重複許可の100問でも1〜9の81通りを使い、見出しの重複を必要最小限にする',()=>{
  for(let i=0;i<20;i++) {
    const s=generateWorksheet({count:100,allowDuplicates:true,topMin:1,topMax:9,leftMin:1,leftMax:9});
    assert.equal(new Set(s.top).size,9);
    assert.equal(new Set(s.left).size,9);
    assert.equal(new Set(s.questions.map(p=>p.key)).size,81);
    assert.ok(s.questions.every((p,i)=>!i||p.key!==s.questions[i-1].key));
  }
});

test('重複許可でも100通り作れる範囲なら全問を異なる組み合わせにする',()=>{
  const s=generateWorksheet({count:100,allowDuplicates:true,topMin:0,topMax:9,leftMin:0,leftMax:9});
  assert.equal(new Set(s.questions.map(p=>p.key)).size,100);
});

test('重複許可の多様化でも計算条件を守る',()=>{
  const s=generateWorksheet({count:100,allowDuplicates:true,operation:'subtract',topMin:1,topMax:9,leftMin:1,leftMax:9});
  assert.ok(s.questions.every(p=>p.answer>=0));
  assert.ok(new Set(s.questions.map(p=>p.key)).size>=20);
});
