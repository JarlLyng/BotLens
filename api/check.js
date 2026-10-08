// POST /api/check: the web demo on botlens.iamjarl.com (#28).
//
// Body: { "url": "example.com" }. Fetches that page and its site's robots.txt,
// once each, and scores them with the extension's own code (lib/analyze.js).
// The score is partial: a server does not run the page's JavaScript.
//
// Nothing about a request is logged or stored. Turso holds only the abuse
// counters described in lib/rate-limit.js. The URL travels in the body, not the
// query string, so it does not appear in the platform's request logs either.
//
// Environment (set in the Vercel project, never in this repo):
//   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN   the Turso database for the counters
//   DEMO_RATE_SECRET                       any long random string; salts visitor keys

const { analyze } = require('../lib/analyze');
const { safeFetch, checkUrl, DemoFetchError } = require('../lib/safe-fetch');
const { checkRateLimit } = require('../lib/rate-limit');

const ALLOWED_ORIGINS = new Set(['https://botlens.iamjarl.com']);
const PAGE_BYTES = 2 * 1024 * 1024;
const ROBOTS_BYTES = 512 * 1024;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

function readUrl(body) {
  let data = body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { data = {}; }
  }
  const raw = data && typeof data.url === 'string' ? data.url.trim() : '';
  if (!raw || raw.length > 2048) return null;
  return /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
}

function clientIp(req) {
  const real = req.headers['x-real-ip'];
  if (real) return String(real);
  const forwarded = req.headers['x-forwarded-for'];
  return forwarded ? String(forwarded).split(',')[0].trim() : '';
}

function looksLikeHtml(page) {
  return page.contentType.includes('html') || /^\s*<(!doctype|html)/i.test(page.text);
}

function createHandler({ getDb, fetchPage = safeFetch, env = process.env } = {}) {
  return async function handler(req, res) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('access-control-allow-methods', 'POST');
      res.setHeader('access-control-allow-headers', 'content-type');
      res.setHeader('access-control-max-age', '86400');
      res.statusCode = 204;
      return res.end();
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });

    const input = readUrl(req.body);
    if (!input) return send(res, 400, { error: 'Enter a web address to check.' });
    try {
      checkUrl(input);
    } catch (e) {
      return send(res, 400, { error: e.message });
    }

    const db = getDb && getDb(env);
    if (!db || !env.DEMO_RATE_SECRET) return send(res, 503, { error: 'The demo is not available right now.' });
    try {
      const limit = await checkRateLimit(db, { ip: clientIp(req), secret: env.DEMO_RATE_SECRET });
      if (!limit.allowed) {
        return send(res, 429, { error: limit.reason === 'visitor'
          ? 'You have checked a lot of sites this hour. Try again later, or install the extension, which has no limit.'
          : 'The demo has reached its limit for today. The extension has no limit.' });
      }
    } catch (e) {
      console.error('rate limit unavailable:', e.code || e.name);
      return send(res, 503, { error: 'The demo is not available right now.' });
    }

    try {
      const page = await fetchPage(input, { maxBytes: PAGE_BYTES });
      if (page.status !== 200) {
        return send(res, 422, { error: `That address answered with status ${page.status}, not a page.` });
      }
      if (!looksLikeHtml(page)) return send(res, 422, { error: 'That address did not return an HTML page.' });
      // robots.txt belongs to the origin the page was finally served from.
      let robotsTxt = null;
      try {
        const robots = await fetchPage(new URL('/robots.txt', page.url).href, { maxBytes: ROBOTS_BYTES });
        if (robots.status === 200 && !looksLikeHtml(robots)) robotsTxt = robots.text;
      } catch (e) {
        // A missing or unreachable robots.txt means no rules, as in the extension.
      }
      return send(res, 200, await analyze({ html: page.text, url: page.url, robotsTxt }));
    } catch (e) {
      if (e instanceof DemoFetchError) return send(res, 422, { error: e.message });
      console.error('check failed:', e.name);
      return send(res, 500, { error: 'Something went wrong while checking that site.' });
    }
  };
}

function tursoClient(env) {
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) return null;
  const { createClient } = require('@libsql/client');
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

let client;
module.exports = createHandler({ getDb: env => (client = client || tursoClient(env)) });
module.exports.createHandler = createHandler;
