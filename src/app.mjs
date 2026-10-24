import {linkedPrint} from './print-link.mjs';
import { generate } from './generator.mjs';
import { renderQuantities } from './support.mjs';
import { readRecords, writeRecords, localDate } from './records.mjs';
const form = document.querySelector('form');
const el = id => document.getElementById(id);
function update() {
  const op = form.elements.operation.value;
  el('topRange').hidden = op === 'multiply';
  el('tableRange').hidden = op !== 'multiply';
  el('carryField').hidden = op !== 'add';
  el('borrowField').hidden = el('negativeField').hidden = op !== 'subtract';
  el('durationField').hidden = form.elements.mode.value !== 'challenge';
  for (const node of form.querySelectorAll('input,select')) {
    node.disabled = false;
    for (let parent = node.parentElement; parent && parent !== form; parent = parent.parentElement)
      if (parent.hidden) node.disabled = true;
  }
}
form.addEventListener('change', update);
form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const settings = Object.fromEntries(data);
  for (const key of ['count','topMin','topMax','leftMin','leftMax','tableMin','tableMax'])
    if (data.has(key)) settings[key] = Number(data.get(key));
  settings.nonNegative = form.elements.nonNegative.checked;
  settings.allowDuplicates = form.elements.allowDuplicates.checked;
  el('questions').replaceChildren(); el('error').textContent = ''; el('summary').textContent = '';
  el('preview').hidden = false;
  try {
    const questions = generate(settings);
    const symbols = { add: '＋', subtract: '−', multiply: '×' };
    el('summary').textContent = `${questions.length}問を生成しました。先生用の確認なので答えも表示しています。`;
    for (const p of questions) {
      const li = document.createElement('li');
      li.textContent = `${p.a} ${symbols[p.operation]} ${p.b} ＝ ${p.answer}`;
      el('questions').append(li);
    }
  } catch (error) {
    el('error').textContent = error.message;
  }
  el('preview').focus();
});
update();

const symbols = { add: '＋', subtract: '−', multiply: '×' };
let activeSettings = readSettings();
let importedPrint = null;
try { importedPrint = linkedPrint(location.hash); }
catch(error) { el('startError').textContent = 'プリントを開けません。'+error.message; }

