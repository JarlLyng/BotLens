// Scores a page for the web demo (#28) with the extension's own code.
//
// content.js, the extractor the extension injects into a tab, runs here in a vm
// against the fetched HTML, parsed by linkedom. popup.js then parses robots.txt
// and scores the result. So the demo and the extension cannot drift apart.
//
// A server does not run the page's JavaScript, so the JS-rendering check is not
// made: the extractor's own fetches are stubbed to fail, which the scoring treats
// as "could not verify" and does not penalize. The score is partial, and the
// response says so.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
// linkedom is loaded with import(): its CommonJS build requires an ES module
// (css-select), and Vercel's module loader does not support require() of ESM.
const linkedom = import('linkedom');
const { loadPopup, plain } = require('./load-popup');

const CONTENT_JS = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const popup = loadPopup();

async function extract(html, pageUrl, robotsTxt) {
  const { parseHTML } = await linkedom;
  const { document, window } = parseHTML(html);
  // linkedom has no document.images; content.js reads it for provenance.
  Object.defineProperty(document, 'images', { get: () => document.querySelectorAll('img') });
  const location = new URL(pageUrl);
  // The extractor fetches robots.txt itself. Hand it the copy fetched safely
  // upstream, and fail every other request: no page JS, no extra outbound calls.
  const fetch = async url => (url === `${location.origin}/robots.txt` && robotsTxt !== null
    ? new Response(robotsTxt, { headers: { 'content-type': 'text/plain' } })
    : new Response('', { status: 404 }));
  const context = vm.createContext({
    document, window: { location }, location, fetch,
    URL, Blob, TextDecoder, DOMParser: window.DOMParser, Response, console,
  });
  return vm.runInContext(CONTENT_JS, context, { filename: 'content.js', timeout: 2000 });
}

async function analyze({ html, url, robotsTxt }) {
  const pageData = await extract(html, url, robotsTxt);
  const rules = popup.parseRobotsTxt(robotsTxt, new URL(url).pathname);
  const signals = plain(popup.calculateEnhancedSignals(pageData, rules));
  return {
    url,
    partial: true,
    score: signals.score,
    robots: signals.robots,
    semantic: signals.semantic,
    issues: { robots: signals.issues.robots, semantic: signals.issues.semantic },
  };
}

module.exports = { analyze };
