# FireTalk — TODOs

## Post-MVP v2

- [ ] **Pre-seed featured battles** — Generate 5-10 battles (Slack vs Teams, Figma vs Canva, ChatGPT vs Claude, etc.) to populate the featured gallery. Requires running the generation pipeline for each. P1. `2026-03-23`
- [ ] **S3 storage migration** — Replace local file-based storage with S3 for audio + debate JSON. Required for featured battles to persist across Lambda cold starts. P1. `2026-03-23`
- [ ] **Audience reaction SFX** — Subtle crowd sounds between debate turns (gasps after bold claims, applause after closings). Deferred due to cheesiness risk. P3. `2026-03-22`
- [ ] **Mailchimp DNS** — Configure subdomain DNS for email delivery via Mailchimp. P2. `2026-03-23`

## Completed

- [x] **Custom domain SSL** — ACM certificate for firetalk.comutato.com + CloudFront alias. **Completed:** 2026-03-23
- [x] **Favicon** — SVG favicon with flame-in-speech-bubble logo. **Completed:** 2026-03-23
- [x] **Fix scraping failures** — Resilient scraping with lower thresholds, fallback to bare homepage, better error messages. **Completed:** 2026-03-23
- [x] **Multi-source scraping** — Firecrawl search finds comparison blogs/reviews, scrapes top 2-3, combines with product website data. Sources tracked with metadata. **Completed:** 2026-03-23
- [x] **Product name input** — Supports product names (e.g. "Slack") not just URLs. Firecrawl search resolves names to websites. **Completed:** 2026-03-23
- [x] **Light theme redesign** — Firecrawl.dev-inspired: off-white background, Inter font, clean cards, dot-grid pattern, section markers. **Completed:** 2026-03-23
- [x] **Loading UX overhaul** — Step-by-step progress with emojis and source details ("Searching for reviews...", "Found 3 sources"). **Completed:** 2026-03-23
- [x] **Sources panel** — Battle page shows website + review sources with logos, excerpts, links. **Completed:** 2026-03-23
- [x] **Battle intro animation** — Logos slide in, VS flashes, content fades up. **Completed:** 2026-03-23
- [x] **SEO metadata** — og:title, og:description, og:image, twitter cards for battle pages. **Completed:** 2026-03-23
- [x] **OG share card images** — Auto-generated social preview images at /api/og/[slug]. **Completed:** 2026-03-23
- [x] **Rotating suggestions** — "Try: Slack vs Microsoft Teams" clickable suggestions on landing page. **Completed:** 2026-03-23
- [x] **Debate source citations** — Claude prompt updated to cite independent review sources in the debate. **Completed:** 2026-03-23
- [x] **Gallery page + credit exhaustion redirect** — Gallery on landing page shows past battles. Credit exhaustion shows "limit reached" message. **Completed:** 2026-03-22
- [x] **Multi-page Firecrawl scraping** — Scrapes homepage + /pricing + /about + /features in parallel. **Completed:** 2026-03-22
- [x] **Comparison table + summary verdict** — LLM generates structured comparison table and mini-article. **Completed:** 2026-03-22
