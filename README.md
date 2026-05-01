# BotLens

A Chrome Extension that analyzes whether a website can be read and accessed by AI systems (LLMs, crawlers, and bots), and provides a clear, actionable overview.

**Website:** [botlens.iamjarl.com](https://botlens.iamjarl.com)

---

## 🎯 Goal

BotLens helps answer a simple but increasingly important question:

> Can AI read this website?

It inspects technical signals that determine whether AI systems (like GPT-based crawlers, search bots, or data scrapers) can access and interpret a page.

---

## 🧩 Core Features (v1)

### 1. Robots.txt Analysis

* Detect presence of `/robots.txt`
* Parse rules
* Identify:

  * Disallowed paths
  * Bot-specific rules (e.g. GPTBot, Googlebot)

### 2. Meta Tags Inspection

* `robots` meta tag
* `noindex`, `nofollow`, `noarchive`

### 3. HTTP Headers Check

* `X-Robots-Tag`
* Basic accessibility signals

### 4. AI Bot Detection (Heuristic)

Check for explicit allow/deny rules for:

* GPTBot (OpenAI)
* Googlebot
* Bingbot
* ClaudeBot (Anthropic, if present)

### 5. Simple Verdict

Display a clear status:

* ✅ Likely readable by AI
* ⚠️ Partially restricted
* ❌ Blocked

---

## 🧠 Future Features (v2+)

* Content quality signals (semantic structure, headings, etc.)
* JS-heavy rendering detection (hard for bots)
* Paywall / auth detection
* AI-specific scoring system
* “Explain like I’m an AI” summary

---

## 🏗️ Tech Stack

* Manifest V3
* Vanilla JavaScript
* Chrome APIs:

  * `chrome.tabs`
  * `chrome.scripting`
  * `chrome.storage.local`

No frameworks. Keep everything simple and inspectable.

---

## 📁 Project Structure

```
my-extension/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── background.js (optional)
└── styles.css
```

---

## ⚙️ How It Works

1. User opens a website
2. Clicks the extension
3. Extension:

   * Fetches `/robots.txt`
   * Reads meta tags from DOM
   * Checks headers (where possible)
4. Runs simple rules
5. Outputs a verdict + explanation

---

## 🚀 Getting Started

### 1. Clone / Create project

```
mkdir botlens
cd botlens
```

### 2. Add base files

Create:

* `manifest.json`
* `popup.html`
* `popup.js`
* `content.js`

### 3. Load in Chrome

Go to:

```
chrome://extensions/
```

* Enable Developer Mode
* Click "Load unpacked"
* Select project folder

---

## 📌 Manifest (baseline)

```json
{
  "manifest_version": 3,
  "name": "BotLens",
  "version": "1.0.0",
  "description": "Check if a site is readable by AI",
  "permissions": ["tabs", "scripting"],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_popup": "popup.html"
  }
}
```

---

## 🧪 Development Approach

Keep iteration tight and simple:

1. Build one signal at a time
2. Log everything to console
3. Verify on real sites:

   * news sites
   * blogs
   * docs
4. Only then add UI

---

## 📊 Example Output

```
Status: ⚠️ Partially Restricted

- robots.txt blocks GPTBot
- meta tag: noindex
- Googlebot allowed
```

---

## 🧭 Design Principles

* Minimal UI
* Clear verdict over raw data
* No overengineering
* Transparent logic (no black box)

---

## 🔮 Vision

BotLens can evolve into:

* AI SEO tool
* Content optimization assistant
* Visibility layer for AI-native web

---

## 🧑‍💻 Notes for Cursor

* Prefer small, incremental changes
* Avoid adding frameworks
* Keep logic modular (robots, meta, headers separated)
* Always explain changes

---

## 📄 License

MIT (or TBD)