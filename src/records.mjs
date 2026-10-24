const KEY = '100masu.records.v1';
export function readRecords(storage) {
  const raw = storage.getItem(KEY);
  if (!raw) return { learners: [], records: [] };
  const data = JSON.parse(raw);
  if (!Array.isArray(data.learners) || !Array.isArray(data.records) ||
      !data.learners.every(p => typeof p.id === 'string' && typeof p.name === 'string') ||
      !data.records.every(r => typeof r.id === 'string' && typeof r.learnerId === 'string' && typeof r.date === 'string' && Number.isSafeInteger(r.correct) && r.correct >= 0))
    throw new Error('保存済みの記録を読み取れません。上書きせずに停止しました。');
  return data;
}
export function writeRecords(storage, data) {
  storage.setItem(KEY, JSON.stringify(data));
}
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
