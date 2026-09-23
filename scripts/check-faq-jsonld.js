// Keeps the FAQPage JSON-LD in website/index.html identical to the visible FAQ.
//
// Google asks that FAQ markup reflect content visible on the page. The two are
// separate copies of the same text, so they drift: once they had, two questions
// were missing from the markup and three answers were worded differently.
//
//   node scripts/check-faq-jsonld.js           check; exits 1 on any mismatch
//   node scripts/check-faq-jsonld.js --write   regenerate the JSON-LD from the FAQ
//
// The visible <details class="faq-item"> FAQ is the source of truth, because it
// is what the reader sees. No dependencies, so CI can run it without npm install.

const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'website', 'index.html');
const BASE = 'https://botlens.iamjarl.com/';
const LDJSON = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
const ITEM = /<details class="faq-item">\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const unescape = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(/^#x/i.test(e) ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  return ENTITIES[e.toLowerCase()] ?? m;
});
const collapse = s => s.replace(/\s+/g, ' ').trim();
// What a reader sees: tags removed, entities decoded, whitespace collapsed.
const text = s => collapse(unescape(s.replace(/<[^>]+>/g, '')));

// Google allows <a> and <strong> in FAQ answers, so the markup keeps them. rel=
// means nothing in structured data, and relative links must be absolute there.
const toMarkup = html => unescape(collapse(
  html.replace(/\s+rel="[^"]*"/g, '')
      .replace(/href="([^"]+)"/g, (m, href) => `href="${new URL(href, BASE).href}"`)));

function visibleFaq(src) {
  const items = [...src.matchAll(ITEM)];
  // A <details class="faq-item"> the pattern cannot read would otherwise be
  // skipped without a word, and the check would pass while missing a question.
  const declared = (src.match(/<details class="faq-item">/g) || []).length;
  if (declared !== items.length) {
    fail([`Found ${declared} <details class="faq-item"> but could read ${items.length}.`,
          'Each item must be exactly <summary>question</summary><p>answer</p>.']);
  }
  return items.map(([, q, a]) => ({ q: text(q), a, aText: text(a) }));
}

function faqBlock(src) {
  for (const m of src.matchAll(LDJSON)) {
    let data;
    try { data = JSON.parse(m[1]); } catch (e) { fail([`A JSON-LD block does not parse: ${e.message}`]); }
    if (data['@type'] === 'FAQPage') return { match: m, data };
  }
  return null;
}

function fail(lines) {
  console.error(['✗ FAQPage JSON-LD check failed', ...lines.map(l => `  ${l}`)].join('\n'));
  process.exit(1);
}

const src = fs.readFileSync(FILE, 'utf8');
const visible = visibleFaq(src);
if (visible.length === 0) fail(['No visible FAQ found.']);

if (process.argv.includes('--write')) {
  const block = faqBlock(src);
  if (!block) fail(['No FAQPage JSON-LD block to replace.']);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: visible.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: toMarkup(a) },
    })),
  };
  const body = JSON.stringify(data, null, 2).split('\n').map(l => '  ' + l).join('\n');
  const script = `<script type="application/ld+json">\n${body}\n  </script>`;
  const { match } = block;
  const out = src.slice(0, match.index) + script + src.slice(match.index + match[0].length);
  if (out === src) { console.log(`✓ FAQPage JSON-LD already matches (${visible.length} questions)`); process.exit(0); }
  fs.writeFileSync(FILE, out);
  console.log(`✓ Regenerated FAQPage JSON-LD from the visible FAQ (${visible.length} questions)`);
  process.exit(0);
}

const block = faqBlock(src);
if (!block) fail(['No FAQPage JSON-LD block found.', 'Run `npm run fix:faq` to generate it.']);
const marked = (block.data.mainEntity || []).map(e => ({ q: text(e.name || ''), aText: text(e.acceptedAnswer?.text || '') }));

const problems = [];
const inMarkup = new Map(marked.map(m => [m.q, m]));
const onPage = new Set(visible.map(v => v.q));
for (const v of visible) {
  const m = inMarkup.get(v.q);
  if (!m) problems.push(`missing from JSON-LD: "${v.q}"`);
  else if (m.aText !== v.aText) problems.push(`answer differs: "${v.q}"`, `    page:    ${v.aText}`, `    json-ld: ${m.aText}`);
}
for (const m of marked) if (!onPage.has(m.q)) problems.push(`in JSON-LD but not on the page: "${m.q}"`);
if (!problems.length && marked.map(m => m.q).join('\n') !== visible.map(v => v.q).join('\n')) {
  problems.push('same questions, different order');
}

if (problems.length) {
  fail([...problems, '', 'The visible FAQ is the source of truth. To fix, run:', '  npm run fix:faq', 'then commit website/index.html.']);
}
console.log(`✓ FAQPage JSON-LD matches the visible FAQ (${visible.length} questions)`);
