# Changelog

All notable changes to BotLens are documented here. This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.4.1] - 2026-10-08

### Changed
- The popup's wordmark and verdict are set in Outfit, the display face of the IAMJARL
  web-tools family, bundled with the extension (OFL-1.1). Body text is unchanged
  ([#47](https://github.com/JarlLyng/BotLens/issues/47))
- Design tokens updated from iamjarl-design v1.13.0 to v1.18.1. For the popup only the font
  stacks change: `--ij-font-ui` now lists fallbacks after `system-ui`
  ([#48](https://github.com/JarlLyng/BotLens/issues/48))
- The package grows from 28 KB to 64 KB, almost all of it the 32 KB font file.

## [1.4.0] - 2026-10-03

### Added
- The Details panel has a "Content provenance" section: the page's `<meta name="generator">`,
  any schema.org `digitalSourceType` in its JSON-LD, and the IPTC DigitalSourceType in up to
  10 of the page's own images (read from their first 256 KB). Values that mean generative AI
  (`trainedAlgorithmicMedia` and its composite) are marked "AI-generated". Google asks sites
  to give this context and names the IPTC field for AI images; it neither rewards nor
  penalizes it, so BotLens reports it and does not score it
  ([#21](https://github.com/JarlLyng/BotLens/issues/21))

## [1.3.0] - 2026-10-03

### Added
- The Details panel has a "Site files" section. It reports the sitemap (the one robots.txt
  names, or `/sitemap.xml`), whether it is valid XML and how many URLs or sitemaps it lists,
  and whether `/llms.txt` and `/llms-full.txt` exist. A page that answers with HTML, as many
  single-page apps do for every path, does not count. These describe the site rather than
  the page, so they are reported and not scored
  ([#1](https://github.com/JarlLyng/BotLens/issues/1), [#19](https://github.com/JarlLyng/BotLens/issues/19))

## [1.2.1] - 2026-10-03

### Added
- A "Send feedback" link at the bottom of the popup opens an email to support@iamjarl.com
  with the subject "BotLens <version> feedback". The extension collects no usage data, so
  this is the private way to say what is wrong ([#45](https://github.com/JarlLyng/BotLens/issues/45))

## [1.2.0] - 2026-09-25

### Added
- Content Structure now checks for complete Open Graph tags (title, description and image),
  a Twitter Card and a canonical link. Each is worth 2 points, offsetting other penalties in
  that category, so they can raise a page's score but never past 100
  ([#18](https://github.com/JarlLyng/BotLens/issues/18))
- A "Details" panel, collapsed under the three signal rows, shows what each score was built
  from. It lists every issue, not only the first; every blocked AI bot and the exceptions to
  `User-agent: *`; all meta directives; headings, landmarks, alt-text coverage and `lang`;
  the JSON-LD types found and any block that does not parse; which Open Graph tags are
  missing, and the Twitter Card and canonical URL; and the served and rendered HTML sizes
  ([#17](https://github.com/JarlLyng/BotLens/issues/17), [#2](https://github.com/JarlLyng/BotLens/issues/2))

### Fixed
- Signal rows no longer split words in the middle ("gptbo / t"). Long values still wrap.

## [1.1.1] - 2026-09-23

### Changed
- Updated `iamjarl-design` tokens from v0.5.0 to v1.13.0. The popup's Re-analyze button now
  uses the mode-aware `--ij-color-primary-hover` token instead of `filter: brightness(1.1)`,
  which corrects the dark-mode hover direction (it was going lighter and washed out; the
  token goes deeper). Marketing-site changes from the same update
  were already live; this entry covers the extension side.
- The JS Rendering signal's warning now reads "Heavy JS rendering (bots may miss content)".
  It used an em-dash, which the portfolio voice does not use in copy.
- The extension package drops from 492 KB to 24 KB. It had been shipping the unused
  1024px source icon, which was 95% of the download.

### Fixed
- robots.txt: a bot with no group of its own now falls back to `User-agent: *`, as
  RFC 9309 requires, and several groups naming the same bot are combined. Before, a file
  that blocks everything except chosen bots reported "All crawlers blocked" and missed
  the bots that `*` did block. It now reports, for example, "23 AI bots blocked, 1
  allowed (gptbot)" ([#41](https://github.com/JarlLyng/BotLens/issues/41))

## [1.1.0] - 2026-07-06

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

## [1.0.0] - 2026-07-06

Initial public release, [live on the Chrome Web Store](https://chromewebstore.google.com/detail/botlens/lpopnolnbpkmealenachikdfkfeaoecl).

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
- Inline SVG icons (no remote code dependencies)
- Permissions: `activeTab`, `scripting`, and `<all_urls>` host permission
