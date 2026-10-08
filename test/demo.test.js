// Tests for the web demo (#28): the address checks, the abuse limits, the
// analysis, and the handler. No test reaches the network.

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const dns = require('dns');
const { createClient } = require('@libsql/client');
const { analyze } = require('../lib/analyze');
const { safeFetch, checkUrl, isPublicAddress, safeLookup, DemoFetchError } = require('../lib/safe-fetch');
const { checkRateLimit, visitorKey, PER_VISITOR_PER_HOUR } = require('../lib/rate-limit');
const { createHandler } = require('../api/check');

describe('isPublicAddress', () => {
  test('private, loopback, link-local and reserved addresses are refused', () => {
    for (const a of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1',
      '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '198.18.0.1',
      '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1', '2001:db8::1',
      '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a9fe:a9fe', '64:ff9b::a00:1']) {
      assert.equal(isPublicAddress(a), false, a);
    }
  });

  test('public addresses are allowed', () => {
    for (const a of ['93.184.215.14', '1.1.1.1', '172.32.0.1', '2606:4700::1111', '::ffff:8.8.8.8']) {
      assert.equal(isPublicAddress(a), true, a);
    }
  });

  test('anything that is not an IP address is refused', () => {
    assert.equal(isPublicAddress('example.com'), false);
  });
});

describe('checkUrl', () => {
  const refused = url => assert.throws(() => checkUrl(url), DemoFetchError, url);

  test('only public http(s) addresses on standard ports', () => {
    for (const url of ['ftp://example.com/', 'file:///etc/passwd', 'javascript:alert(1)',
      'https://user:pw@example.com/', 'https://example.com:8080/', 'http://localhost/',
      'http://127.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data/',
      'http://metadata.google.internal/', 'http://intranet/', 'http://printer.local/', 'not a url']) {
      refused(url);
    }
  });

  test('ordinary sites pass', () => {
    assert.equal(checkUrl('https://example.com/page?q=1').hostname, 'example.com');
    assert.equal(checkUrl('http://example.com:80/').hostname, 'example.com');
  });
});

describe('safeLookup', () => {
  const original = dns.lookup;
  const answer = addresses => { dns.lookup = (host, opts, cb) => cb(null, addresses); };
  const run = options => new Promise(resolve => safeLookup('site.test', options,
    (err, address, family) => resolve({ err, address, family })));
  beforeEach(() => { dns.lookup = original; });

  test('a public answer connects', async () => {
    answer([{ address: '93.184.215.14', family: 4 }]);
    const r = await run({});
    dns.lookup = original;
    assert.equal(r.err, null);
    assert.equal(r.address, '93.184.215.14');
  });

  test('a private answer is refused, even mixed with a public one', async () => {
    answer([{ address: '93.184.215.14', family: 4 }, { address: '10.0.0.5', family: 4 }]);
    const r = await run({ all: true });
    dns.lookup = original;
    assert.ok(r.err instanceof DemoFetchError);
  });
});

describe('safeFetch', () => {
  const response = (status, body = '', headers = {}) => new Response(body, { status, headers });

  test('a redirect to a private address is refused', async () => {
    const fetchImpl = async () => response(302, '', { location: 'http://127.0.0.1/admin' });
    await assert.rejects(safeFetch('https://example.com/', { maxBytes: 1000, fetchImpl }),
      e => e instanceof DemoFetchError && e.code === 'blocked');
  });

  test('redirects are followed, re-checked, and limited', async () => {
    const seen = [];
    const fetchImpl = async url => {
      seen.push(url);
      return url.endsWith('/final') ? response(200, '<html>ok</html>', { 'content-type': 'text/html' })
        : response(301, '', { location: '/final' });
    };
    const r = await safeFetch('https://example.com/start', { maxBytes: 1000, fetchImpl });
    assert.deepEqual(seen, ['https://example.com/start', 'https://example.com/final']);
    assert.equal(r.url, 'https://example.com/final');
    const loop = async () => response(302, '', { location: '/again' });
    await assert.rejects(safeFetch('https://example.com/', { maxBytes: 1000, fetchImpl: loop }),
      e => e.code === 'redirects');
  });

  test('the body is cut at the byte limit', async () => {
    const fetchImpl = async () => response(200, 'x'.repeat(5000), { 'content-type': 'text/html' });
    const r = await safeFetch('https://example.com/', { maxBytes: 100, fetchImpl });
    assert.equal(r.text.length, 100);
    assert.equal(r.truncated, true);
  });
});

