/**
 * BotLens Popup Logic (v2)
 * Enhanced analysis with semantic scoring and JS-heavy detection.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const refreshBtn = document.getElementById('refresh');
  refreshBtn.addEventListener('click', analyze);
  analyze();
});

async function analyze() {
  resetUI();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || tab.url.startsWith('chrome://')) {
      showError("Cannot analyze system pages.");
      return;
    }

    const url = new URL(tab.url);

    // 1. Inject extractor on demand. It runs in the page's own origin and
    //    fetches robots.txt + raw HTML same-origin, so no host permission is
    //    needed. executeScript awaits the async IIFE and returns its result.
    let pageData;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      pageData = results && results[0] && results[0].result;
      if (!pageData) throw new Error("Empty result from page extractor.");
    } catch (e) {
      console.error("Injection error:", e);
      showError("Cannot analyze this page (restricted by browser).");
      return;
    }

    // 2. Parse robots rules (robotsTxt was fetched by the content script).
    const robotsRules = parseRobotsTxt(pageData.robotsTxt, url.pathname);

    // 3. Analyze Signals & Calculate Score
    const signals = calculateEnhancedSignals(pageData, robotsRules);

    // 4. Update UI
    updateEnhancedUI(signals);

  } catch (error) {
    console.error("Analysis failed:", error);
    showError(`Analysis failed: ${error.message || "Unknown error"}`);
  }
}

function resetUI() {
  document.getElementById('score-text').textContent = '--';
  document.getElementById('score-path').setAttribute('stroke-dasharray', '0, 100');
  
  updateSignal('robots', 'fetching', 'Analyzing tags...');
  updateSignal('semantic', 'fetching', 'Checking structure...');
  updateSignal('js', 'fetching', 'Checking rendering...');
}

// Known AI / LLM crawler user-agents (lowercase). Keep in sync with calculateEnhancedSignals.
const AI_BOTS = [
  'gptbot', 'oai-searchbot', 'chatgpt-user',
  'claudebot', 'claude-web', 'anthropic-ai',
  'google-extended', 'googleother',
  'ccbot', 'perplexitybot', 'perplexity-user',
  'applebot-extended', 'bytespider',
  'meta-externalagent', 'meta-externalfetcher', 'facebookbot',
  'amazonbot', 'cohere-ai', 'diffbot', 'omgilibot', 'imagesiftbot',
  'youbot', 'mistralai-user', 'duckassistbot'
];

function parseRobotsTxt(content, currentPath) {
  if (!content) return { exists: false, blockedBots: [], blockedAll: false };

  const lines = content.split('\n');
  // Each group: { agents: [], rules: [{ type: 'allow'|'disallow', path }] }
  const groups = [];
  let current = null;
  let lastWasAgent = false;

  for (let raw of lines) {
    const hashIdx = raw.indexOf('#');
    const line = (hashIdx >= 0 ? raw.slice(0, hashIdx) : raw).trim();
    if (!line) continue;

    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim(); // preserve path case

    if (field === 'user-agent') {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === 'disallow' || field === 'allow') && current) {
      current.rules.push({ type: field, path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }

  // For a given agent, determine whether currentPath is blocked.
  // Robots spec: longest matching path wins; Allow overrides Disallow at equal length.
  function isBlockedFor(agent) {
    const matchingGroup = groups.find(g => g.agents.includes(agent));
    if (!matchingGroup) return false;

    let best = null; // { type, length }
    for (const rule of matchingGroup.rules) {
      if (!rule.path) continue; // Empty disallow = allow all
      if (!pathMatches(currentPath, rule.path)) continue;
      const len = rule.path.length;
      if (!best || len > best.length || (len === best.length && rule.type === 'allow')) {
        best = { type: rule.type, length: len };
      }
    }
    return best ? best.type === 'disallow' : false;
  }

  const blockedBots = AI_BOTS.filter(isBlockedFor);
  const blockedAll = isBlockedFor('*');

  return { exists: true, blockedBots, blockedAll, groups };
}

function pathMatches(currentPath, pattern) {
  // Supports * wildcard and $ end-of-string anchor per robots.txt extensions.
  if (pattern === '/') return true;
  if (!pattern.includes('*') && !pattern.endsWith('$')) {
    return currentPath.startsWith(pattern);
  }
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  const re = new RegExp('^' + escaped + (anchored ? '$' : ''));
  return re.test(currentPath);
}

function calculateEnhancedSignals(pageData, robotsRules) {
  let score = 100;
  const meta = pageData.metaTags || {};
  const semantic = pageData.semantic || {};
  const issues = { robots: [], semantic: [], js: [] };

  const signals = {
    robots: { status: 'ok', value: 'Bots and AI crawlers allowed' },
    semantic: { status: 'ok', value: 'Good semantic structure' },
    js: { status: 'ok', value: 'Content is SEO-friendly' },
    score: 0
  };

  // 1. Robots.txt & Meta (Weight: 50)
  let techPenalty = 0;

  // robots.txt: weight by how many AI bots are blocked
  if (robotsRules.blockedAll) {
    techPenalty += 25;
    issues.robots.push('All crawlers blocked (User-agent: *)');
  } else if (robotsRules.blockedBots && robotsRules.blockedBots.length > 0) {
    const n = robotsRules.blockedBots.length;
    techPenalty += Math.min(25, 5 + n * 3);
    const sample = robotsRules.blockedBots.slice(0, 3).join(', ');
    issues.robots.push(`${n} AI bot${n > 1 ? 's' : ''} blocked (${sample}${n > 3 ? '…' : ''})`);
  }

  // Meta robots: noindex is fatal, nofollow & noai are partial penalties
  const metaRobots = meta['robots'] || '';
  if (metaRobots.includes('noindex') || metaRobots.includes('none')) {
    techPenalty += 50;
    issues.robots.push('Meta noindex prevents indexing');
  }
  if (metaRobots.includes('nofollow')) {
    techPenalty += 5;
    issues.robots.push('Meta nofollow set');
  }
  if (meta['noai'] || meta['noimageai'] || metaRobots.includes('noai')) {
    techPenalty += 15;
    issues.robots.push('AI training opt-out signaled');
  }
  // Bot-specific meta (e.g. <meta name="gptbot" content="noindex">)
  for (const key of Object.keys(meta)) {
    if (key === 'robots') continue;
    if (key.endsWith('bot') && (meta[key].includes('noindex') || meta[key].includes('none'))) {
      techPenalty += 10;
      issues.robots.push(`${key} blocked via meta`);
      break;
    }
  }

  if (issues.robots.length > 0) {
    const level = techPenalty >= 40 ? 'error' : 'warn';
    signals.robots = { status: level, value: issues.robots[0] };
  }
  score -= Math.min(50, techPenalty);

  // 2. Semantic Analysis (Weight: 30)
  let semanticPenalty = 0;
  if (semantic.headings && semantic.headings.h1 === 0) {
    semanticPenalty += 10;
    issues.semantic.push('Missing H1 heading');
  } else if (semantic.headings && semantic.headings.h1 > 1) {
    semanticPenalty += 5;
    issues.semantic.push('Multiple H1 headings');
  }
  if ((semantic.semanticTags || 0) < 2) {
    semanticPenalty += 10;
    issues.semantic.push('Few HTML5 semantic tags');
  }
  if (semantic.imageCount > 0 && semantic.imageAltRatio < 0.5) {
    semanticPenalty += 10;
    issues.semantic.push(`Only ${Math.round(semantic.imageAltRatio * 100)}% of images have alt text`);
  }
  if (!semantic.hasLangAttr) {
    semanticPenalty += 3;
    issues.semantic.push('Missing <html lang> attribute');
  }
  // Reward structured data (cap recovery so we never exceed 100)
  if (semantic.hasStructuredData) {
    semanticPenalty -= 5;
  }
  if (issues.semantic.length > 0) {
    signals.semantic = { status: 'warn', value: issues.semantic[0] };
  } else if (semantic.hasStructuredData) {
    signals.semantic = { status: 'ok', value: 'Structured data present' };
  }
  score -= Math.max(0, semanticPenalty);

  // 3. JS-Heavy Detection (Weight: 20)
  // The content script re-fetches the page same-origin, so this compares the
  // exact HTML the browser rendered from against the rendered DOM.
  const renderedSize = pageData.domSize || 0;
  const initialSize = (pageData.rawHtml || '').length;

  if (!pageData.rawHtmlOk || !pageData.rawHtmlIsHtml || initialSize === 0) {
    // Could not fetch comparable HTML (non-HTML response, redirect, or error).
    // Don't penalize — we simply can't verify server-side rendering.
    signals.js = { status: 'warn', value: 'Could not verify SSR payload' };
  } else {
    const jsRatio = renderedSize / initialSize;
    const absoluteGap = renderedSize - initialSize;
    // Require BOTH a high ratio AND a large absolute gap, so small pages
    // (where minor DOM normalization inflates the ratio) never trip the check.
    const shellLikely = initialSize < 5000 && renderedSize > 20000;
    const heavyJs = jsRatio > 5 && absoluteGap > 20000;
    const moderateJs = jsRatio > 2 && absoluteGap > 10000;

    if (shellLikely || heavyJs) {
      score -= 20;
      signals.js = { status: 'error', value: 'Heavy JS rendering — bots may miss content' };
    } else if (moderateJs) {
      score -= 10;
      signals.js = { status: 'warn', value: 'Significant client-side rendering' };
    }
  }

  signals.score = Math.max(0, Math.min(100, Math.round(score)));
  return signals;
}

function updateEnhancedUI(signals) {
  const scoreText = document.getElementById('score-text');
  const scorePath = document.getElementById('score-path');
  const verdictTitle = document.querySelector('.verdict-title');
  const verdictDesc = document.querySelector('.verdict-desc');

  // Update Score Circle
  scoreText.textContent = signals.score;
  scorePath.setAttribute('stroke-dasharray', `${signals.score}, 100`);
  
  let level = 'ok';
  if (signals.score < 50) level = 'error';
  else if (signals.score < 80) level = 'warn';
  
  scorePath.className.baseVal = `circle score-${level}`;

  // Update Verdict
  if (signals.score >= 80) {
    verdictTitle.textContent = "AI Friendly";
    verdictDesc.textContent = "Highly accessible for AI systems.";
  } else if (signals.score >= 50) {
    verdictTitle.textContent = "Partially Restricted";
    verdictDesc.textContent = "Some technical hurdles detected.";
  } else {
    verdictTitle.textContent = "Blocked / Poor";
    verdictDesc.textContent = "Significant barriers for AI bots.";
  }

  updateSignal('robots', signals.robots.status, signals.robots.value);
  updateSignal('semantic', signals.semantic.status, signals.semantic.value);
  updateSignal('js', signals.js.status, signals.js.value);
}

function updateSignal(id, status, value) {
  const statusEl = document.getElementById(`${id}-status`);
  const valueEl = document.getElementById(`${id}-value`);
  if (!statusEl || !valueEl) return;
  
  statusEl.className = 'signal-status-dot';
  if (status === 'ok') statusEl.classList.add('status-ok');
  else if (status === 'warn') statusEl.classList.add('status-warn');
  else if (status === 'error') statusEl.classList.add('status-error');
  
  valueEl.textContent = value;
}

function showError(message) {
  document.querySelector('.verdict-title').textContent = "Error";
  document.querySelector('.verdict-desc').textContent = message;
  document.getElementById('score-text').textContent = '!!';
}