let session = null;
let tick = null;
let advance = null;
let audio = null;
let selectedLearner = '';
let pendingRecordDelete = null;
let saveMessage = '';
function readSettings() {
  const s = Object.fromEntries(new FormData(form));
  for (const key of ['count','topMin','topMax','leftMin','leftMax','tableMin','tableMax','duration'])
    if (key in s) s[key] = Number(s[key]);
  s.duration = Number(form.elements.duration.value);
  s.nonNegative = form.elements.nonNegative.checked;
  s.allowDuplicates = form.elements.allowDuplicates.checked;
  return s;
}
function view(name) {
  const childView = ['home','lesson','result'].includes(name);
  document.title = childView ? 'かぞえて とこう！けいさんチャレンジ' : 'けいさんチャレンジ｜先生用';
  document.querySelector('header h1').textContent = childView ? 'けいさんチャレンジ' : 'けいさんチャレンジ｜先生用';
  document.body.dataset.view=name;
  for (const id of ['home','teacherMenuView','teacherView','recordsView','lesson','result']) el(id).hidden = id !== name;
  el('teacherEntry').hidden = name !== 'home';
  el('teacherBack').hidden = !['teacherView','recordsView'].includes(name);
  el('homeLink').hidden = name === 'home';
  if (name !== 'lesson' && el('leaveLesson').open) el('leaveLesson').close();
  document.querySelector('footer').hidden = name === 'lesson' || name === 'result';
  window.scrollTo(0, 0);
}
function home() {
  clearInterval(tick); clearTimeout(advance); session = null;
  el('homeSummary').textContent = `${symbols[activeSettings.operation]} ${activeSettings.count}問 · ${activeSettings.mode === 'practice' ? '練習モード' : `実践モード ${activeSettings.duration}分`} · ${activeSettings.display === 'support' ? 'サポート表示' : '通常表示'}`;
  view('home');
  refreshLearnerSummary();
}
function refreshLearnerSummary() {
  try {
    const learner = readRecords(localStorage).learners.find(p => p.id === selectedLearner);
    if (!learner) selectedLearner = '';
    el('childName').textContent = learner?.name ?? '';
    el('childName').hidden = !learner;
    el('learnerSummary').textContent = learner ? `記録する学習者：${learner.name}` : '学習者：未選択（記録を保存せずに学習）';
    if (saveMessage) el('learnerSummary').textContent += ` · ${saveMessage}`;
  } catch { selectedLearner = ''; el('childName').textContent=''; el('childName').hidden=true; el('learnerSummary').textContent = '端末内の記録を読み込めません。記録を保存せずに学習できます。'; }
}
function showRecords() {
  view('recordsView'); pendingRecordDelete = null;
  el('deleteRecordConfirm').hidden = true;
  el('storageMessage').textContent = saveMessage;
  renderRecords();
}
function renderRecords() {
  el('recordRows').replaceChildren(); el('recordTable').hidden = true;
  el('clearLearnerRecords').hidden = true;
  el('learnerSelect').replaceChildren(new Option('選ばない（保存せずに学習）', ''));
  try {
    const data = readRecords(localStorage);
    for (const p of data.learners) el('learnerSelect').append(new Option(p.name, p.id));
    if (!data.learners.some(p => p.id === selectedLearner)) selectedLearner = '';
    el('learnerSelect').value = selectedLearner;
    const records = data.records.filter(r => r.learnerId === selectedLearner).reverse();
    el('recordEmpty').textContent = !selectedLearner ? '学習者を選ぶと記録が表示されます。' : records.length ? '' : 'まだ記録がありません。';
    el('recordTable').hidden = el('clearLearnerRecords').hidden = !records.length;
    for (const record of records) {
      const row = document.createElement('tr');
      for (const text of [record.date, `${record.correct}もん`]) { const cell = document.createElement('td'); cell.textContent = text; row.append(cell); }
      const cell = document.createElement('td'), button = document.createElement('button');
      button.type = 'button'; button.className = 'quiet'; button.textContent = '削除';
      button.setAttribute('aria-label', `${record.date}の${record.correct}もんの記録を削除`);
      button.onclick = () => { pendingRecordDelete = { id:record.id, learnerId:selectedLearner }; el('deleteRecordConfirm').hidden = false; };
      cell.append(button); row.append(cell); el('recordRows').append(row);
    }
  } catch { el('storageMessage').textContent = '記録を読み込めません。既存のデータを上書きせずに停止しています。'; el('recordEmpty').textContent = ''; }
}
el('openRecords').onclick = showRecords;
el('recordsHome').onclick = home;
el('learnerSelect').onchange = () => {
  selectedLearner = el('learnerSelect').value; saveMessage = '';
  pendingRecordDelete = null; el('deleteRecordConfirm').hidden = true;
  renderRecords(); refreshLearnerSummary();
};
el('addLearner').onclick = () => {
  const name = el('learnerName').value.trim();
  if (!name) { el('learnerMessage').textContent = '番号またはニックネームを入力してください。'; return; }
  try {
    const data = readRecords(localStorage);
    if (data.learners.some(p => p.name === name)) { el('learnerMessage').textContent = '同じ番号・ニックネームが登録されています。選択欄から選んでください。'; return; }
    const learner = { id:crypto.randomUUID(), name };
    data.learners.push(learner); writeRecords(localStorage, data); selectedLearner = learner.id;
    el('learnerName').value = ''; el('learnerMessage').textContent = '登録して選択しました。';
    saveMessage = ''; renderRecords(); refreshLearnerSummary();
  } catch { el('learnerMessage').textContent = '登録できませんでした。ブラウザーの保存設定や空き容量を確認してください。'; }
};
el('clearLearnerRecords').onclick = () => { pendingRecordDelete = { learnerId:selectedLearner }; el('deleteRecordConfirm').hidden = false; };
el('cancelRecordDelete').onclick = () => { pendingRecordDelete = null; el('deleteRecordConfirm').hidden = true; };
el('confirmRecordDelete').onclick = () => {
  if (!pendingRecordDelete) return;
  try {
    const data = readRecords(localStorage), target = pendingRecordDelete;
    data.records = data.records.filter(r => target.id ? r.id !== target.id : r.learnerId !== target.learnerId);
    writeRecords(localStorage, data); pendingRecordDelete = null;
    el('deleteRecordConfirm').hidden = true; el('storageMessage').textContent = '記録を削除しました。'; renderRecords();
  } catch { el('storageMessage').textContent = '削除できませんでした。記録は削除済みとして扱っていません。'; }
};
el('teacher').onclick = () => view('teacherView');
el('teacherEntry').onclick = () => {refreshLearnerSummary();view('teacherMenuView');};
el('teacherBack').onclick = () => {refreshLearnerSummary();view('teacherMenuView');};
el('homeLink').onclick = () => {
  if (!session) { home(); return; }
  if (expired()) { finish(); return; }
  el('leaveLesson').showModal();
};
el('continueLesson').onclick = () => el('leaveLesson').close();
el('confirmLeave').onclick = () => {
  if (!session) { el('leaveLesson').close(); return; }
  if (expired()) { finish(); return; }
  saveMessage = '';
  home();
  el('start').focus();
};
el('resultHome').onclick = home;
el('apply').onclick = () => {
  if (!form.reportValidity()) return;
  try { generate(readSettings()); activeSettings = readSettings(); home(); }
  catch (error) { el('preview').hidden = false; el('questions').replaceChildren(); el('summary').textContent = ''; el('error').textContent = error.message; el('preview').focus(); }
};
function expired() { return session?.settings.mode === 'challenge' && Date.now() >= session.deadline; }
function finish() {
  if (!session) return;
  clearInterval(tick); clearTimeout(advance);
  el('resultTitle').textContent = `${session.correct}もん できたね！`;
  saveMessage = '';
  if (session.learnerId) {
    try {
      const data = readRecords(localStorage);
      if (!data.learners.some(p => p.id === session.learnerId)) throw new Error('学習者が見つかりません');
      data.records.push({id:crypto.randomUUID(), learnerId:session.learnerId, date:localDate(), correct:session.correct});
      writeRecords(localStorage, data); saveMessage = '学習記録を保存しました。';
    } catch { saveMessage = '今回の学習記録を保存できませんでした。'; }
  }
  session = null; view('result');
}
function clock() {
  if (!session) return;
  if (expired()) { finish(); return; }
  const seconds = Math.ceil((session.deadline - Date.now()) / 1000);
  el('timer').textContent = session.settings.mode === 'challenge' ? `のこり ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2,'0')}` : '';
}
function renderQuestion() {
  if (expired()) { finish(); return; }
  const s = session, p = s.questions[s.index];
  s.input = ''; s.errors = 0; s.locked = false; s.revealed = false;
  el('feedback').textContent = ''; el('retryOptions').hidden = true;
  el('showAnswer').hidden = false; el('skip').textContent = '次へ進む';
  el('equation').textContent = `${p.a} ${symbols[p.operation]} ${p.b} ＝`;
  el('answer').textContent = '？';
  el('support').hidden = s.settings.display !== 'support';
  el('quantities').replaceChildren();
  if (!el('support').hidden) renderQuantities(el('quantities'), p, () => {
    if (expired()) { finish(); return false; }
    return !!session && !session.locked && !session.revealed;
  });
  renderProgress();
  el('keypad').dataset.side = s.settings.keypad;
  el('lesson').dataset.side = s.settings.keypad;
  el('minus').hidden = p.answer >= 0;
}
function renderProgress() {
  const s = session;
  el('progress').replaceChildren();
  const start = Math.floor(s.index / 10) * 10;
  for (let i = start; i < Math.min(start + 10, s.questions.length); i++) {
    const item = document.createElement('li');
    const problem = s.questions[i];
    const number = document.createElement('span');
    number.className = 'problem-number'; number.textContent = String(i + 1);
    const expression = document.createElement('span');
    expression.className = 'problem-expression';
    expression.textContent = `${problem.a} ${symbols[problem.operation]} ${problem.b}`;
    const answer = document.createElement('span');
    answer.className = 'problem-status';
    const recorded = s.answers[i];
    answer.textContent = recorded === undefined ? '' : recorded === null ? '△' : '○';
    if (recorded !== undefined) {
      answer.classList.add(recorded === null ? 'passed' : 'correct');
      answer.setAttribute('aria-label', recorded === null ? '答えを見た、またはパスした問題' : '正解');
    }
    item.append(number, expression, answer);
    item.className = i === s.index ? 'current' : i < s.index ? 'done' : '';
    item.setAttribute('aria-label', `${i + 1}問目${i === s.index ? '、いまの問題' : i < s.index ? '、終了' : ''}`);
    if (i === s.index) item.setAttribute('aria-current', 'step');
    el('progress').append(item);
  }
  const current = el('progress').querySelector('.current');
  if (current) {
    const strip = el('progress');
    const offset = current.offsetLeft - strip.offsetLeft;
    if (offset < strip.scrollLeft || offset + current.offsetWidth > strip.scrollLeft + strip.clientWidth)
      strip.scrollLeft = Math.max(0, offset - (strip.clientWidth - current.offsetWidth) / 2);
  }
}
function next() {
  if (!session) return;
  if (expired()) { finish(); return; }
  if (session.answers[session.index] === undefined) session.answers[session.index] = null;
  const previous = session.questions[session.index].key;
  session.index++;
  if (session.index >= session.questions.length) {
    if (session.settings.mode === 'practice') { finish(); return; }
    try { session.questions = generate(session.settings, previous); session.index = 0; session.answers = []; }
    catch (error) { clearInterval(tick); session = null; home(); el('startError').textContent = error.message; return; }
  }
  renderQuestion();
}
function input(key) {
  if (!session) return;
  if (expired()) { finish(); return; }
  if (session.locked || session.revealed) return;
  if (key === 'erase') session.input = session.input.slice(0,-1);
  else if (key === 'minus') session.input = session.input.startsWith('-') ? session.input.slice(1) : '-' + session.input;
  else if (key === 'enter') { submit(); return; }
  else session.input += key;
  el('answer').textContent = session.input || '？';
}
function submit() {
  if (!session.input || session.input === '-') return;
  const p = session.questions[session.index];
  if (Number(session.input) === p.answer) {
    session.answers[session.index] = session.input;
    renderProgress();
    session.correct++; session.locked = true;
    el('feedback').textContent = '○'; el('retryOptions').hidden = true;
    if (audio && session.settings.sound === 'on') {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(0.035,audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001,audio.currentTime + 0.12);
      oscillator.start(); oscillator.stop(audio.currentTime + 0.13);
    }
    advance = setTimeout(next, 450);
  } else {
    session.errors++; session.input = ''; el('answer').textContent = '？'; el('feedback').textContent = 'もういちど';
    el('retryOptions').hidden = !(session.settings.mode === 'challenge' && session.errors >= 2);
  }
}
el('start').onclick = () => {
  el('startError').textContent = '';
  try {
    const questions = importedPrint ? importedPrint.questions.map(p=>({...p,key:p.operation+':'+p.a+':'+p.b})) : generate(activeSettings);
    const lessonSettings = importedPrint ? {...activeSettings,mode:'practice',count:questions.length,display:importedPrint.type==='support'?'support':'normal'} : activeSettings;
    if (activeSettings.sound === 'on') { audio ??= new AudioContext(); audio.resume(); }
    refreshLearnerSummary();
    session = { learnerId:selectedLearner, settings: { ...lessonSettings }, questions, answers: [], index: 0, correct: 0, deadline: Date.now() + activeSettings.duration * 60000 };
    el('modeLabel').textContent = lessonSettings.mode === 'practice' ? '練習モード' : '実践モード';
    view('lesson'); renderQuestion(); clock(); tick = setInterval(clock, 100);
  } catch (error) { el('startError').textContent = error.message; }
};
el('showAnswer').onclick = () => {
  if (!session || expired()) { if (session) finish(); return; }
  session.revealed = true;
  el('feedback').textContent = `答えは ${session.questions[session.index].answer}`;
  el('showAnswer').hidden = true;
};
el('skip').onclick = next;
for (const [label, key] of [['7','7'],['8','8'],['9','9'],['4','4'],['5','5'],['6','6'],['1','1'],['2','2'],['3','3'],['消す','erase'],['0','0'],['決定','enter'],['−','minus']]) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
  if (key === 'minus') button.id = 'minus';
  button.onclick = () => input(key); el('keypad').append(button);
}
document.addEventListener('keydown', event => {
  if (el('leaveLesson').open) return;
  if (!session || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (event.target.closest?.('.count-dot') && event.key === 'Enter') return;
  let key = /^\d$/.test(event.key) ? event.key : { Enter:'enter', Backspace:'erase', Delete:'erase', '-':'minus' }[event.key];
  if (key) { event.preventDefault(); input(key); }
});
document.addEventListener('visibilitychange', () => { if (session && expired()) finish(); });

home();

if(importedPrint) {
 const notice=document.createElement('p');notice.className='imported-notice';notice.textContent='プリントと おなじ '+importedPrint.questions.length+'もん';el('start').before(notice);
}

window.addEventListener('hashchange',()=>location.reload());
