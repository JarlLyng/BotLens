/**
 * BotLens Page Extractor
 * Injected on-demand via chrome.scripting.executeScript.
 * Runs in the page's own origin, so robots.txt, the raw HTML, the sitemap
 * and llms.txt are fetched same-origin — no host permissions required. The trailing
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

    const landmarks = ['article', 'main', 'section', 'nav', 'header', 'footer']
      .filter(tag => document.querySelector(tag));

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
      semanticTags: landmarks.length,
      landmarks,
      imageAltRatio: contentImages.length > 0 ? imagesWithAlt / contentImages.length : 1,
      imageCount: contentImages.length,
      textLength: bodyText.length,
      hasStructuredData: !!document.querySelector('script[type="application/ld+json"]'),
      hasLangAttr: !!document.documentElement.lang,
      lang: document.documentElement.lang || '',
      ...getJsonLd(),
      ...getLinkMetadata()
    };
  }

  // The @type of each top-level JSON-LD node, including nodes in an @graph,
  // and how many blocks do not parse (a parser cannot read those either).
  function getJsonLd() {
    const types = new Set();
    let invalid = 0;
    const visit = node => {
      if (Array.isArray(node)) { node.forEach(visit); return; }
      if (!node || typeof node !== 'object') return;
      const type = node['@type'];
      for (const t of Array.isArray(type) ? type : [type]) {
        if (typeof t === 'string' && t.trim()) types.add(t.trim());
      }
      if (node['@graph']) visit(node['@graph']);
    };
    // schema.org digitalSourceType (#21) can sit on any node, so search deeply.
    const sourceTypes = new Set();
    const deep = node => {
      if (Array.isArray(node)) { node.forEach(deep); return; }
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        if (key === 'digitalSourceType') {
          for (const v of Array.isArray(value) ? value : [value]) {
            const term = typeof v === 'string' ? v : v && v['@id'];
            if (typeof term === 'string' && term.trim()) sourceTypes.add(term.trim().split(/[/:#]/).pop());
          }
        } else {
          deep(value);
        }
      }
    };
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(script.textContent);
        visit(data);
        deep(data);
      } catch (e) {
        invalid++;
      }
    }
    return { jsonLdTypes: [...types], jsonLdInvalid: invalid, jsonLdSourceTypes: [...sourceTypes] };
  }

  // Open Graph, Twitter Card and canonical (#18). A tag counts only with a
  // non-empty value. Open Graph uses `property`, but `name` is common in the wild.
  function getLinkMetadata() {
    const hasMeta = key => Array.from(document.querySelectorAll(
      `meta[property="${key}"], meta[name="${key}"]`
    )).some(m => (m.getAttribute('content') || '').trim() !== '');
    const canonical = document.querySelector('link[rel~="canonical" i][href]');
    return {
      openGraph: {
        title: hasMeta('og:title'),
        description: hasMeta('og:description'),
        image: hasMeta('og:image')
      },
      hasTwitterCard: hasMeta('twitter:card'),
      hasCanonical: !!canonical && canonical.getAttribute('href').trim() !== '',
      canonicalUrl: canonical ? canonical.href : ''
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

  // A 200 that is really an HTML page (an SPA or a soft 404 answering every
  // path) does not count as the file.
  const looksLikeHtml = (text, contentType) =>
    contentType.includes('html') || /^\s*<(!doctype|html)/i.test(text);

  // llms.txt and llms-full.txt (#19). Reported, not scored.
  async function fetchTextFile(url) {
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) return { found: false };
      const text = await res.text();
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!text.trim() || looksLikeHtml(text, contentType)) return { found: false };
      return { found: true, bytes: new Blob([text]).size };
    } catch (e) {
      return { found: false };
    }
  }

  // The sitemap (#1): the first Sitemap: line in robots.txt, else /sitemap.xml.
  // Only a same-origin sitemap can be fetched without host permissions.
  async function checkSitemap(origin, robotsTxt) {
    const declared = (robotsTxt || '').split('\n')
      .map(line => line.replace(/#.*/, '').match(/^\s*sitemap\s*:\s*(\S+)/i))
      .filter(Boolean)
      .map(m => m[1]);
    let url;
    try {
      url = new URL(declared[0] || '/sitemap.xml', origin);
    } catch (e) {
      return { declared: declared.length, url: declared[0], status: 'bad-url' };
    }
    const result = { declared: declared.length, url: url.href };
    if (url.origin !== origin) return { ...result, status: 'other-site' };
    if (/\.gz$/i.test(url.pathname)) return { ...result, status: 'compressed' };
    try {
      const res = await fetch(url.href, { credentials: 'omit' });
      if (!res.ok) return { ...result, status: 'missing', httpStatus: res.status };
      const text = await res.text();
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (looksLikeHtml(text, contentType)) return { ...result, status: 'html' };
      const xml = new DOMParser().parseFromString(text, 'application/xml');
      const root = xml.documentElement;
      if (xml.getElementsByTagName('parsererror').length || !root) return { ...result, status: 'invalid' };
      const kind = root.localName;
      if (kind !== 'urlset' && kind !== 'sitemapindex') return { ...result, status: 'invalid' };
      const entries = Array.from(root.children)
        .filter(el => el.localName === (kind === 'urlset' ? 'url' : 'sitemap')).length;
      return { ...result, status: 'valid', kind, entries };
    } catch (e) {
      return { ...result, status: 'error' };
    }
  }

  // Content provenance (#21). <meta name="generator"> names the software that
  // made the page. IPTC DigitalSourceType in an image's XMP (or C2PA) metadata
  // says how the image was made; Google's guidance names
  // trainedAlgorithmicMedia for AI-generated images. Reported, not scored.
  const IMAGE_LIMIT = 10;
  const IMAGE_BYTES = 256 * 1024; // XMP and C2PA sit near the start of the file

  async function readImageSourceTypes(url) {
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok || !res.body) return null;
      const reader = res.body.getReader();
      const chunks = [];
      let size = 0;
      while (size < IMAGE_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
      }
      reader.cancel().catch(() => {});
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const text = new TextDecoder('latin1').decode(bytes.subarray(0, IMAGE_BYTES));
      const terms = new Set();
      for (const m of text.matchAll(/cv\.iptc\.org\/newscodes\/digitalsourcetype\/([A-Za-z]+)/g)) terms.add(m[1]);
      return [...terms];
    } catch (e) {
      return null;
    }
  }

  async function getProvenance(origin) {
    const generators = Array.from(document.querySelectorAll('meta[name="generator" i]'))
      .map(m => (m.getAttribute('content') || '').trim()).filter(Boolean);
    const urls = [];
    let otherSite = 0;
    for (const img of document.images) {
      let url;
      try { url = new URL(img.currentSrc || img.src, location.href); } catch (e) { continue; }
      if (!/^https?:$/.test(url.protocol) || urls.includes(url.href)) continue;
      if (url.origin !== origin) { otherSite++; continue; }
      urls.push(url.href);
    }
    const checkedUrls = urls.slice(0, IMAGE_LIMIT);
    const results = await Promise.all(checkedUrls.map(readImageSourceTypes));
    const imageSourceTypes = {};
    let checked = 0;
    for (const terms of results) {
      if (!terms) continue;
      checked++;
      for (const t of terms) imageSourceTypes[t] = (imageSourceTypes[t] || 0) + 1;
    }
    return {
      generators,
      images: { checked, unreadable: checkedUrls.length - checked, notChecked: urls.length - checkedUrls.length, otherSite, sourceTypes: imageSourceTypes }
    };
  }

  const origin = window.location.origin;
  const robotsPromise = fetchRobotsTxt(origin);
  const [robotsTxt, rawHtml, llmsTxt, llmsFullTxt, sitemap, provenance] = await Promise.all([
    robotsPromise,
    fetchRawHtml(window.location.href),
    fetchTextFile(`${origin}/llms.txt`),
    fetchTextFile(`${origin}/llms-full.txt`),
    robotsPromise.then(txt => checkSitemap(origin, txt)),
    getProvenance(origin)
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
    rawHtmlIsHtml: rawHtml.contentType.includes('html'),
    siteFiles: { sitemap, llmsTxt, llmsFullTxt },
    provenance
  };
})();
