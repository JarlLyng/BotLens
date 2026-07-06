/**
 * BotLens Page Extractor
 * Injected on-demand via chrome.scripting.executeScript.
 * Runs in the page's own origin, so robots.txt and the raw HTML are
 * fetched same-origin — no host permissions required. The trailing
 * async IIFE resolves to the data object, which executeScript awaits
 * and hands back to popup.js.
 */

(async () => {
  const RELEVANT_META_NAMES = [
    'robots', 'googlebot', 'bingbot', 'gptbot', 'claudebot',
    'noai', 'noimageai', 'ai-content-declaration'
  ];

  function getMetaTags() {
    const metaTags = {};
    const metas = document.getElementsByTagName('meta');

    for (let i = 0; i < metas.length; i++) {
      const name = metas[i].getAttribute('name') || metas[i].getAttribute('property');
      const content = metas[i].getAttribute('content');
      if (!name || !content) continue;

      const lowerName = name.toLowerCase();
      if (RELEVANT_META_NAMES.includes(lowerName) || lowerName.endsWith('bot')) {
        metaTags[lowerName] = content.toLowerCase();
      }
    }
    return metaTags;
  }

  function getSemanticData() {
    const headings = {
      h1: document.querySelectorAll('h1').length,
      h2: document.querySelectorAll('h2').length,
      h3: document.querySelectorAll('h3').length
    };

    const semanticTags = ['article', 'main', 'section', 'nav', 'header', 'footer']
      .filter(tag => document.querySelector(tag)).length;

    const contentImages = Array.from(document.querySelectorAll('img')).filter(img => {
      if (img.getAttribute('alt') === '') return false;
      if (img.getAttribute('aria-hidden') === 'true') return false;
      if (img.getAttribute('role') === 'presentation') return false;
      return true;
    });
    const imagesWithAlt = contentImages.filter(img => img.alt && img.alt.trim() !== '').length;

    const bodyText = document.body ? document.body.innerText : '';

    return {
      headings,
      semanticTags,
      imageAltRatio: contentImages.length > 0 ? imagesWithAlt / contentImages.length : 1,
      imageCount: contentImages.length,
      textLength: bodyText.length,
      hasStructuredData: !!document.querySelector('script[type="application/ld+json"]'),
      hasLangAttr: !!document.documentElement.lang
    };
  }

  // Fetch robots.txt from the page's own origin. Same-origin, so no host
  // permission is needed and CORS is not a factor.
  async function fetchRobotsTxt(origin) {
    try {
      const res = await fetch(`${origin}/robots.txt`, { credentials: 'omit' });
      return res.ok ? await res.text() : null;
    } catch (e) {
      return null;
    }
  }

  // Re-fetch the current page's HTML from the same origin the page was
  // loaded from. This is the same document the browser rendered, so the
  // comparison against the rendered DOM is apples-to-apples.
  async function fetchRawHtml(url) {
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) return { ok: false, html: '', contentType: '' };
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const html = await res.text();
      return { ok: true, html, contentType };
    } catch (e) {
      return { ok: false, html: '', contentType: '' };
    }
  }

  const origin = window.location.origin;
  const [robotsTxt, rawHtml] = await Promise.all([
    fetchRobotsTxt(origin),
    fetchRawHtml(window.location.href)
  ]);

  return {
    metaTags: getMetaTags(),
    semantic: getSemanticData(),
    url: window.location.href,
    origin,
    title: document.title,
    domSize: document.documentElement.innerHTML.length,
    robotsTxt,
    rawHtml: rawHtml.html,
    rawHtmlOk: rawHtml.ok,
    rawHtmlIsHtml: rawHtml.contentType.includes('html')
  };
})();
