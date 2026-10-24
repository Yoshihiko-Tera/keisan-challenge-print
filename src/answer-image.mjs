export async function answerImage(data) {
 const canvas=document.createElement('canvas');canvas.width=1240;canvas.height=1754;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1240,1754);
 ctx.fillStyle='#233b39';ctx.font='bold 38px sans-serif';ctx.fillText('計算プリント 解答',70,80);
 ctx.font='22px sans-serif';ctx.fillText(data.questions.length+'問',70,125);
 if(data.type!=='support') {
  const cols=data.t.length,rows=data.l.length,w=1100/(cols+1),h=Math.min(120,1400/(rows+1)),x=70,y=180;
  ctx.font='30px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++) {
   ctx.strokeStyle='#333';ctx.strokeRect(x+c*w,y+r*h,w,h);
   ctx.fillStyle=r&&c?'#bd3232':'#233b39';
   const text=!r?(!c?{add:'＋',subtract:'−',multiply:'×'}[data.op]:data.t[c-1]):!c?data.l[r-1]:data.questions[(r-1)*cols+c-1].answer;
   ctx.fillText(String(text),x+(c+.5)*w,y+(r+.5)*h);
  }
 } else {
  data.questions.forEach((p,i)=>{
   const x=70+(i%2)*560,y=230+Math.floor(i/2)*260;
   ctx.font='28px sans-serif';ctx.fillStyle='#233b39';ctx.fillText((data.offset+i+1)+'.  '+p.a+' '+{add:'＋',subtract:'−',multiply:'×'}[p.operation]+' '+p.b+' ＝',x,y);
   ctx.fillStyle='#bd3232';ctx.fillText(String(p.answer),x+370,y);
  });
 }
 return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
}
