import {drawPrintLinks} from './print-link.mjs';
import { generate } from './generator.mjs';
export function generateSupportPages(settings) {
  const questions = generate(settings);
  const pages = [];
  for (let offset=0; offset<questions.length; offset+=10)
    pages.push({offset, questions:questions.slice(offset,offset+10)});
  return pages;
}
export function drawSupportPages(container, pages) {
  container.replaceChildren();
  for (const page of pages) {
    const paper=document.createElement('article'); paper.className='support-paper';
    const meta=document.createElement('div'); meta.className='paper-meta';
    for(const text of ['なまえ：________________','ひづけ：____年____月____日',`もんだい：${page.questions.length}もん`,`できたかず：____もん／${page.questions.length}もん`]) {
      const span=document.createElement('span');span.textContent=text;meta.append(span);
    }
    paper.append(meta);
    const grid=document.createElement('div');grid.className='support-paper-grid';
    for(let i=0;i<10;i++) {
      const card=document.createElement('div');card.className='support-paper-card';
      const p=page.questions[i];
      if(p) {
        const equation=document.createElement('div');equation.className='support-paper-equation';
        const text=document.createElement('span');text.textContent=`${page.offset+i+1}.　${p.a} ${{add:'＋',subtract:'−',multiply:'×'}[p.operation]} ${p.b} ＝`;
        const blank=document.createElement('span');blank.className='paper-answer-blank';blank.setAttribute('aria-label','答えを書く欄');equation.append(text,blank);card.append(equation);
        const quantities=document.createElement('div');quantities.className='paper-quantities';
        function quantity(value,label) {
          const group=document.createElement('div');group.className='paper-quantity';group.setAttribute('aria-label',label);
          if(value===0){group.textContent='0こ';}
          for(let j=0;j<value;j+=5){const row=document.createElement('div');row.className='paper-dot-row';for(let k=j;k<Math.min(j+5,value);k++){const dot=document.createElement('span');dot.className='paper-dot';row.append(dot);}group.append(row);}
          quantities.append(group);
        }
        if(p.operation==='multiply') {
          for(let g=0;g<p.a;g++) quantity(p.b,`${p.b}このまとまり`);
          if(p.a===0) quantities.textContent='0くみ';
        } else {
          quantity(p.a,`${p.a}こ`);
          const symbol=document.createElement('span');symbol.textContent=p.operation==='add'?'＋':'−';quantities.append(symbol);
          quantity(p.b,`${p.b}こ`);
        }
        card.append(quantities);
      } else card.classList.add('unused');
      grid.append(card);
    }
    paper.append(grid);
    const bottom=document.createElement('div');bottom.className='paper-bottom';
    drawPrintLinks(bottom,{v:1,type:'support',offset:page.offset,q:page.questions.map(p=>[p.operation,p.a,p.b])});paper.append(bottom);container.append(paper);
  }
  // Reject a layout that would crop quantities rather than shrinking the dots silently.
  for(const card of container.querySelectorAll('.support-paper-card:not(.unused)'))
    if(card.scrollHeight>card.clientHeight+1 || card.scrollWidth>card.clientWidth+1)
      throw new Error('丸を読み取れる大きさで紙面に収められません。数字の範囲や掛け算の段を見直してください。条件は変更していません。');
}
