import {drawPrintLinks} from './print-link.mjs';
import { candidatePool, defaults, GenerationError } from './generator.mjs';
const layouts = {3:[1,3],5:[1,5],10:[2,5],25:[5,5],100:[10,10]};
function shuffle(items) {
  const a = [...items];
  for (let i = a.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
export function generateWorksheet(settings) {
  const s = {...defaults,...settings};
  const layout = layouts[s.count];
  if (!layout) throw new GenerationError('この問題数の表レイアウトは未対応です。');
  const [rows,cols] = layout, pool = candidatePool(s);
  const tops = shuffle(new Set(pool.map(p=>p.a))), lefts = shuffle(new Set(pool.map(p=>p.b)));
  const allowed = new Map(tops.map(a=>[a,new Set(pool.filter(p=>p.a===a).map(p=>p.b))]));
  let visited = 0;
  function find(index, selected, common, topNeeded, leftNeeded) {
    if (++visited > 200000) throw new GenerationError('表の条件確認に時間がかかっています。条件を絞って再生成してください。条件は変更していません。');
    if (common.length < leftNeeded || selected.length + tops.length-index < topNeeded) return null;
    if (selected.length === topNeeded) return {top:selected,left:common.slice(0,leftNeeded)};
    for(let i=index;i<tops.length;i++) {
      const result = find(i+1,[...selected,tops[i]],common.filter(b=>allowed.get(tops[i]).has(b)),topNeeded,leftNeeded);
      if(result) return result;
    }
    return null;
  }
  // Allowing repeats must not reduce a sheet to the minimum feasible pair.
  // Prefer the largest compatible rectangle of distinct operands, repeating
  // headers only when the requested dimensions require it.
  const plans = [];
  if (!s.allowDuplicates) plans.push([cols,rows]);
  else {
    for (let t=1;t<=Math.min(cols,tops.length);t++)
      for (let l=1;l<=Math.min(rows,lefts.length);l++) {
        if (cols>1 && t===1) continue;
        if (rows>1 && l===1 && (cols-1)%t===0) continue;
        plans.push([t,l]);
      }
    plans.sort((a,b)=>b[0]*b[1]-a[0]*a[1] || b[0]+b[1]-a[0]-a[1]);
  }
  let chosen=null;
  for(const [topNeeded,leftNeeded] of plans) {
    chosen=find(0,[],lefts,topNeeded,leftNeeded);
    if(chosen) break;
  }
  if (!chosen) throw new GenerationError('指定条件をすべて満たす計算表を作れません。数字の範囲・重複・繰り上がり／繰り下がりを見直してください。条件は変更していません。');
  const top = Array.from({length:cols},(_,i)=>chosen.top[i%chosen.top.length]);
  const left = Array.from({length:rows},(_,i)=>chosen.left[i%chosen.left.length]);
  const lookup = new Map(pool.map(p=>[`${p.a}:${p.b}`,p]));
  const questions = left.flatMap(b=>top.map(a=>lookup.get(`${a}:${b}`)));
  if (questions.some((p,i)=>i>0 && p.key===questions[i-1].key))
    throw new GenerationError('同じ問題の連続を避ける表を作れません。数字の範囲を広げてください。');
  return {version:1,operation:s.operation,count:s.count,top,left,questions};
}

export function drawWorksheet(container, sheet) {
  container.replaceChildren();
  const meta = document.createElement('div'); meta.className='paper-meta';
  for(const text of ['なまえ：________________','ひづけ：____年____月____日',`もんだい：${sheet.count}もん`,`できたかず：____もん／${sheet.count}もん`]) {
    const span=document.createElement('span'); span.textContent=text; meta.append(span);
  }
  container.append(meta);
  const table=document.createElement('table'); table.className='calculation-table';
  table.setAttribute('aria-label',`${sheet.count}問の計算表`);
  table.style.setProperty('--cell-height',`${Math.min(32,170/(sheet.left.length+1))}mm`);
  const head=document.createElement('tr'), corner=document.createElement('th');
  corner.textContent={add:'＋',subtract:'−',multiply:'×'}[sheet.operation]; head.append(corner);
  for(const a of sheet.top){const th=document.createElement('th');th.scope='col';th.textContent=a;head.append(th);}
  const thead=document.createElement('thead');thead.append(head);table.append(thead);
  const tbody=document.createElement('tbody');
  for(const b of sheet.left){const row=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=b;row.append(th);for(const a of sheet.top){const td=document.createElement('td');td.setAttribute('aria-label',`${a}と${b}の答えを書く欄`);row.append(td);}tbody.append(row);}
  table.append(tbody);container.append(table);
  const bottom=document.createElement('div');bottom.className='paper-bottom';
  if(sheet.operation==='subtract'){const note=document.createElement('p');note.textContent='うえの かず − ひだりの かず';bottom.append(note);}
  drawPrintLinks(bottom,{v:1,op:sheet.operation,t:sheet.top,l:sheet.left});
  container.append(bottom);
}