describe('rate limit', () => {
  test('a visitor is stopped after the hourly limit', async () => {
    const db = createClient({ url: ':memory:' });
    const now = Date.UTC(2026, 9, 8, 12);
    for (let i = 0; i < PER_VISITOR_PER_HOUR; i++) {
      assert.equal((await checkRateLimit(db, { ip: '1.2.3.4', secret: 's', now })).allowed, true);
    }
    assert.deepEqual(await checkRateLimit(db, { ip: '1.2.3.4', secret: 's', now }), { allowed: false, reason: 'visitor' });
    assert.equal((await checkRateLimit(db, { ip: '5.6.7.8', secret: 's', now })).allowed, true, 'others are unaffected');
    assert.equal((await checkRateLimit(db, { ip: '1.2.3.4', secret: 's', now: now + 3600000 })).allowed, true, 'next hour');
  });

  test('no IP address is stored, and the key changes every day', async () => {
    const db = createClient({ url: ':memory:' });
    const now = Date.UTC(2026, 9, 8, 12);
    await checkRateLimit(db, { ip: '203.0.113.9', secret: 's', now });
    const rows = (await db.execute('SELECT bucket FROM demo_rate')).rows.map(r => r.bucket).join(' ');
    assert.equal(rows.includes('203.0.113.9'), false);
    assert.notEqual(visitorKey('203.0.113.9', 's', now), visitorKey('203.0.113.9', 's', now + 86400000));
  });

  test('rows older than two days are deleted', async () => {
    const db = createClient({ url: ':memory:' });
    const now = Date.UTC(2026, 9, 8, 12);
    await checkRateLimit(db, { ip: 'a', secret: 's', now });
    await checkRateLimit(db, { ip: 'b', secret: 's', now: now + 3 * 86400000 });
    const n = (await db.execute('SELECT count(*) AS n FROM demo_rate')).rows[0].n;
    assert.equal(Number(n), 2, 'only the later visitor and day counters remain');
  });
});

const PAGE = `<!doctype html><html lang="en"><head><title>T</title>
  <meta property="og:title" content="t"><meta property="og:description" content="d"><meta property="og:image" content="i">
  <script type="application/ld+json">{"@type":"WebSite"}</script></head>
  <body><header></header><main><h1>Hello</h1><p>Text</p></main></body></html>`;

describe('analyze', () => {
  test('scores with the extension code and marks the result partial', async () => {
    const r = await analyze({ html: PAGE, url: 'https://example.com/', robotsTxt: 'User-agent: *\nAllow: /' });
    assert.equal(r.partial, true);
    assert.equal(r.score, 100);
    assert.equal(r.robots.value, 'Bots and AI crawlers allowed');
  });

  test('robots.txt rules apply, including the * fallback', async () => {
    const r = await analyze({ html: PAGE, url: 'https://example.com/',
      robotsTxt: 'User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /' });
    assert.match(r.robots.value, /AI bots blocked, 1 allowed \(gptbot\)/);
    assert.ok(r.score < 100);
  });

  test('page problems are reported, and JS rendering costs nothing', async () => {
    const r = await analyze({ html: '<html><body><p>no structure</p></body></html>', url: 'https://example.com/', robotsTxt: null });
    assert.deepEqual(r.issues.semantic.slice(0, 2), ['Missing H1 heading', 'Few HTML5 semantic tags']);
    assert.equal(r.score, 77); // -10 H1, -10 landmarks, -3 lang; nothing for JS
  });
});

