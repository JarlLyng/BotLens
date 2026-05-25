/**
 * BotLens Page Extractor
 * Injected on-demand via chrome.scripting.executeScript.
 * The trailing IIFE return value is read back by popup.js.
 */

(() => {
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

  return {
    metaTags: getMetaTags(),
    semantic: getSemanticData(),
    url: window.location.href,
    origin: window.location.origin,
    title: document.title,
    domSize: document.documentElement.innerHTML.length
  };
})();
