import {parsePrintCode,grade,homography} from './grading-core.mjs';
import {drawWorksheet} from './worksheet.mjs';
import {drawSupportPages} from './support-worksheet.mjs';
import {rectifyAnswer,prepareDigits} from './digit-image.mjs';
import {recognizeDigits} from './digit-recognition.mjs';
const el=id=>document.getElementById(id);
let source=null,corners=[],decoded=null,worker=null,stream=null,generation=0,review=[];
const canvas=()=>el('gradingCanvas');
function message(text){el('gradingMessage').textContent=text;}
function paint(){
  if(!source)return;const c=canvas(),ctx=c.getContext('2d');ctx.drawImage(source,0,0,c.width,c.height);
  corners.forEach((p,i)=>{ctx.fillStyle='#c33131';ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#000';ctx.font='bold 22px sans-serif';ctx.fillText(String(i+1),p.x+12,p.y+8);});
}
export function disposeGrading(){
  generation++;source=null;corners=[];decoded=null;review=[];
  if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;
  el('gradingVideo').srcObject=null;el('gradingVideo').hidden=true;el('takePhoto').hidden=true;
  if(worker){worker.terminate();worker=null;}
  canvas().width=1;canvas().height=1;canvas().hidden=true;
  el('gradingFile').value='';el('gradingRows').replaceChildren();el('gradingReview').hidden=true;
  el('resetCorners').hidden=true;el('recognizePrint').disabled=false;
  el('confirmGrading').disabled=false;el('resetCorners').disabled=false;
  el('gradingReference').replaceChildren();el('gradingResult').textContent='';el('recognizePrint').hidden=true;message('');
}
async function loadImage(blob){
  disposeGrading();const token=generation;
  const bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'});
  if(token!==generation){bitmap.close();return;}
  source=document.createElement('canvas');const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));
  source.width=Math.round(bitmap.width*scale);source.height=Math.round(bitmap.height*scale);source.getContext('2d').drawImage(bitmap,0,0,source.width,source.height);bitmap.close();
  canvas().width=source.width;canvas().height=source.height;canvas().hidden=false;paint();
  const pixels=source.getContext('2d').getImageData(0,0,source.width,source.height);
  const code=window.jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'});
  if(!code){message('QRコードを読み取れません。用紙全体とQRがはっきり写るよう撮り直してください。');return;}
  try{decoded=parsePrintCode(code.data);message('QRを読み取りました。用紙の左上 → 右上 → 右下 → 左下の順に、四隅を押してください。');el('resetCorners').hidden=false;}
  catch{message('このアプリに対応したプリントのQRコードを読み取ってください。');}
}
function boxesForPrint(){
  const reference=el('gradingReference');reference.replaceChildren();
  reference.className='grading-reference';let paper=reference;
  if(decoded.type==='support'){
    reference.classList.add('support-pages');drawSupportPages(reference,[{offset:decoded.offset,questions:decoded.questions}]);paper=reference.firstElementChild;
  }else drawWorksheet(reference,{operation:decoded.op,count:decoded.questions.length,top:decoded.t,left:decoded.l});
  const bounds=paper.getBoundingClientRect();
  return [...reference.querySelectorAll(decoded.type==='support'?'.paper-answer-blank':'.calculation-table td')].map(node=>{
    const r=node.getBoundingClientRect();return{x:(r.left-bounds.left+4)/bounds.width,y:(r.top-bounds.top+4)/bounds.height,w:(r.width-8)/bounds.width,h:(r.height-8)/bounds.height};
  });
}
function cropBox(box,map){
  const pixels=source.getContext('2d').getImageData(0,0,source.width,source.height);
  const image=rectifyAnswer(pixels,box,map),c=document.createElement('canvas');c.width=image.width;c.height=image.height;
  c.getContext('2d').putImageData(new ImageData(image.data,image.width,image.height),0,0);return c;
}
function reviewRows(crops){
  el('gradingRows').replaceChildren();review=[];
  crops.forEach((crop,i)=>{
    const row=document.createElement('div');row.className='grading-row';
    const p=decoded.questions[i],title=document.createElement('span');title.textContent=`${i+1+(decoded.offset||0)}. ${p.a} ${{add:'＋',subtract:'−',multiply:'×'}[p.operation]} ${p.b}`;
    crop.setAttribute('aria-label',`${i+1}問目の書き込み画像`);
    const label=document.createElement('label');label.textContent='認識した答え（修正可）';const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.maxLength=12;input.setAttribute('aria-label',`${i+1}問目の答え`);label.append(input);
    const confirmed=document.createElement('label');confirmed.className='check';const check=document.createElement('input');check.type='checkbox';confirmed.append(check,document.createTextNode('確認済み'));
    const status=document.createElement('span');status.className='grading-status';
    input.oninput=()=>{check.checked=false;el('gradingResult').textContent='';update();};check.onchange=()=>{el('gradingResult').textContent='';update();};
    function update(){const correct=grade([p],[input.value.trim()])[0].correct;status.textContent=input.value.trim()?correct?'○ 仮：正解':'△ 仮：要確認':'空欄：要確認';status.style.color=correct?'#c33131':'#2467b3';}
    update();row.append(title,crop,label,confirmed,status);el('gradingRows').append(row);review.push({input,check,update});
  });el('gradingReview').hidden=false;
}
export function initGrading(){
  el('gradingFile').onchange=async()=>{const file=el('gradingFile').files[0];if(file)try{await loadImage(file);}catch{message('画像を開けませんでした。別の写真で試してください。');}};
  el('startCamera').onclick=async()=>{
    disposeGrading();const token=generation;
    try{const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});if(token!==generation){next.getTracks().forEach(t=>t.stop());return;}stream=next;el('gradingVideo').srcObject=stream;el('gradingVideo').hidden=false;await el('gradingVideo').play();el('takePhoto').hidden=false;message('用紙全体とQRコードを写してください。');}
    catch{message('カメラを開けません。写真を選ぶ方法も使えます。');}
  };
  el('takePhoto').onclick=()=>{const video=el('gradingVideo'),c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;if(!c.width)return; c.getContext('2d').drawImage(video,0,0);c.toBlob(blob=>{if(blob)loadImage(blob).catch(()=>message('写真を処理できませんでした。'));});};
  el('resetCorners').onclick=()=>{corners=[];review=[];el('gradingRows').replaceChildren();el('gradingReview').hidden=true;el('gradingResult').textContent='';paint();el('recognizePrint').hidden=true;message('左上 → 右上 → 右下 → 左下の順に指定してください。');};
  canvas().onclick=event=>{
    if(!decoded||corners.length>=4)return;
    const r=canvas().getBoundingClientRect();corners.push({x:(event.clientX-r.left)*canvas().width/r.width,y:(event.clientY-r.top)*canvas().height/r.height});paint();
    if(corners.length===4){el('recognizePrint').hidden=false;message('四隅を指定しました。数字を読み取ってください。');}
  };
  el('recognizePrint').onclick=async()=>{
    if(!decoded||corners.length!==4)return;const token=generation;el('recognizePrint').disabled=true;el('confirmGrading').disabled=true;el('resetCorners').disabled=true;
    try{
      const map=homography(corners),boxes=boxesForPrint(),crops=boxes.map(box=>cropBox(box,map));reviewRows(crops);
      for(const row of review){row.input.disabled=true;row.check.disabled=true;}
      message('端末内で数字を読み取っています。手書きは誤認識するため、各欄を確認してください。');
      const created=await window.Tesseract.createWorker('eng',1,{workerPath:new URL('vendor/ocr/worker.min.js',location.href).href,corePath:new URL('vendor/ocr/',location.href).href,langPath:new URL('vendor/ocr',location.href).href,cacheMethod:'none',workerBlobURL:false});
      if(token!==generation){await created.terminate();return;}worker=created;
      await worker.setParameters({tessedit_char_whitelist:'0123456789-',tessedit_pageseg_mode:'7'});
      for(let i=0;i<crops.length;i++){
        const original=crops[i].getContext('2d').getImageData(0,0,crops[i].width,crops[i].height),prepared=prepareDigits(original);
        const clean=document.createElement('canvas');clean.width=prepared.width;clean.height=prepared.height;clean.getContext('2d').putImageData(new ImageData(prepared.data,prepared.width,prepared.height),0,0);
        const data=prepared.blank?{text:''}:await recognizeDigits(worker,clean,()=>token===generation);if(token!==generation)return;
        const value=data.text.trim();review[i].input.value=/^-?\d+$/.test(value)?value:'';review[i].update();
        message(`${i+1}／${crops.length}問を読み取りました。すべて仮の判定です。`);
      }
      await worker.terminate();worker=null;message('読み取りが終わりました。画像と答えを見比べ、修正して全問を確認済みにしてください。');
    }catch{if(token===generation)message('自動認識を完了できませんでした。表示された書き込み画像を見て、先生が答えを入力・確認できます。');if(worker){worker.terminate();worker=null;}}
    finally{if(token===generation){el('recognizePrint').disabled=false;el('confirmGrading').disabled=false;el('resetCorners').disabled=false;for(const row of review){row.input.disabled=false;row.check.disabled=false;}}}
  };
  el('confirmGrading').onclick=()=>{
    if(!review.length||review.some(r=>!r.check.checked)){message('全問の画像・答えを確認し、確認済みにチェックしてください。');return;}
    if(review.some(r=>r.input.value.trim()&&!/^-?\d+$/.test(r.input.value.trim()))){message('答えは整数または空欄で入力してください。');return;}
    const count=grade(decoded.questions,review.map(r=>r.input.value.trim())).filter(r=>r.correct).length;
    el('gradingResult').textContent=`${review.length}問中${count}問正解（先生が確認して確定）`;message('確定しました。点数・画像は保存していません。');
  };
  window.addEventListener('pagehide',disposeGrading);
}
