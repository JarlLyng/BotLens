# Changelog

All notable changes to BotLens are documented here. This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Planned
- Drop `<all_urls>` host permission by moving fetches into content script ([#20](https://github.com/JarlLyng/BotLens/issues/20))
- Detect Open Graph, Twitter Card, canonical as scoring signals ([#18](https://github.com/JarlLyng/BotLens/issues/18))
- llms.txt detection with capped bonus ([#19](https://github.com/JarlLyng/BotLens/issues/19))
- Automated tests for robots.txt parser ([#15](https://github.com/JarlLyng/BotLens/issues/15))
- Detail breakdown panel ([#17](https://github.com/JarlLyng/BotLens/issues/17))

## [1.0.0] — 2026-07-01

Initial submission to Chrome Web Store.

### Added
- AI readability score (0-100) across four signal categories
- robots.txt parser with Allow/Disallow precedence, wildcards, `$` anchors
- Detection of 20+ AI user-agents (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bytespider, and more)
- Meta directive detection: `noindex`, `nofollow`, `noai`, `noimageai`, bot-specific meta
- Semantic HTML checks: heading hierarchy, HTML5 landmarks, image alt-text ratio, JSON-LD, `<html lang>`
- SPA shell detection via initial HTML vs. rendered DOM comparison
- Popup UI built on IAMJARL Design Tokens with light/dark mode
- Marketing site at [botlens.iamjarl.com](https://botlens.iamjarl.com) with OG, JSON-LD, sitemap, `llms.txt`, and FAQ
- Privacy policy at [botlens.iamjarl.com/privacy.html](https://botlens.iamjarl.com/privacy.html)
- Build script (`npm run build`) producing a Chrome Web Store-ready zip

### Technical
- Manifest V3
- Programmatic script injection via `chrome.scripting.executeScript` (no static content scripts)
- Inline SVG icons — no remote code dependencies
- Permissions: `activeTab`, `scripting`, and `<all_urls>` host permission
