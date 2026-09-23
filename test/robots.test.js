// Tests for the robots.txt parser and the JS-rendering heuristic in popup.js.
// Run with `npm test`. They load the shipped popup.js; see test/load-popup.js.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { loadPopup, plain } = require('./load-popup');

const P = loadPopup();
const parse = (txt, path = '/') => plain(P.parseRobotsTxt(txt, path));

describe('parseRobotsTxt', () => {
  test('a missing or empty file blocks nothing', () => {
    for (const txt of [null, undefined, '']) {
      const r = parse(txt);
      assert.equal(r.exists, false);
      assert.equal(r.blockedAll, false);
      assert.deepEqual(r.blockedBots, []);
    }
  });

  test('a file of only comments and blank lines blocks nothing', () => {
    const r = parse('# nothing here\n\n   \n# still nothing');
    assert.equal(r.exists, true);
    assert.equal(r.blockedAll, false);
    assert.deepEqual(r.blockedBots, []);
  });

  test('User-agent: * with Disallow: / blocks everything', () => {
    assert.equal(parse('User-agent: *\nDisallow: /').blockedAll, true);
  });

  test('a GPTBot group blocks GPTBot and nothing else', () => {
    const r = parse('User-agent: GPTBot\nDisallow: /');
    assert.deepEqual(r.blockedBots, ['gptbot']);
    assert.equal(r.blockedAll, false);
  });

  test('user-agent matching is case-insensitive', () => {
    assert.deepEqual(parse('User-agent: gPtBoT\nDisallow: /').blockedBots, ['gptbot']);
  });

  test('consecutive User-agent lines share one group', () => {
    const r = parse('User-agent: GPTBot\nUser-agent: ClaudeBot\nDisallow: /');
    assert.deepEqual(r.blockedBots.sort(), ['claudebot', 'gptbot']);
  });

  test('Allow overrides Disallow at equal length', () => {
    const r = parse('User-agent: GPTBot\nDisallow: /docs\nAllow: /docs', '/docs');
    assert.deepEqual(r.blockedBots, []);
  });

  test('a longer Disallow beats a shorter Allow', () => {
    const r = parse('User-agent: GPTBot\nAllow: /docs\nDisallow: /docs/private', '/docs/private/page');
    assert.deepEqual(r.blockedBots, ['gptbot']);
  });

  test('a longer Allow beats a shorter Disallow', () => {
    const r = parse('User-agent: GPTBot\nDisallow: /docs\nAllow: /docs/public', '/docs/public/page');
    assert.deepEqual(r.blockedBots, []);
  });

  test('an empty Disallow allows everything', () => {
    assert.deepEqual(parse('User-agent: GPTBot\nDisallow:').blockedBots, []);
  });

  test('a Disallow for another path does not block this one', () => {
    assert.deepEqual(parse('User-agent: GPTBot\nDisallow: /admin', '/').blockedBots, []);
  });

  test('comments, inline comments and blank lines are ignored', () => {
    const r = parse('# header\nUser-agent: GPTBot # inline\n\nDisallow: / # everything');
    assert.deepEqual(r.blockedBots, ['gptbot']);
  });

  test('path matching is case-sensitive', () => {
    const txt = 'User-agent: GPTBot\nDisallow: /Private';
    assert.deepEqual(parse(txt, '/private').blockedBots, []);
    assert.deepEqual(parse(txt, '/Private').blockedBots, ['gptbot']);
  });

  // RFC 9309 §2.2.1: a crawler with no group of its own uses the `*` group. The
  // parser only consults a bot's own group, so here GPTBot is correctly allowed
  // but the 23 other AI bots, which fall back to `*`, are not listed as blocked,
  // and the popup reports "All crawlers blocked" although GPTBot is allowed.
  test('a bot with no group of its own falls back to the * group',
    { todo: '#41: parser does not fall back to * per bot' }, () => {
      const r = parse('User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /');
      assert.equal(r.blockedBots.includes('gptbot'), false, 'GPTBot has its own Allow group');
      assert.ok(r.blockedBots.includes('claudebot'), 'ClaudeBot has no group, so * applies');
    });
});

describe('pathMatches', () => {
  test('/ matches every path', () => {
    assert.equal(P.pathMatches('/anything/at/all', '/'), true);
  });

  test('a plain pattern is a prefix match', () => {
    assert.equal(P.pathMatches('/docs/intro', '/docs'), true);
    assert.equal(P.pathMatches('/doc', '/docs'), false);
  });

  test('* matches any run of characters', () => {
    assert.equal(P.pathMatches('/files/report.pdf', '/*.pdf'), true);
    assert.equal(P.pathMatches('/private-2024/secret', '/private*/secret'), true);
  });

  test('$ anchors the end of the path', () => {
    assert.equal(P.pathMatches('/files/report.pdf', '/*.pdf$'), true);
    assert.equal(P.pathMatches('/files/report.pdf.html', '/*.pdf$'), false);
  });

  test('regex metacharacters in a pattern are literal', () => {
    assert.equal(P.pathMatches('/a.b', '/a.b$'), true);
    assert.equal(P.pathMatches('/axb', '/a.b$'), false);
  });
});

describe('JS rendering signal', () => {
  // Everything but the JS inputs is a clean page, so only the heuristic moves.
  const allowAll = P.parseRobotsTxt('User-agent: *\nAllow: /', '/');
  const page = (initial, rendered, overrides = {}) => ({
    metaTags: {},
    semantic: { headings: { h1: 1, h2: 3, h3: 3 }, semanticTags: 4, imageAltRatio: 1,
                imageCount: 1, textLength: 4000, hasStructuredData: true, hasLangAttr: true },
    domSize: rendered,
    rawHtml: 'x'.repeat(initial),
    rawHtmlOk: true,
    rawHtmlIsHtml: true,
    ...overrides,
  });
  const signals = pageData => plain(P.calculateEnhancedSignals(pageData, allowAll));
  const js = pageData => signals(pageData).js.status;

  // #24: a fully static page was flagged "Significant client-side rendering".
  // These are the numbers measured on botlens.iamjarl.com at the time.
  test('a static page is not flagged (#24 regression)', () => {
    assert.equal(js(page(19109, 19190)), 'ok');
  });

  test('a small page with minor JS is not flagged, despite a ratio over 2', () => {
    assert.equal(js(page(3000, 8000)), 'ok');   // ratio 2.7, but only 5000 characters larger
  });

  test('a large server-rendered page is not flagged', () => {
    assert.equal(js(page(80000, 82000)), 'ok');
  });

  test('significant client-side rendering warns', () => {
    assert.equal(js(page(12000, 38000)), 'warn');
  });

  test('an SPA shell is an error', () => {
    assert.equal(js(page(1800, 55000)), 'error');
  });

  // "Could not verify" and "significant client-side rendering" are both 'warn',
  // so these check the message and the score, not only the status.
  test('a failed fetch cannot be verified, and costs no points', () => {
    const s = signals(page(0, 30000, { rawHtmlOk: false }));
    assert.equal(s.js.value, 'Could not verify SSR payload');
    assert.equal(s.score, 100);
  });

  test('a non-HTML response cannot be verified, and costs no points', () => {
    const s = signals(page(50000, 60000, { rawHtmlIsHtml: false }));
    assert.equal(s.js.value, 'Could not verify SSR payload');
    assert.equal(s.score, 100);
  });
});
