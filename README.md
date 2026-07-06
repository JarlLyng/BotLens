# BotLens 🕵️‍♂️🤖

![BotLens Social Preview](assets/social-preview.png)

[![Lint](https://github.com/JarlLyng/BotLens/actions/workflows/lint.yml/badge.svg)](https://github.com/JarlLyng/BotLens/actions/workflows/lint.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-live-brightgreen.svg)](https://chromewebstore.google.com/detail/botlens/lpopnolnbpkmealenachikdfkfeaoecl)

**BotLens** is a Chrome extension that analyzes whether a website can be read and understood by AI systems — GPTBot, ClaudeBot, Perplexity, Google-Extended, and 15+ other LLM crawlers. It produces an actionable 0-100 readability score and a technical breakdown of how bots see your content.

**Homepage:** [botlens.iamjarl.com](https://botlens.iamjarl.com) · **Privacy:** [botlens.iamjarl.com/privacy.html](https://botlens.iamjarl.com/privacy.html)

---

## 🎯 The Goal

As the web becomes increasingly AI-native, a new question arises: **"Can AI read this?"**

BotLens helps developers and site owners answer this by inspecting technical signals — like `robots.txt` directives, meta tags, semantic HTML, structured data, and JavaScript rendering — that determine whether systems like GPTBot and ClaudeBot can effectively interpret a page.

---

## 🧩 Key Features

- **AI Readability Score** — Weighted 0-100 score across four signal categories.
- **robots.txt Analysis** — Full spec support: Allow/Disallow precedence, wildcards (`*`), end-of-path anchors (`$`), and 20+ AI user-agents including `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Bytespider`, and more.
- **Meta Directive Detection** — `noindex`, `nofollow`, `noai`, `noimageai`, and bot-specific meta tags.
- **Semantic Structure Check** — Heading hierarchy, HTML5 landmarks, image alt-text coverage, JSON-LD, and `<html lang>`.
- **JS Rendering Detection** — Compares initial HTML to rendered DOM to catch SPA shells that hide content from crawlers.
- **Privacy-first** — 100% local. No accounts, no telemetry, no external servers.

---

## 🏗️ Technical Stack

- **Manifest V3** — modern Chrome extension architecture
- **Vanilla JavaScript** — no frameworks, no build step required to load unpacked
- **Design tokens** — [IAMJARL Design Tokens](https://github.com/JarlLyng/iamjarl-design)
- **Icons** — inline SVG (no external CDN dependencies)
- **Marketing site** — GitHub Pages, deployed automatically from [`website/`](website/)

---

## 🚀 Getting Started

### Install (for users)

**[⬇️ Add BotLens to Chrome](https://chromewebstore.google.com/detail/botlens/lpopnolnbpkmealenachikdfkfeaoecl)** — one click, works on Chrome, Edge, Brave, and other Chromium browsers.

Or install from source:

1. Clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (top right).
4. Click **Load unpacked** and select the project folder.

### Development

```bash
npm install          # install dev dependencies
npm run lint         # ESLint check (also runs in CI)
npm run build        # produce dist/botlens-<version>.zip for the Web Store
```

Coding conventions:

- Follow the tokens in [`tokens.css`](tokens.css) for anything UI-related.
- Keep the popup logic in [`popup.js`](popup.js) and the injected page extractor in [`content.js`](content.js).
- Do not add remote script dependencies — MV3 forbids it and Chrome Web Store review rejects it.

### Releasing

Publishing to the Chrome Web Store is automated via GitHub Actions ([`.github/workflows/publish.yml`](.github/workflows/publish.yml)):

```bash
# 1. Bump "version" in manifest.json + update CHANGELOG.md, commit
# 2. Tag and push:
git tag v1.2.0 && git push origin v1.2.0
# → CI lints, builds, uploads to the Web Store, and submits for review
```

To upload a draft without submitting (e.g. to sanity-check a package), run the
workflow manually from the Actions tab and uncheck "Submit for publishing".

Publishing requires four repository secrets (`CWS_EXTENSION_ID`, `CWS_CLIENT_ID`,
`CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`). The manual devconsole upload remains a
valid fallback if the API flow ever breaks.

---

## 🗺️ Roadmap

Tracked in [GitHub issues](https://github.com/JarlLyng/BotLens/issues). High-level:

- **v1.1** — Drop `<all_urls>` host permission by moving fetches into content script ([#20](https://github.com/JarlLyng/BotLens/issues/20))
- **v2** — Detect Open Graph, Twitter Card, canonical ([#18](https://github.com/JarlLyng/BotLens/issues/18)); llms.txt detection ([#19](https://github.com/JarlLyng/BotLens/issues/19)); detail breakdown panel ([#17](https://github.com/JarlLyng/BotLens/issues/17)); parser tests ([#15](https://github.com/JarlLyng/BotLens/issues/15))
- **v3** — Modular detection engine, CMS/framework/hosting/analytics detection

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports, feature requests, and pull requests all welcome — issues use structured templates.

---

## 🔒 Security

See [SECURITY.md](SECURITY.md). Please **do not** open public issues for vulnerabilities — use GitHub's [Private Vulnerability Reporting](https://github.com/JarlLyng/BotLens/security/advisories/new).

---

## 🧑‍💻 Built By

BotLens is created and maintained by **[iamjarl](https://iamjarl.com)** — a Danish enkeltmandsvirksomhed building tools at the intersection of human experience and AI infrastructure.

---

## 📄 License

MIT — see [LICENSE](LICENSE).
