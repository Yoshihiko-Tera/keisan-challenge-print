export function chooseCandidate(candidates) {
  return candidates.filter(c=>/^-?\d+$/.test(c.text)).sort((a,b)=>b.confidence-a.confidence)[0] ?? {text:'',confidence:0};
}
export async function recognizeDigits(worker,image,stillActive=()=>true) {
  const candidates=[];
  for(const mode of ['7','8','10','13']){
    if(!stillActive())return {text:'',confidence:0,cancelled:true};
    await worker.setParameters({tessedit_pageseg_mode:mode,user_defined_dpi:'300'});
    const {data}=await worker.recognize(image);
    candidates.push({mode,text:data.text.trim(),confidence:data.confidence});
  }
  return {...chooseCandidate(candidates),candidates};
}
