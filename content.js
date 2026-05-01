/**
 * BotLens Content Script
 * Extracts meta tags and other on-page signals for AI readability analysis.
 */

(function() {
  function getMetaTags() {
    const metaTags = {};
    const metas = document.getElementsByTagName('meta');
    
    for (let i = 0; i < metas.length; i++) {
      const name = metas[i].getAttribute('name') || metas[i].getAttribute('property');
      const content = metas[i].getAttribute('content');
      
      if (name && content) {
        // We are specifically interested in robots and related tags
        if (name.toLowerCase().includes('robots') || name.toLowerCase().includes('googlebot') || name.toLowerCase().includes('bingbot')) {
          metaTags[name.toLowerCase()] = content.toLowerCase();
        }
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
    
    const semanticTags = [
      'article', 'main', 'section', 'nav', 'header', 'footer'
    ].filter(tag => document.querySelector(tag)).length;

    const images = document.querySelectorAll('img');
    const imagesWithAlt = Array.from(images).filter(img => img.alt && img.alt.trim() !== '').length;

    return {
      headings,
      semanticTags,
      imageAltRatio: images.length > 0 ? imagesWithAlt / images.length : 1,
      textLength: document.body.innerText.length
    };
  }

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyzePage") {
      const data = {
        metaTags: getMetaTags(),
        semantic: getSemanticData(),
        url: window.location.href,
        origin: window.location.origin,
        title: document.title,
        domSize: document.documentElement.innerHTML.length
      };
      sendResponse(data);
    }
    return true; // Keep message channel open for async response
  });
})();
