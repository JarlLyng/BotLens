# CLAUDE.md — BotLens

Quick-start context for developers and AI assistants.

## What is BotLens?

BotLens is a Chrome extension that analyzes whether a website can be read by AI crawlers and
language models (GPTBot, ClaudeBot, Perplexity, Google-Extended, and 15+ others) and gives
the current page a 0–100 AI readability score. Everything runs locally in the browser — no
accounts, no backend, no data collection. The marketing site uses privacy-friendly Umami
analytics; the extension itself sends nothing anywhere.

- **Developer:** Jarl Lyng / [IAMJARL](https://iamjarl.com)
- **Website:** [botlens.iamjarl.com](https://botlens.iamjarl.com)
- **Store:** [Chrome Web Store](https://chromewebstore.google.com/detail/botlens/lpopnolnbpkmealenachikdfkfeaoecl)
- **License:** [MIT](LICENSE) — open source.
- **Price:** Free (no in-app purchases, no subscription, no ads)
- **Status:** Live on the Chrome Web Store (v1.1.0)

## Strategy lives in the private hub

Target audience, positioning, pricing reasoning, and marketing/SEO/GEO playbooks are **not**
in this public repo — they're in the private
[iamjarl-strategy](https://github.com/JarlLyng/iamjarl-strategy) hub (folder `BotLens/`).
Before doing any audience / positioning / pricing / marketing-planning work, read that
repo's `CONVENTIONS.md` and write results there, not here. Public GitHub issues are fine for
bug reports, feature requests, and general (public-safe) marketing tasks.

## App features (be precise — do not invent features that don't exist)

- One-click AI readability score (0–100) for the current page, shown in the popup.
- robots.txt parsing: multiple user-agent groups, Allow/Disallow precedence by longest
  match, `*` wildcards, `$` end-of-path anchors; evaluated against the current URL for 20+
  known AI user-agents (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bytespider, etc).
- Meta directive detection: `robots` noindex/nofollow/none, bot-specific meta, and the
  `noai` / `noimageai` AI-training opt-outs.
- Semantic checks: heading hierarchy (H1 count/depth), HTML5 landmarks, image alt-text
  coverage, JSON-LD presence, `<html lang>`.
- JS-rendering detection: compares same-origin raw HTML to the rendered DOM to flag SPA
  shells that serve crawlers a near-empty page.
- Three signal rows (robots.txt & Meta, Content Structure, JS Rendering) plus a verdict.

### Features that do NOT exist (common hallucination targets)
- **No** account, login, cloud sync, or backend of any kind.
- **No** multi-page / whole-site crawl — it scores the single active page only.
- **No** historical tracking, dashboards, or saved reports.
- **No** telemetry from the extension (the marketing *site* has Umami; the extension does not).
- **No** IPTC image-metadata or Open Graph / canonical / llms.txt detection *yet* (tracked
  in issues #18/#19/#21 — do not describe them as shipped).
- **No** Firefox/Safari build yet (Manifest V3, Chromium browsers only).

## Requirements
- Any Chromium browser supporting Manifest V3 (Chrome, Edge, Brave, Arc, Opera, Vivaldi).

## Build & run
- **Load unpacked:** `chrome://extensions` → enable Developer Mode → Load unpacked → select repo folder.
- `npm install` — dev dependencies (eslint).
- `npm run lint` — ESLint (also runs in CI; must pass).
- `npm run build` — produces `dist/botlens-<version>.zip` for the Web Store.
- **Release:** bump `version` in `manifest.json` + update `CHANGELOG.md`, then
  `git tag vX.Y.Z && git push origin vX.Y.Z` → GitHub Actions lints, builds, uploads, and
  publishes (see `.github/workflows/publish.yml`).

## Conventions
- Uses [`iamjarl-design`](https://github.com/JarlLyng/iamjarl-design) tokens via `tokens.css`
  — no hardcoded colors/spacing/radius/type.
- **No remote code** — Manifest V3 forbids it and Web Store review rejects it. All scripts
  and icons are bundled; icons are inline SVG.
- Popup logic in `popup.js`; the injected page extractor (runs same-origin, fetches
  robots.txt + raw HTML) in `content.js`.
- Adding a new permission to `manifest.json` needs a deliberate reason — broad host
  permissions trigger slower Web Store review (we removed `<all_urls>` in v1.1.0).
