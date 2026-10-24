// Paint the actual rendered paper, including quantities and QR codes, to PNG.
export async function paperImage(paper) {
 await document.fonts.ready;
 const bounds=paper.getBoundingClientRect(),canvas=document.createElement('canvas');
 const scale=2;canvas.width=Math.ceil(bounds.width*scale);canvas.height=Math.ceil(bounds.height*scale);
 const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle='#fff';ctx.fillRect(0,0,bounds.width,bounds.height);
 async function paint(node) {
  if(node.nodeType===Node.TEXT_NODE) {
   const style=getComputedStyle(node.parentElement);ctx.font=style.font || [style.fontWeight,style.fontSize,style.fontFamily].join(' ');ctx.fillStyle=style.color;ctx.textBaseline='alphabetic';
   for(let i=0;i<node.length;i++) {if(/\s/.test(node.data[i]))continue;const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);const r=range.getBoundingClientRect();if(!r.width||!r.height)continue;const fontSize=parseFloat(style.fontSize);ctx.fillText(node.data[i],r.left-bounds.left,r.top-bounds.top+(r.height-fontSize)/2+fontSize*.85);}
   return;
  }
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden')return;
  const r=node.getBoundingClientRect(),x=r.left-bounds.left,y=r.top-bounds.top;
  if(node.tagName.toLowerCase()==='svg') {
   const svg=new XMLSerializer().serializeToString(node),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
   try {const img=new Image();img.src=url;await img.decode();ctx.drawImage(img,x,y,r.width,r.height);}finally{URL.revokeObjectURL(url);}return;
  }
  ctx.fillStyle=style.backgroundColor;
  const circle=style.borderRadius==='50%';
  if(circle){ctx.beginPath();ctx.ellipse(x+r.width/2,y+r.height/2,r.width/2,r.height/2,0,0,Math.PI*2);ctx.fill();}
  else ctx.fillRect(x,y,r.width,r.height);
  const border=parseFloat(style.borderTopWidth);
  if(border && style.borderTopStyle!=='none'){ctx.strokeStyle=style.borderTopColor;ctx.lineWidth=border;if(circle){ctx.beginPath();ctx.ellipse(x+r.width/2,y+r.height/2,(r.width-border)/2,(r.height-border)/2,0,0,Math.PI*2);ctx.stroke();}else ctx.strokeRect(x+border/2,y+border/2,r.width-border,r.height-border);}
  for(const child of node.childNodes)await paint(child);
 }
 await paint(paper);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('画像を作成できませんでした。')),'image/png'));
}
