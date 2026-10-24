import {test} from 'node:test';import assert from 'node:assert/strict';
import {prepareDigits,rectifyAnswer} from '../src/digit-image.mjs';import {chooseCandidate} from '../src/digit-recognition.mjs';
test('白紙と罫線だけでは数字を作らない',()=>{
  const data=new Uint8ClampedArray(100*100*4).fill(255);
  assert.ok(prepareDigits({width:100,height:100,data}).blank);
  for(let y=0;y<100;y++)for(let x=0;x<2;x++){const i=(y*100+x)*4;data[i]=data[i+1]=data[i+2]=0;}
  assert.ok(prepareDigits({width:100,height:100,data}).blank);
});
test('正方形の解答欄を横長につぶさない',()=>{
  const data=new Uint8ClampedArray(100*100*4).fill(255);
  const result=rectifyAnswer({width:100,height:100,data},{x:0,y:0,w:1,h:210/297},(u,v)=>({x:u*100,y:v*100}));
  assert.equal(result.width,result.height);
});
test('答えを参照せず有効な数字の信頼度だけで選ぶ',()=>{
  assert.equal(chooseCandidate([{text:'abc',confidence:100},{text:'8',confidence:90},{text:'3',confidence:70}]).text,'8');
  assert.equal(chooseCandidate([]).text,'');
});
