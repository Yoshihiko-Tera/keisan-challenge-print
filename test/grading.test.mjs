import {test} from 'node:test';import assert from 'node:assert/strict';
import {parsePrintCode,grade,homography} from '../src/grading-core.mjs';
test('通常・サポートQRから正しい演算順で問題復元',()=>{
  const a=parsePrintCode(JSON.stringify({v:1,op:'subtract',t:[9,8],l:[2]}));assert.deepEqual(a.questions.map(p=>p.answer),[7,6]);
  assert.equal(parsePrintCode(JSON.stringify({v:1,type:'support',offset:10,q:[['multiply',3,4]]})).questions[0].answer,12);
});
test('空欄や不正な数字を正解扱いしない',()=>assert.deepEqual(grade([{answer:0},{answer:2},{answer:-1}],['','2','-1']).map(x=>x.correct),[false,true,true]));
test('外部QRや異常な問題数を拒否',()=>{assert.throws(()=>parsePrintCode('https://example.com'));assert.throws(()=>parsePrintCode('{"v":1,"op":"add","t":[],"l":[1]}'));});
test('四隅による射影変換',()=>{
  const corners=[{x:10,y:20},{x:210,y:10},{x:190,y:300},{x:20,y:290}],f=homography(corners);
  for(const [i,[u,v]]of [[0,0],[1,0],[1,1],[0,1]].entries()){const p=f(u,v);assert.ok(Math.abs(p.x-corners[i].x)<1e-6);assert.ok(Math.abs(p.y-corners[i].y)<1e-6);}
});
