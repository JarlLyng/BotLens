// Tests for the robots.txt parser and the JS-rendering heuristic in popup.js.
// Run with `npm test`. They load the shipped popup.js; see test/load-popup.js.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { loadPopup, plain } = require('./load-popup');

const P = loadPopup();
const parse = (txt, path = '/') => plain(P.parseRobotsTxt(txt, path));
// Every AI bot popup.js knows, read from the parser so the tests need no copy of the list.
const ALL_BOTS = parse('User-agent: *\nDisallow: /').blockedBots;

describe('parseRobotsTxt', () => {
  test('User-agent: * with Disallow: / blocks all 20+ known AI bots', () => {
    assert.ok(ALL_BOTS.length >= 20, `only ${ALL_BOTS.length} bots`);
    assert.ok(ALL_BOTS.includes('gptbot') && ALL_BOTS.includes('claudebot'));
  });

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

  // RFC 9309 §2.2.1: a crawler with no group of its own uses the `*` group (#41).
  test('a bot with no group of its own falls back to the * group', () => {
    const r = parse('User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /');
    assert.equal(r.blockedBots.includes('gptbot'), false, 'GPTBot has its own Allow group');
    assert.ok(r.blockedBots.includes('claudebot'), 'ClaudeBot has no group, so * applies');
    assert.equal(r.blockedBots.length, ALL_BOTS.length - 1);
    assert.deepEqual(r.allowedBots, ['gptbot']);
  });

  test('* blocking is not "all blocked" when a bot is exempt', () => {
    assert.equal(parse('User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /').blockedAll, false);
  });

  test('an empty Disallow in its own group exempts a bot from *', () => {
    const r = parse('User-agent: *\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow:');
    assert.deepEqual(r.allowedBots, ['claudebot']);
  });

  test('a bot uses only its own group, even when * is stricter elsewhere', () => {
    const txt = 'User-agent: *\nDisallow: /private\n\nUser-agent: GPTBot\nDisallow: /tmp';
    assert.equal(parse(txt, '/private').blockedBots.includes('gptbot'), false);
    assert.ok(parse(txt, '/private').blockedBots.includes('claudebot'));
  });

  test('the * fallback respects the path', () => {
    const txt = 'User-agent: *\nDisallow: /admin';
    assert.deepEqual(parse(txt, '/').blockedBots, []);
    assert.equal(parse(txt, '/admin/users').blockedBots.length, ALL_BOTS.length);
    assert.equal(parse(txt, '/admin/users').blockedAll, true);
  });

  test('groups that name the same bot are combined', () => {
    const txt = 'User-agent: GPTBot\nDisallow: /a\n\nUser-agent: GPTBot\nDisallow: /b';
    assert.deepEqual(parse(txt, '/a').blockedBots, ['gptbot']);
    assert.deepEqual(parse(txt, '/b').blockedBots, ['gptbot']);
  });

  test('* groups are combined too', () => {
    const txt = 'User-agent: *\nDisallow: /a\n\nUser-agent: *\nDisallow: /b';
    assert.equal(parse(txt, '/b').blockedAll, true);
  });
});

describe('robots.txt signal', () => {
  const clean = { metaTags: {}, semantic: { headings: { h1: 1 }, semanticTags: 4, imageAltRatio: 1,
    imageCount: 1, textLength: 4000, hasStructuredData: true, hasLangAttr: true },
  domSize: 20000, rawHtml: 'x'.repeat(20000), rawHtmlOk: true, rawHtmlIsHtml: true };
  const robots = txt => plain(P.calculateEnhancedSignals(clean, P.parseRobotsTxt(txt, '/'))).robots;

  test('Disallow all reports every crawler blocked', () => {
    assert.equal(robots('User-agent: *\nDisallow: /').value, 'All crawlers blocked (User-agent: *)');
  });

  // #41: this said "All crawlers blocked" although the owner allowed GPTBot.
  test('Disallow all with one exception names the exception', () => {
    const n = ALL_BOTS.length - 1;
    assert.equal(robots('User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /').value,
      `${n} AI bots blocked, 1 allowed (gptbot)`);
  });

  test('a single blocked bot is listed by name', () => {
    assert.equal(robots('User-agent: GPTBot\nDisallow: /').value, '1 AI bot blocked (gptbot)');
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
