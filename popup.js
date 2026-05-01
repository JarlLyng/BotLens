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
    const origin = url.origin;

    // 1. Get Data from Content Script
    let pageData;
    try {
      pageData = await chrome.tabs.sendMessage(tab.id, { action: "analyzePage" });
      if (!pageData) throw new Error("No data received from page.");
    } catch (e) {
      console.error("Content Script Error:", e);
      showError("Please refresh the page to enable analysis.");
      return;
    }

    // 2. Fetch robots.txt & Initial HTML
    let robotsTxt = null;
    let rawHtml = '';
    
    try {
      const results = await Promise.allSettled([
        fetchRobotsTxt(origin),
        fetchRawHtml(tab.url)
      ]);
      
      robotsTxt = results[0].status === 'fulfilled' ? results[0].value : null;
      rawHtml = results[1].status === 'fulfilled' ? results[1].value : '';
    } catch (e) {
      console.warn("Fetch failed, but continuing analysis with available data.");
    }

    const robotsRules = parseRobotsTxt(robotsTxt, url.pathname);

    // 3. Analyze Signals & Calculate Score
    const signals = calculateEnhancedSignals(pageData, robotsRules, rawHtml);
    
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

async function fetchRobotsTxt(origin) {
  try {
    const res = await fetch(`${origin}/robots.txt`);
    return res.ok ? await res.text() : null;
  } catch (e) { return null; }
}

async function fetchRawHtml(url) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.text() : '';
  } catch (e) { return ''; }
}

function parseRobotsTxt(content, currentPath) {
  if (!content) return { exists: false, rules: [] };
  const rules = [];
  const lines = content.split('\n');
  let currentAgent = null;

  for (let line of lines) {
    line = line.trim().toLowerCase();
    if (line.startsWith('#') || line === '') continue;
    if (line.startsWith('user-agent:')) {
      currentAgent = line.split(':')[1].trim();
    } else if (line.startsWith('disallow:') && currentAgent) {
      const path = line.split(':')[1].trim();
      if (path && (currentPath.startsWith(path) || path === '/')) {
        rules.push({ agent: currentAgent, disallow: path });
      }
    }
  }
  return { exists: true, rules };
}

function calculateEnhancedSignals(pageData, robotsRules, rawHtml) {
  let score = 100;
  const meta = pageData.metaTags || {};
  const semantic = pageData.semantic || {};
  
  const signals = {
    robots: { status: 'ok', value: 'Search engines allowed' },
    semantic: { status: 'ok', value: 'Good semantic structure' },
    js: { status: 'ok', value: 'Content is SEO-friendly' },
    score: 0
  };

  // 1. Robots & Meta (Weight: 50)
  let techPenalty = 0;
  if (robotsRules.rules.some(r => r.agent === 'gptbot' || r.agent === '*')) {
    techPenalty += 25;
    signals.robots = { status: 'warn', value: 'Some bots restricted in robots.txt' };
  }
  if (meta['robots'] && meta['robots'].includes('noindex')) {
    techPenalty += 50;
    signals.robots = { status: 'error', value: 'Meta noindex found' };
  }
  score -= techPenalty;

  // 2. Semantic Analysis (Weight: 30)
  let semanticPenalty = 0;
  if (semantic.headings.h1 === 0) {
    semanticPenalty += 10;
    signals.semantic = { status: 'warn', value: 'Missing H1 heading' };
  } else if (semantic.headings.h1 > 1) {
    semanticPenalty += 5;
    signals.semantic = { status: 'warn', value: 'Multiple H1 headings' };
  }
  if (semantic.semanticTags < 2) {
    semanticPenalty += 10;
    signals.semantic = { status: 'warn', value: 'Poor semantic structure' };
  }
  if (semantic.imageAltRatio < 0.5) {
    semanticPenalty += 10;
    signals.semantic = { status: 'warn', value: 'Missing image alt texts' };
  }
  score -= semanticPenalty;

  // 3. JS-Heavy Detection (Weight: 20)
  const renderedSize = pageData.domSize;
  const initialSize = rawHtml.length;
  const jsRatio = initialSize > 0 ? renderedSize / initialSize : 1;

  if (jsRatio > 5 && renderedSize > 5000) {
    score -= 20;
    signals.js = { status: 'error', value: 'Heavy JS rendering (Hard for bots)' };
  } else if (jsRatio > 2) {
    score -= 10;
    signals.js = { status: 'warn', value: 'Significant client-side rendering' };
  }

  signals.score = Math.max(0, Math.min(100, score));
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