describe('handler', () => {
  const env = { DEMO_RATE_SECRET: 's' };
  const call = async (handler, { method = 'POST', body, headers = {} } = {}) => {
    const res = { statusCode: 0, headers: {}, body: '',
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b = '') { this.body = b; } };
    await handler({ method, body, headers: { origin: 'https://botlens.iamjarl.com', 'x-real-ip': '1.1.1.1', ...headers } }, res);
    return { ...res, json: res.body ? JSON.parse(res.body) : null };
  };
  const pages = map => async url => {
    const hit = map[url];
    if (!hit) return { url, status: 404, contentType: 'text/plain', text: '' };
    return { url: hit.url || url, status: 200, contentType: hit.type || 'text/html', text: hit.text };
  };

  test('checks a site, fetching robots.txt from where the page ended up', async () => {
    const fetchPage = pages({
      'https://example.com': { url: 'https://www.example.com/', text: PAGE },
      'https://www.example.com/robots.txt': { type: 'text/plain', text: 'User-agent: GPTBot\nDisallow: /' },
    });
    const handler = createHandler({ getDb: () => createClient({ url: ':memory:' }), fetchPage, env });
    const r = await call(handler, { body: { url: 'example.com' } });
    assert.equal(r.statusCode, 200);
    assert.equal(r.json.url, 'https://www.example.com/');
    assert.equal(r.json.robots.value, '1 AI bot blocked (gptbot)');
    assert.equal(r.headers['access-control-allow-origin'], 'https://botlens.iamjarl.com');
    assert.equal(r.headers['cache-control'], 'no-store');
  });

  test('refuses bad input before counting it', async () => {
    const handler = createHandler({ getDb: () => createClient({ url: ':memory:' }), fetchPage: pages({}), env });
    assert.equal((await call(handler, { body: { url: 'http://127.0.0.1/' } })).statusCode, 400);
    assert.equal((await call(handler, { body: {} })).statusCode, 400);
    assert.equal((await call(handler, { method: 'GET' })).statusCode, 405);
    assert.equal((await call(handler, { method: 'OPTIONS' })).statusCode, 204);
  });

  test('does not run without its database and secret', async () => {
    const handler = createHandler({ getDb: () => null, fetchPage: pages({}), env });
    assert.equal((await call(handler, { body: { url: 'example.com' } })).statusCode, 503);
    const noSecret = createHandler({ getDb: () => createClient({ url: ':memory:' }), fetchPage: pages({}), env: {} });
    assert.equal((await call(noSecret, { body: { url: 'example.com' } })).statusCode, 503);
  });

  test('answers 429 when a visitor goes over the limit', async () => {
    const db = createClient({ url: ':memory:' });
    const handler = createHandler({ getDb: () => db, fetchPage: pages({ 'https://example.com': { text: PAGE } }), env });
    for (let i = 0; i < PER_VISITOR_PER_HOUR; i++) await call(handler, { body: { url: 'example.com' } });
    assert.equal((await call(handler, { body: { url: 'example.com' } })).statusCode, 429);
  });

  test('a non-HTML answer is reported, not scored', async () => {
    const handler = createHandler({ getDb: () => createClient({ url: ':memory:' }),
      fetchPage: pages({ 'https://example.com/data.json': { type: 'application/json', text: '{}' } }), env });
    const r = await call(handler, { body: { url: 'https://example.com/data.json' } });
    assert.equal(r.statusCode, 422);
  });

  test('another origin gets no CORS header', async () => {
    const handler = createHandler({ getDb: () => createClient({ url: ':memory:' }), fetchPage: pages({ 'https://example.com': { text: PAGE } }), env });
    const r = await call(handler, { body: { url: 'example.com' }, headers: { origin: 'https://evil.test' } });
    assert.equal(r.headers['access-control-allow-origin'], undefined);
  });
});
