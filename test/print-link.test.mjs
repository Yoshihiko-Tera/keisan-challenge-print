import {test} from 'node:test';
import assert from 'node:assert/strict';
import {printLink,linkedPrint} from '../src/print-link.mjs';
import {parsePrintCode} from '../src/grading-core.mjs';
test('通常プリントの二つのリンクで問題と順序を保持し採点でも読める',()=>{
 const data={v:1,op:'subtract',t:[9,7,8],l:[2,4]};
 const url=printLink(data,'child','https://example.com/apps/print.html');
 assert.equal(new URL(url).pathname,'/apps/index.html');
 assert.deepEqual(linkedPrint(new URL(url).hash).questions.map(p=>p.answer),[7,5,6,5,3,4]);
 const teacher=printLink(data,'teacher','https://example.com/apps/print.html');
 assert.ok(teacher.startsWith('KEISAN-TEACHER:1:'));
 assert.equal(/^https?:/.test(teacher),false);
 assert.deepEqual(parsePrintCode(teacher).questions,parsePrintCode(url).questions);

});
test('サポートプリントはページの問題と番号を保持し壊れたQRを拒否',()=>{
 const data={v:1,type:'support',offset:20,q:[['multiply',3,4],['add',2,5]]};
 const result=linkedPrint(new URL(printLink(data,'child','https://example.com/print.html')).hash);
 assert.equal(result.offset,20);assert.deepEqual(result.questions.map(p=>p.answer),[12,7]);
 assert.throws(()=>linkedPrint('#worksheet=%7B%7D'));assert.equal(linkedPrint(''),null);
});
