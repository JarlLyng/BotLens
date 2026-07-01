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

- **Preferred:** [GitHub Private Vulnerability Reporting](https://github.com/JarlLyng/BotLens/security/advisories/new) — authenticated, tracked, and lets us collaborate on a fix before public disclosure.
- **Email:** `jarl@iamjarl.com` — include "BotLens security" in the subject line.

Please include:

1. A description of the vulnerability and its impact
2. Steps to reproduce
3. Affected version(s)
4. Any suggested mitigation (optional)

## Response expectations

BotLens is maintained by an indie developer, not a team. Realistic expectations:

- **Initial acknowledgement:** within 3 working days
- **Assessment and communication of severity:** within 7 working days
- **Fix release:** depends on severity — critical issues within 14 days, others as part of the normal release cadence

## Disclosure

Once a fix is released, we will:

1. Publish a GitHub Security Advisory with credit to the reporter (unless they prefer to remain anonymous)
2. Reference the CVE if one has been assigned
3. Include remediation notes in the release changelog

## Scope

In scope:

- The Chrome extension code (`popup.js`, `content.js`, `manifest.json`, and everything it ships)
- The marketing website (`website/`) if it exposes user data or credentials

Out of scope:

- Vulnerabilities in third-party sites analyzed by BotLens (report those to the site owner)
- Denial-of-service issues that require unrealistic input (e.g., a 100 MB robots.txt)
- Findings that require the user to install a modified/patched version of the extension

## Privacy note

BotLens collects no user data — it runs entirely in the browser. See the [privacy policy](https://botlens.iamjarl.com/privacy.html) for details.
