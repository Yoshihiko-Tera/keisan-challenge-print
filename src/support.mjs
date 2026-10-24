// Each group represents a quantity; rows preserve visible groups of five.
export function renderQuantities(container, problem, canInteract) {
  container.replaceChildren();
  function quantity(value, label) {
    const group = document.createElement('div');
    group.className = 'quantity';
    group.setAttribute('role', 'group'); group.setAttribute('aria-label', label);
    const heading = document.createElement('span');
    heading.className = 'quantity-label'; heading.textContent = String(value);
    group.append(heading);
    if (value === 0) {
      const empty = document.createElement('span'); empty.className = 'quantity-zero'; empty.textContent = 'まるは 0こ'; group.append(empty);
    }
    for (let offset = 0; offset < value; offset += 5) {
      const row = document.createElement('div'); row.className = 'dot-row';
      for (let i = offset; i < Math.min(offset + 5, value); i++) {
        const dot = document.createElement('button');
        dot.type = 'button'; dot.className = 'count-dot';
        dot.setAttribute('aria-label', `${label}、${i + 1}こめ`);
        dot.setAttribute('aria-pressed', 'false');
        dot.onclick = () => {
          if (!canInteract()) return;
          const counted = dot.getAttribute('aria-pressed') !== 'true';
          dot.setAttribute('aria-pressed', String(counted));
          dot.classList.toggle('counted', counted);
        };
        row.append(dot);
      }
      group.append(row);
    }
    container.append(group);
  }
  if (problem.operation === 'multiply') {
    const summary = document.createElement('p'); summary.className = 'quantity-summary';
    summary.textContent = `${problem.b}こずつ、${problem.a}くみ`; container.append(summary);
    for (let i = 0; i < problem.a; i++) quantity(problem.b, `${i + 1}くみめの${problem.b}こ`);
  } else {
    quantity(problem.a, `はじめの${problem.a}こ`);
    const symbol = document.createElement('span'); symbol.className = 'quantity-symbol';
    symbol.textContent = problem.operation === 'add' ? '＋' : '−'; container.append(symbol);
    quantity(problem.b, `つぎの${problem.b}こ`);
  }
}
