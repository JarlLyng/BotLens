# Changelog

All notable changes to BotLens are documented here. This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed — merged, ships with the next release
- Updated `iamjarl-design` tokens from v0.5.0 to v1.2.1. The popup's Re-analyze button now
  uses the mode-aware `--ij-color-primary-hover` token instead of `filter: brightness(1.1)`,
  which corrects the dark-mode hover direction (it was going lighter and washed out; the
  token goes deeper). Marketing-site changes from the same update are already live; this
  entry covers the extension side, which reaches users on the next Web Store release.

### Planned
- Detect Open Graph, Twitter Card, canonical as scoring signals ([#18](https://github.com/JarlLyng/BotLens/issues/18))
- llms.txt detection with capped bonus ([#19](https://github.com/JarlLyng/BotLens/issues/19))
- AI content transparency detection ([#21](https://github.com/JarlLyng/BotLens/issues/21))
- Automated tests for robots.txt parser ([#15](https://github.com/JarlLyng/BotLens/issues/15))
- Detail breakdown panel ([#17](https://github.com/JarlLyng/BotLens/issues/17))
- Detect design-token drift automatically ([#30](https://github.com/JarlLyng/BotLens/issues/30))

## [1.1.0] — 2026-07-06

### Changed
- **Removed the `<all_urls>` host permission.** robots.txt and raw HTML are now
  fetched from within the content script (same-origin), so the extension no
  longer needs broad host access. Users no longer see the "Read your data on
  all websites" install warning. ([#20](https://github.com/JarlLyng/BotLens/issues/20))

### Fixed
- Static sites were incorrectly flagged as "Significant client-side rendering".
  The JS-heavy heuristic now requires both a high rendered/initial ratio **and**
  a large absolute byte gap, and falls back to "could not verify" for non-HTML
  or failed fetches. Fully static pages now score their JS signal as OK.
  ([#24](https://github.com/JarlLyng/BotLens/issues/24))

## [1.0.0] — 2026-07-06

Initial public release — [live on the Chrome Web Store](https://chromewebstore.google.com/detail/botlens/lpopnolnbpkmealenachikdfkfeaoecl).

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
