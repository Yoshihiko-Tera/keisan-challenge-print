import {paperImage} from './paper-image.mjs';
import {parsePrintCode} from './grading-core.mjs';
import {linkedPrint} from './print-link.mjs';
import {answerImage} from './answer-image.mjs';
import { generateWorksheet, drawWorksheet } from './worksheet.mjs';
import { generateSupportPages, drawSupportPages } from './support-worksheet.mjs';
import { initGrading, disposeGrading } from './grading.mjs';
const el = id => document.getElementById(id);
function view(name) {
  if(name !== 'answerReaderView') stopAnswerCamera();
  if(name !== 'gradingView') disposeGrading();
  for(const id of ['printView','gradingView','answerReaderView']) el(id).hidden = id !== name;
  for(const [id,target] of [['openPrint','printView'],['openGrading','gradingView'],['openAnswerReader','answerReaderView']]) {
    el(id).setAttribute('aria-pressed',String(target === name));
    el(id).classList.toggle('quiet',target !== name);
  }
  window.scrollTo(0,0);
}
el('openGrading').onclick = () => { disposeGrading(); view('gradingView'); };
const printForm = el('printSettings');
function updatePrintSettings() {
  const operation = printForm.elements.operation.value;
  el('print-topRange').hidden = operation === 'multiply';
  el('print-tableRange').hidden = operation !== 'multiply';
  el('print-carryField').hidden = operation !== 'add';
  el('print-borrowField').hidden = el('print-negativeField').hidden = operation !== 'subtract';
  for (const node of printForm.querySelectorAll('input,select')) {
    node.disabled = false;
    for (let parent = node.parentElement; parent && parent !== printForm; parent = parent.parentElement)
      if (parent.hidden) node.disabled = true;
  }
  el('paper').hidden = true; el('printButton').hidden = true; el('printImageActions').hidden=true;
  el('printError').textContent = ''; el('printSummary').textContent = '';
}
function readPrintSettings() {
  const settings = Object.fromEntries(new FormData(printForm));
  for (const key of ['count','topMin','topMax','leftMin','leftMax','tableMin','tableMax'])
    if (key in settings) settings[key] = Number(settings[key]);
  settings.nonNegative = printForm.elements.nonNegative.checked;
  settings.allowDuplicates = printForm.elements.allowDuplicates.checked;
  return settings;
}
printForm.addEventListener('change', updatePrintSettings);
printForm.addEventListener('submit', event => { event.preventDefault(); el('makePrint').click(); });
updatePrintSettings();
el('openPrint').onclick = () => {
  view('printView'); el('paper').hidden = true; el('printButton').hidden = true;
  el('printError').textContent = '';
};
el('makePrint').onclick = () => {
  el('paper').hidden = true; el('printButton').hidden = true; el('printError').textContent = '';
  if (!printForm.reportValidity()) return;
  try {
    const printSettings = readPrintSettings();
    const support = el('printType').value === 'support';
    el('paper').classList.toggle('support-pages', support);
    if (support) {
      const pages=generateSupportPages(printSettings);
      el('paper').hidden = false;
      drawSupportPages(el('paper'),pages);
    } else { const sheet = generateWorksheet(printSettings); drawWorksheet(el('paper'),sheet); }
    el('paper').hidden = false; el('printButton').hidden = false; setupPrintImages();
  }
  catch(error) { el('paper').hidden = true; el('printError').textContent = error.message; }
};
el('printType').onchange = () => { el('paper').hidden=true;el('printButton').hidden=true;el('printImageActions').hidden=true;el('printError').textContent=''; };
el('printButton').onclick = () => window.print();

initGrading();
window.addEventListener('pagehide', disposeGrading);

