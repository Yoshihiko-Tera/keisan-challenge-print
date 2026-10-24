function number(n){return Number.isSafeInteger(n)&&n>=0&&n<=1000;}
const ops=['add','subtract','multiply'];
export function parsePrintCode(text){
  if(typeof text!=='string'||text.length>12000)throw new Error('対応するプリントのQRコードではありません。');
  if(text.startsWith('KEISAN-TEACHER:1:')) text=text.slice('KEISAN-TEACHER:1:'.length);
  if(/^https?:\/\//.test(text)) {
    const url=new URL(text), params=new URLSearchParams(url.hash.slice(1));
    text=params.get('worksheet') ?? params.get('answers') ?? '';
  }
  const d=JSON.parse(text);if(d.v!==1)throw new Error('対応するプリントのQRコードではありません。');
  let questions;
  if(d.type==='support'){
    if(!Array.isArray(d.q)||d.q.length<1||d.q.length>10||!number(d.offset)||!d.q.every(q=>Array.isArray(q)&&ops.includes(q[0])&&number(q[1])&&number(q[2])))throw new Error('問題データが不正です。');
    questions=d.q.map(([operation,a,b])=>({operation,a,b}));
  }else{
    if(!ops.includes(d.op)||!Array.isArray(d.t)||!Array.isArray(d.l)||!d.t.length||!d.l.length||d.t.length>10||d.l.length>10||![...d.t,...d.l].every(number))throw new Error('問題データが不正です。');
    questions=d.l.flatMap(b=>d.t.map(a=>({operation:d.op,a,b})));
  }
  for(const p of questions)p.answer=p.operation==='add'?p.a+p.b:p.operation==='subtract'?p.a-p.b:p.a*p.b;
  return {...d,questions};
}
export function grade(questions,answers){
  return questions.map((p,i)=>({correct:/^-?\d+$/.test(answers[i]??'')&&Number(answers[i])===p.answer}));
}
export function homography(corners){
  const source=[[0,0],[1,0],[1,1],[0,1]],matrix=[];
  for(let i=0;i<4;i++){
    const [u,v]=source[i],{x,y}=corners[i];
    matrix.push([u,v,1,0,0,0,-x*u,-x*v,x],[0,0,0,u,v,1,-y*u,-y*v,y]);
  }
  for(let c=0;c<8;c++){
    let pivot=c;for(let r=c+1;r<8;r++)if(Math.abs(matrix[r][c])>Math.abs(matrix[pivot][c]))pivot=r;
    [matrix[c],matrix[pivot]]=[matrix[pivot],matrix[c]];
    const divisor=matrix[c][c];if(Math.abs(divisor)<1e-9)throw new Error('四隅を正しい順番で指定してください。');
    for(let k=c;k<9;k++)matrix[c][k]/=divisor;
    for(let r=0;r<8;r++)if(r!==c){const m=matrix[r][c];for(let k=c;k<9;k++)matrix[r][k]-=m*matrix[c][k];}
  }
  const h=matrix.map(r=>r[8]);
  return(u,v)=>{const z=h[6]*u+h[7]*v+1;return{x:(h[0]*u+h[1]*v+h[2])/z,y:(h[3]*u+h[4]*v+h[5])/z};};
}
