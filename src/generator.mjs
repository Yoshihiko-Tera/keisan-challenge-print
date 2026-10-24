export class GenerationError extends Error {}

export const defaults = Object.freeze({
  operation: 'add', count: 10, topMin: 1, topMax: 5,
  leftMin: 1, leftMax: 5, carry: 'any', borrow: 'any',
  nonNegative: true, allowDuplicates: false,
  tableMin: 1, tableMax: 9,
});

function range(min, max) {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 0 || max < min)
    throw new GenerationError('数字の範囲を0以上の整数で正しく指定してください。');
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function carries(a, b) {
  while (a || b) {
    if (a % 10 + b % 10 >= 10) return true;
    a = Math.floor(a / 10); b = Math.floor(b / 10);
  }
  return false;
}

function borrows(a, b) {
  while (a || b) {
    if (a % 10 < b % 10) return true;
    a = Math.floor(a / 10); b = Math.floor(b / 10);
  }
  return false;
}

function matches(condition, value) {
  return condition === 'any' || (condition === 'required' ? value : !value);
}

export function candidatePool(settings) {
  const s = { ...defaults, ...settings };
  if (!['add', 'subtract', 'multiply'].includes(s.operation))
    throw new GenerationError('計算の種類を選んでください。');
  if (!Number.isSafeInteger(s.count) || s.count < 1)
    throw new GenerationError('問題数を1以上の整数で指定してください。');
  if (![s.carry, s.borrow].every(v => ['any', 'required', 'forbidden'].includes(v)))
    throw new GenerationError('繰り上がり・繰り下がりの条件が不正です。');
  const top = s.operation === 'multiply' ? range(s.tableMin, s.tableMax) : range(s.topMin, s.topMax);
  const left = range(s.leftMin, s.leftMax);
  const pool = [];
  for (const a of top) for (const b of left) {
    if (s.operation === 'add' && !matches(s.carry, carries(a, b))) continue;
    if (s.operation === 'subtract' && ((s.nonNegative && a < b) || !matches(s.borrow, borrows(a, b)))) continue;
    const answer = s.operation === 'add' ? a + b : s.operation === 'subtract' ? a - b : a * b;
    if (!Number.isSafeInteger(answer)) throw new GenerationError('計算結果を正確に扱える範囲を超えています。');
    pool.push({ a, b, answer, operation: s.operation, key: `${s.operation}:${a}:${b}` });
  }
  return pool;
}

export function generate(settings, previousKey = null, random = Math.random) {
  const s = { ...defaults, ...settings };
  const pool = candidatePool(s);
  if (!pool.length || (!s.allowDuplicates && pool.length < s.count))
    throw new GenerationError(`指定条件では${s.count}問を生成できません。条件に合う組み合わせは${pool.length}通りです。`);
  const result = [];
  let previous = previousKey;
  const available = [...pool];
  for (let i = 0; i < s.count; i++) {
    const choices = available.filter(p => p.key !== previous);
    if (!choices.length) throw new GenerationError('同じ問題の連続を避ける条件を満たせません。数字の範囲を見直してください。');
    const item = choices[Math.floor(random() * choices.length)];
    result.push({ ...item }); previous = item.key;
    if (!s.allowDuplicates) available.splice(available.indexOf(item), 1);
  }
  return result;
}
