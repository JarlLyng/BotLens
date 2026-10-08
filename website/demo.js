// Web demo (#28): sends one address to the demo endpoint and shows the partial
// score. The section stays hidden until index.html names the endpoint in data-api.
(() => {
  const section = document.getElementById('try');
  const api = section && section.dataset.api;
  if (!api) return;
  section.hidden = false;

  const form = section.querySelector('form');
  const input = form.querySelector('input');
  const button = form.querySelector('button');
  const result = section.querySelector('.demo-result');
  const STORE = 'https://chromewebstore.google.com/detail/botlens/lpopnolnbpkmealenachikdfkfeaoecl';

  // Built with textContent only: every value here comes from another site.
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function signal(name, s) {
    const row = el('div', 'demo-signal');
    row.append(el('span', `dot ${s.status}`), el('strong', '', `${name}:`), el('span', '', s.value));
    return row;
  }

  function show(data) {
    const score = el('div', 'demo-score', String(data.score));
    score.append(el('small', '', ' / 100, partial'));
    // Each row already shows its category's first issue; list the rest.
    const issues = [...data.issues.robots.slice(1), ...data.issues.semantic.slice(1)];
    const list = el('ul', 'demo-issues');
    issues.forEach(issue => list.append(el('li', '', issue)));
    const note = el('p', 'demo-note', `Checked ${data.url}. JavaScript rendering and the full details need the extension. `);
    const link = el('a', '', 'Install BotLens');
    link.href = STORE;
    link.rel = 'noopener';
    link.dataset.umamiEvent = 'store-click';
    link.dataset.umamiEventStore = 'chrome-web-store';
    link.dataset.umamiEventPlacement = 'demo';
    link.dataset.umamiEventLocale = 'en';
    note.append(link);
    result.replaceChildren(score, signal('robots.txt & Meta', data.robots), signal('Content structure', data.semantic));
    if (issues.length) result.append(list);
    result.append(note);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const url = input.value.trim();
    if (!url) { input.focus(); return; }
    button.disabled = true;
    button.textContent = 'Checking…';
    result.replaceChildren(el('p', 'demo-note', 'Fetching the page and its robots.txt…'));
    try {
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The check failed. Try again in a moment.');
      show(data);
    } catch (e) {
      const message = e instanceof TypeError ? 'The demo could not be reached. Try again in a moment.' : e.message;
      result.replaceChildren(el('p', 'demo-error', message));
    } finally {
      button.disabled = false;
      button.textContent = 'Check';
    }
  });
})();
