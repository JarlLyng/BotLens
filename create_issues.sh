#!/bin/bash

# BotLens Issue Creation Script
# Requires GitHub CLI (gh)

echo "🚀 Starting issue creation for BotLens..."

# VERSION 2: AI Readiness
echo "Creating V2 issues..."

gh issue create \
  --title "V2: Sitemap Detection" \
  --label "enhancement,v2" \
  --body "### Description
Check for the presence of /sitemap.xml on the current origin.
### Why it matters
Sitemaps help AI crawlers find all relevant pages efficiently.
### Acceptance Criteria
- [ ] Attempt to fetch /sitemap.xml
- [ ] Confirm validity (XML check)
- [ ] Show status in the 'Technical Signals' section."

gh issue create \
  --title "V2: Structured Data (Schema.org)" \
  --label "enhancement,v2" \
  --body "### Description
Detect the presence of JSON-LD or Microdata on the page.
### Why it matters
Structured data helps LLMs understand the context (e.g., Article, Product).
### Acceptance Criteria
- [ ] Scan DOM for <script type='application/ld+json'>
- [ ] Identify basic types (Article, Organization)
- [ ] Report presence in the UI."

gh issue create \
  --title "V2: Open Graph Tags Analysis" \
  --label "enhancement,v2" \
  --body "### Description
Inspect the page for essential Open Graph meta tags.
### Why it matters
OG tags provide high-quality summaries for AI agents and social sharing.
### Acceptance Criteria
- [ ] Detect og:title, og:description, og:image
- [ ] Report missing essential tags
- [ ] Display results in 'Content Structure'."

gh issue create \
  --title "V2: Canonical Tag Validation" \
  --label "enhancement,v2" \
  --body "### Description
Detect and validate the rel=canonical tag.
### Why it matters
Prevents duplicate content issues for AI indexers.
### Acceptance Criteria
- [ ] Locate <link rel='canonical'>
- [ ] Check if the URL is absolute and matches the current domain
- [ ] Show status in UI."

# VERSION 3: Stack Detection
echo "Creating V3 issues..."

gh issue create \
  --title "V3: CMS Detection (WordPress, Shopify, Webflow)" \
  --label "enhancement,v3" \
  --body "### Description
Implement detection for popular CMS platforms.
### Why it matters
Knowing the stack helps understand potential crawling bottlenecks.
### Acceptance Criteria
- [ ] Detect WordPress (wp-content, generator tag)
- [ ] Detect Shopify (shopify.com assets)
- [ ] Detect Webflow (data-wf-page attributes)"

gh issue create \
  --title "V3: Framework Detection (React, Vue, Next.js)" \
  --label "enhancement,v3" \
  --body "### Description
Identify the front-end framework used by the site.
### Why it matters
Certain frameworks (like Next.js) are more AI-friendly out of the box.
### Acceptance Criteria
- [ ] Detect React (_reactRootContainer)
- [ ] Detect Vue (__vue__)
- [ ] Detect Next.js (__NEXT_DATA__)"

gh issue create \
  --title "V3: Hosting & CDN Detection" \
  --label "enhancement,v3" \
  --body "### Description
Identify the hosting provider or CDN (where possible via headers/DOM).
### Why it matters
Vercel/Netlify often provide better edge performance for bots.
### Acceptance Criteria
- [ ] Check for Vercel headers/scripts
- [ ] Detect Cloudflare (cf-ray headers if available in popup)
- [ ] Report in Tech Stack section."

gh issue create \
  --title "V3: Analytics Detection (GA4, Plausible)" \
  --label "enhancement,v3" \
  --body "### Description
Detect tracking scripts on the page.
### Why it matters
Provides context on the site's data collection strategy.
### Acceptance Criteria
- [ ] Detect GA4 (googletagmanager)
- [ ] Detect Plausible/Umami scripts"

gh issue create \
  --title "V3: Modular Detection Engine Design" \
  --label "architecture,v3" \
  --body "### Description
Refactor detection logic into a pattern-based engine.
### Why it matters
Makes it easy to add new technologies without bloating popup.js.
### Acceptance Criteria
- [ ] Create a 'detectors' registry
- [ ] Use regex/DOM selectors for matching
- [ ] Support async detection."

gh issue create \
  --title "V3: UI Update (Tech Stack Section)" \
  --label "ui,v3" \
  --body "### Description
Add a new section in the popup dedicated to the 'Tech Stack'.
### Why it matters
Separates technical accessibility from technology identification.
### Acceptance Criteria
- [ ] New section below 'Technical Signals'
- [ ] Clean icons for detected tech
- [ ] Follow IAMJARL design tokens."

echo "✅ All issues have been queued for creation!"
