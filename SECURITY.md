# Security Policy

## Supported versions

Only the latest published version of BotLens receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use one of these private channels instead:

- **Preferred:** [GitHub Private Vulnerability Reporting](https://github.com/JarlLyng/BotLens/security/advisories/new). It is authenticated and tracked, and lets us collaborate on a fix before public disclosure.
- **Email:** `jarl@iamjarl.com`. Include "BotLens security" in the subject line.

Please include:

1. A description of the vulnerability and its impact
2. Steps to reproduce
3. Affected version(s)
4. Any suggested mitigation (optional)

## Response expectations

BotLens is maintained by an indie developer, not a team. Realistic expectations:

- **Initial acknowledgement:** within 3 working days
- **Assessment and communication of severity:** within 7 working days
- **Fix release:** depends on severity (critical issues within 14 days, others as part of the normal release cadence)

## Disclosure

Once a fix is released, we will:

1. Publish a GitHub Security Advisory with credit to the reporter (unless they prefer to remain anonymous)
2. Reference the CVE if one has been assigned
3. Include remediation notes in the release changelog

## Scope

In scope:

- The Chrome extension code (`popup.js`, `content.js`, `manifest.json`, and everything it ships)
- The marketing website (`website/`) if it exposes user data or credentials
- The web demo's server side: `api/check.js` (a Vercel Function), `lib/safe-fetch.js` (which
  fetches the address a visitor enters, so SSRF, DNS rebinding and redirect tricks count),
  `lib/analyze.js`, and the rate-limit counters it keeps in Turso (`lib/rate-limit.js`)

Out of scope:

- Vulnerabilities in third-party sites analyzed by BotLens (report those to the site owner)
- Denial-of-service issues that require unrealistic input (e.g., a 100 MB robots.txt)
- Findings that require the user to install a modified/patched version of the extension

## Privacy note

The extension collects no user data and runs entirely in the browser. The site's optional web demo fetches the address a visitor enters once, on a server, and stores neither the address nor the result; it keeps only hashed rate-limit counters. See the [privacy policy](https://botlens.iamjarl.com/privacy.html) for details.