function showAnswers(answerData) {
 view('printView');
 document.querySelectorAll('.answer-actions,.answer-status').forEach(n=>n.remove());
 el('printSettings').hidden=true;
 el('makePrint').hidden=true;
 el('printType').closest('label').hidden=true;
 document.querySelector('#printView h2').textContent='プリントの解答';
 el('printSummary').textContent='印刷したプリントと同じ問題・並び順の解答です。';
 el('paper').hidden=false;el('printButton').hidden=false;
 if(answerData.type==='support') {
  el('paper').classList.add('support-pages');
  drawSupportPages(el('paper'),[{offset:answerData.offset,questions:answerData.questions}]);
  el('paper').querySelectorAll('.paper-answer-blank').forEach((cell,i)=>{cell.textContent=answerData.questions[i].answer;cell.classList.add('answer-cell');});
 } else {
  drawWorksheet(el('paper'),{...answerData,operation:answerData.op,count:answerData.questions.length,top:answerData.t,left:answerData.l});
  el('paper').querySelectorAll('td').forEach((cell,i)=>{cell.textContent=answerData.questions[i].answer;cell.classList.add('answer-cell');});
 }
 const actions=document.createElement('div');actions.className='answer-actions';
 const save=document.createElement('button');save.textContent='解答を画像で保存';save.type='button';
 const share=document.createElement('button');share.textContent='解答画像を共有';share.type='button';share.className='quiet';
 const message=document.createElement('p');message.className='answer-status';message.setAttribute('role','status');
 async function file() { return new File([await answerImage(answerData)],'keisan-answers.png',{type:'image/png'}); }
 async function download() {
  const blob=await file(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=blob.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 save.onclick=()=>download().catch(e=>{message.textContent=e.message;});
 share.onclick=async()=>{try {const image=await file();if(navigator.canShare?.({files:[image]}))await navigator.share({files:[image],title:'計算プリントの解答'});else {await download();message.textContent='この端末では直接共有に対応していないため、画像を保存しました。';}}catch(e){if(e.name!=='AbortError')message.textContent=e.message;}};
 actions.append(save,share);el('printSummary').after(actions,message);
 el('openPrint').onclick=()=>{location.href='print.html';};
}

window.addEventListener('hashchange',()=>location.reload());

let answerCamera=null, answerScanTimer=null, answerCameraVersion=0;
function stopAnswerCamera() {
 answerCameraVersion++;clearTimeout(answerScanTimer);answerScanTimer=null;
 if(answerCamera)answerCamera.getTracks().forEach(track=>track.stop());answerCamera=null;
 el('answerQrVideo').srcObject=null;el('answerQrVideo').hidden=true;
 el('stopAnswerCamera').hidden=true;el('startAnswerCamera').disabled=false;
}
function decodeAnswerQr(canvas) {
 const ctx=canvas.getContext('2d');
  let result=null;
  // A whole-sheet photo can contain both QRs. Mask each decoded QR and continue.
  for(let attempt=0;attempt<4;attempt++) {
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
   const qr=window.jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'});
   if(!qr)break;
   if(qr.data.startsWith('KEISAN-TEACHER:1:')) {result=parsePrintCode(qr.data);break;}
   const points=Object.values(qr.location);const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
   ctx.fillStyle='#fff';ctx.fillRect(Math.min(...xs)-8,Math.min(...ys)-8,Math.max(...xs)-Math.min(...xs)+16,Math.max(...ys)-Math.min(...ys)+16);
  }

 return result;
}
el('startAnswerCamera').onclick=async()=>{
 stopAnswerCamera();const version=answerCameraVersion;
 el('startAnswerCamera').disabled=true;el('stopAnswerCamera').hidden=false;el('answerQrMessage').textContent='カメラを起動しています…';
 try {
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
  if(version!==answerCameraVersion){stream.getTracks().forEach(t=>t.stop());return;}
  answerCamera=stream;const video=el('answerQrVideo');video.srcObject=stream;video.hidden=false;el('stopAnswerCamera').hidden=false;
  await video.play();if(version!==answerCameraVersion)return;
  el('answerQrMessage').textContent='プリントの「先生用」QRをカメラにかざしてください。';
  const canvas=document.createElement('canvas');
  function scan() {
   if(version!==answerCameraVersion)return;
   try {
    if(video.readyState>=2 && video.videoWidth){
     const scale=Math.min(1,1600/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
     canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
     const result=decodeAnswerQr(canvas);
     if(result){el('answerQrMessage').textContent='';showAnswers(result);return;}
    }
   }catch {el('answerQrMessage').textContent='先生用QR全体がはっきり映るようにしてください。';}
   answerScanTimer=setTimeout(scan,300);
  }
  scan();
 }catch(error){if(version===answerCameraVersion){stopAnswerCamera();el('answerQrMessage').textContent=error.name==='NotAllowedError'?'カメラの使用を許可して、もう一度押してください。':'カメラを開けませんでした。接続を確認するか、写真を選んでください。';}}
};
el('stopAnswerCamera').onclick=()=>{stopAnswerCamera();el('answerQrMessage').textContent='カメラを閉じました。';};
window.addEventListener('pagehide',stopAnswerCamera);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAnswerCamera();});
el('openAnswerReader').onclick=()=>{view('answerReaderView');};
let answerReadVersion=0;
el('answerQrFile').onchange=async()=>{
 const file=el('answerQrFile').files[0];if(!file)return;stopAnswerCamera();
 const version=++answerReadVersion;
 el('answerQrMessage').textContent='読み取り中…';
 try {
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  const canvas=document.createElement('canvas');const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
  canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const result=decodeAnswerQr(canvas);
  if(version!==answerReadVersion)return;
  if(!result)throw new Error('先生用QRを読み取れません。「先生用」のQRを大きく、はっきり撮影してください。');
  el('answerQrMessage').textContent='';showAnswers(result);
 }catch(error){if(version===answerReadVersion)el('answerQrMessage').textContent=error.message;}
 finally{el('answerQrFile').value='';}
};
// Old answer URLs no longer display solutions automatically.
if(new URLSearchParams(location.hash.slice(1)).has('answers')) {
 view('answerReaderView');el('answerQrMessage').textContent='解答は、この画面で先生用QRを読み込んで開きます。';
}

function printPapers(){return el('paper').classList.contains('support-pages')?[...el('paper').querySelectorAll('.support-paper')]:[el('paper')];}
let preparedPrintFile=null,printImageVersion=0;
async function preparePrintImage(){
 const version=++printImageVersion;preparedPrintFile=null;el('downloadPrintImage').disabled=el('sharePrintImage').disabled=true;el('printImageMessage').textContent='画像を準備しています…';
 try{const index=Number(el('imagePage').value)||0;const file=new File([await paperImage(printPapers()[index])],'keisan-print-'+(index+1)+'.png',{type:'image/png'});if(version!==printImageVersion)return;preparedPrintFile=file;el('downloadPrintImage').disabled=el('sharePrintImage').disabled=false;el('printImageMessage').textContent='';}catch(e){if(version===printImageVersion)el('printImageMessage').textContent=e.message;}
}
el('imagePage').onchange=preparePrintImage;
function setupPrintImages(){
 const papers=printPapers();el('imagePage').replaceChildren();papers.forEach((_,i)=>el('imagePage').append(new Option((i+1)+'ページ',String(i))));el('imagePageLabel').hidden=papers.length===1;el('printImageActions').hidden=false;preparePrintImage();
}
async function printImageFile(){if(!preparedPrintFile)throw new Error('画像の準備が終わるまでお待ちください。');return preparedPrintFile;}
function savePrintFile(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
el('downloadPrintImage').onclick=async()=>{try{savePrintFile(await printImageFile());}catch(e){el('printImageMessage').textContent=e.message;}};
el('sharePrintImage').onclick=async()=>{try{const file=await printImageFile();if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'計算プリント'});else el('printImageMessage').textContent='このブラウザーでは画像の直接共有に対応していません。「画像をダウンロード」で保存して共有してください。';}catch(e){if(e.name!=='AbortError')el('printImageMessage').textContent=e.message;}};
