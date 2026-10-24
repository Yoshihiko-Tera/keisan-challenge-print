// Pixel-only processing shared by the browser and the printed-number benchmark.
export function rectifyAnswer(source, box, map) {
  const scale=240/Math.max(box.w*210,box.h*297);
  const width=Math.max(8,Math.round(box.w*210*scale)),height=Math.max(8,Math.round(box.h*297*scale));
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const p=map(box.x+box.w*(x+.5)/width,box.y+box.h*(y+.5)/height);
    const sx=Math.round(p.x),sy=Math.round(p.y),to=(y*width+x)*4,from=(sy*source.width+sx)*4;
    const inside=sx>=0&&sy>=0&&sx<source.width&&sy<source.height;
    for(let c=0;c<3;c++)data[to+c]=inside?source.data[from+c]:255;data[to+3]=255;
  }
  return {width,height,data};
}
export function prepareDigits(image) {
  const {width:w,height:h,data}=image,gray=new Uint8Array(w*h),hist=new Uint32Array(256);
  let sum=0;
  for(let i=0;i<gray.length;i++){gray[i]=Math.round(.299*data[i*4]+.587*data[i*4+1]+.114*data[i*4+2]);hist[gray[i]]++;sum+=gray[i];}
  let threshold=160,best=-1,weight=0,partial=0;
  for(let t=0;t<255;t++){weight+=hist[t];partial+=t*hist[t];if(!weight||weight===gray.length)continue;const other=gray.length-weight,diff=partial/weight-(sum-partial)/other,variance=weight*other*diff*diff;if(variance>best){best=variance;threshold=t;}}
  threshold=Math.max(70,Math.min(210,threshold));
  const ink=Uint8Array.from(gray,g=>g<=threshold?1:0);
  // Remove long table-border runs, independently of the expected answer.
  for(let y=0;y<h;y++){let count=0;for(let x=0;x<w;x++)count+=ink[y*w+x];if(count>w*.85)for(let x=0;x<w;x++)ink[y*w+x]=0;}
  for(let x=0;x<w;x++){let count=0;for(let y=0;y<h;y++)count+=ink[y*w+x];if(count>h*.85)for(let y=0;y<h;y++)ink[y*w+x]=0;}
  let minX=w,minY=h,maxX=-1,maxY=-1;
  const seen=new Uint8Array(w*h);
  for(let start=0;start<ink.length;start++){
    if(!ink[start]||seen[start])continue;
    const queue=[start];seen[start]=1;let x0=w,y0=h,x1=0,y1=0;
    for(let j=0;j<queue.length;j++){
      const i=queue[j],x=i%w,y=Math.floor(i/w);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
      for(const n of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(n>=0&&ink[n]&&!seen[n]){seen[n]=1;queue.push(n);}
    }
    const cw=x1-x0+1,ch=y1-y0+1;
    const noise=queue.length<3 || (cw<=3&&ch>h*.5) || (ch<=3&&cw>w*.7);
    if(noise){for(const i of queue)ink[i]=0;continue;}
    minX=Math.min(minX,x0);minY=Math.min(minY,y0);maxX=Math.max(maxX,x1);maxY=Math.max(maxY,y1);
  }
  if(maxX<minX)return {width:80,height:80,data:new Uint8ClampedArray(80*80*4).fill(255),blank:true};
  const glyphW=maxX-minX+1,glyphH=maxY-minY+1,scale=Math.min(80/glyphH,300/glyphW);
  const width=Math.round(glyphW*scale)+40,height=Math.round(glyphH*scale)+40,out=new Uint8ClampedArray(width*height*4).fill(255);
  for(let y=20;y<height-20;y++)for(let x=20;x<width-20;x++){
    const sx=Math.min(maxX,minX+Math.floor((x-20)/scale)),sy=Math.min(maxY,minY+Math.floor((y-20)/scale));
    if(ink[sy*w+sx]){const i=(y*width+x)*4;out[i]=out[i+1]=out[i+2]=0;}
  }
  return {width,height,data:out,blank:false};
}
