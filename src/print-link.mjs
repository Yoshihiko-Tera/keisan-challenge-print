import {challengeUrl} from './site-config.mjs';
import {parsePrintCode} from './grading-core.mjs';
export function printLink(data, target, base=location.href) {
 if(target==='teacher') return 'KEISAN-TEACHER:1:'+JSON.stringify(data);
 const url=new URL(challengeUrl || 'index.html',base);
 url.hash=new URLSearchParams({[target==='child'?'worksheet':'answers']:JSON.stringify(data)}).toString();
 return url.href;
}
export function linkedPrint(hash) {
 const params=new URLSearchParams(hash.replace(/^#/,''));
 const raw=params.get('worksheet') ?? params.get('answers');
 return raw===null?null:parsePrintCode(raw);
}
export function drawPrintLinks(container,data) {
 for(const [target,label] of [['child','がめんで ちょうせん'],['teacher','先生用：メーカーで読取']]) {
  const link=document.createElement(target==='child'?'a':'div');const payload=printLink(data,target);if(target==='child')link.href=payload;link.className='paper-link';
  const code=window.qrcode(0,'M');code.addData(payload);code.make();
  link.innerHTML=code.createSvgTag({cellSize:2,margin:8,scalable:true});
  link.querySelector('svg').setAttribute('aria-label',label+'のQRコード');
  const caption=document.createElement('span');caption.textContent=label;link.append(caption);container.append(link);
 }
}
