# AGENTS.md: BotLens

Quick-start context for developers and AI assistants.

## What is BotLens?

BotLens is a Chrome extension that analyzes whether a website can be read by AI crawlers and
language models (GPTBot, ClaudeBot, Perplexity, Google-Extended, and 15+ others) and gives
the current page a 0–100 AI readability score. Everything runs locally in the browser, with no
accounts, no backend, and no data collection. The marketing site uses privacy-friendly Umami
analytics; the extension itself sends nothing anywhere.

- **Developer:** [IAMJARL](https://iamjarl.com)
- **Website:** [botlens.iamjarl.com](https://botlens.iamjarl.com)
- **Store:** [Chrome Web Store](https://chromewebstore.google.com/detail/botlens/lpopnolnbpkmealenachikdfkfeaoecl)
- **License:** [MIT](LICENSE), open source.
- **Price:** Free (no in-app purchases, no subscription, no ads)
- **Status:** Live on the Chrome Web Store (v1.4.1)

## Boundaries: work only in this repo

- Commit, push and open pull requests **only in this repo**. Never edit, commit to, push to or
  open a pull request in another IAMJARL repo, and that includes `iamjarl-design`.
- To ask another repo for something, **open an issue there**. Public repos get findings, never
  measured numbers. If it is strategic, or not safe in public, it goes to the hub instead.
- The one place outside this repo you write is this app's own folder in the private hub
  (`BotLens/`). Shared hub files (`PORTFOLIO.md`, the standards, `tools/`) are changed from inside
  the hub; if one needs changing, open an issue there.
- If a task seems to need a change in another repo, stop, open the issue, and carry on with what
  this repo can do.

## Strategy lives in the private hub

Target audience, positioning, pricing reasoning, and marketing/SEO/GEO playbooks are **not**
in this public repo. They're in the private
[iamjarl-strategy](https://github.com/JarlLyng/iamjarl-strategy) hub (folder `BotLens/`).
Before doing any audience / positioning / pricing / marketing-planning work, read that
repo's `CONVENTIONS.md` and write results there, not here. Public GitHub issues are fine for
bug reports, feature requests, and general (public-safe) marketing tasks.

## App features (be precise, do not invent features that don't exist)

- One-click AI readability score (0–100) for the current page, shown in the popup.
- robots.txt parsing: multiple user-agent groups, Allow/Disallow precedence by longest
  match, `*` wildcards, `$` end-of-path anchors; evaluated against the current URL for 20+
  known AI user-agents (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bytespider, etc).
- Meta directive detection: `robots` noindex/nofollow/none, bot-specific meta, and the
  `noai` / `noimageai` AI-training opt-outs.
- Semantic checks: heading hierarchy (H1 count/depth), HTML5 landmarks, image alt-text
  coverage, JSON-LD presence, `<html lang>`.
- Link metadata: complete Open Graph (title, description, image), Twitter Card and
  `<link rel="canonical">`, worth 2 points each as offsets against other Content Structure
  penalties, never past 100.
- JS-rendering detection: compares same-origin raw HTML to the rendered DOM to flag SPA
  shells that serve crawlers a near-empty page.
- Three signal rows (robots.txt & Meta, Content Structure, JS Rendering) plus a verdict.
- A collapsed "Details" panel under the rows: every issue per category, the full list of
  blocked bots, all meta directives, heading counts, landmarks, alt-text coverage, `lang`,
  JSON-LD `@type`s and unparseable blocks, Open Graph / Twitter Card / canonical, and the
  served vs rendered HTML sizes, plus a "Site files" section: the sitemap (from robots.txt or
  `/sitemap.xml`, same-origin only, XML-validated) and whether `/llms.txt` and
  `/llms-full.txt` exist. Reported only, not scored (#1, #19).
- A "Content provenance" section in the panel: `<meta name="generator">`, schema.org
  `digitalSourceType` anywhere in JSON-LD, and the IPTC DigitalSourceType in the first 256 KB of
  up to 10 same-origin images. `trainedAlgorithmicMedia` and its composite are marked
  AI-generated. Reported only, not scored (#21).

### Features that do NOT exist (common hallucination targets)
- **No** account, login or cloud sync, and **no backend for the extension**. The only server
  code is the site's optional web demo (below), which the extension never calls.
- **No** multi-page / whole-site crawl. It scores the single active page only.
- **No** historical tracking, dashboards, or saved reports.
- **No** telemetry from the extension (the marketing *site* has Umami; the extension does not).
- **No** claims about which AI companies read llms.txt. BotLens reports whether the file
  exists and nothing more; the site's FAQ cites what Google says about it.
- **No** Firefox/Safari build yet (Manifest V3, Chromium browsers only).

## Web demo (#28)

A form on the site (`#try`) sends one address to `POST /api/check`, a Vercel Function in this
repo (IAMJARL team on Vercel). It fetches that page and its robots.txt once and scores them with
the extension's own `content.js` and `popup.js` (`lib/analyze.js`), so the two cannot drift. The
score is partial: no JavaScript runs server-side.

- `lib/safe-fetch.js`: public http(s) on ports 80/443 only; every resolved address is checked at
  connect time (no private, loopback, link-local or metadata ranges, no DNS rebinding);
  redirects re-checked; time and size limits.
- `lib/rate-limit.js`: Turso holds only counters, 10 checks per visitor per hour and 1000 per
  day overall. Visitor keys are an HMAC of the IP with a daily salt; no IP, URL or score is
  stored. The URL travels in the POST body so it stays out of request logs.
- Vercel environment: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `DEMO_RATE_SECRET`. Without them
  the endpoint answers 503.
- Production: `https://botlens-demo-nu.vercel.app/api/check` (Vercel project `botlens-demo`, IAMJARL
  team; Turso database `botlens-demo`). `data-api` on `#try` in `website/index.html` names it;
  empty, the form stays hidden.
- Changing the extractor or the scoring changes the demo too; `test/demo.test.js` covers it.

## Requirements
- Any Chromium browser supporting Manifest V3 (Chrome, Edge, Brave, Arc, Opera, Vivaldi).

## Build & run
- **Load unpacked:** `chrome://extensions` → enable Developer Mode → Load unpacked → select repo folder.
- `npm install`: dev dependencies (eslint).
- `npm run lint`: ESLint (also runs in CI; must pass).
- `npm test`: parser and scoring tests against the shipped `popup.js` (CI; gates publishing).
- `npm run build`: produces `dist/botlens-<version>.zip` for the Web Store.
- `npm run check:faq` / `npm run fix:faq`: check, or regenerate, the FAQPage JSON-LD.
- **Release:** bump `version` in `manifest.json` + update `CHANGELOG.md`, then
  `git tag vX.Y.Z && git push origin vX.Y.Z` → GitHub Actions lints, builds, uploads, and
  publishes through Chrome Web Store API V2 (see `.github/workflows/publish.yml`).
  Authentication is keyless: GitHub's OIDC token is exchanged for a short-lived Google
  access token (Workload Identity Federation), so nothing expires. Run the workflow
  manually in `check` mode to verify it; that uploads nothing. The API calls are in
  `scripts/cws.js`.

## Conventions
- Uses [`iamjarl-design`](https://github.com/JarlLyng/iamjarl-design) v1.18.1 tokens via
  `tokens.css` (copied to `website/tokens.css`), with no hardcoded colors/spacing/radius/type.
  Refresh both copies from `dist/css/tokens.css` of a release, and check the release notes for
  renamed tokens first.
- Display face: Outfit (OFL-1.1) for the popup's wordmark and verdict, and the site's headings
  and wordmark, through `--ij-font-display` from the identity sheet (#47). The extension
  bundles `identity.css` and `fonts/outfit-latin-wght-normal.woff2`; the site loads
  `dist/fonts/outfit.css` and `dist/identity/botlens.css` from jsDelivr, pinned with SRI.
  Body copy stays in `--ij-font-ui`.
- **No remote code**: Manifest V3 forbids it and Web Store review rejects it. All scripts
  and icons are bundled; icons are inline SVG.
- The site's FAQ exists twice: the visible `<details class="faq-item">` list and the
  `FAQPage` JSON-LD in `<head>`. The visible list is the source. Edit it, then run
  `npm run fix:faq`. Never hand-edit the JSON-LD; CI blocks the deploy on a mismatch.
- Popup logic in `popup.js`; the injected page extractor (runs same-origin, fetches
  robots.txt + raw HTML) in `content.js`.
- Adding a new permission to `manifest.json` needs a deliberate reason, because broad host
  permissions trigger slower Web Store review (we removed `<all_urls>` in v1.1.0).
