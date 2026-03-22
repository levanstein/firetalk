# FireTalk — TODOs

## Post-MVP

- [ ] **Pre-seed popular matchups** — Generate 5-8 battles (Anthropic vs OpenAI, Slack vs Teams, Figma vs Sketch, etc.) to populate the gallery. Uses ~25% of ElevenLabs credits. P1. Depends on: ElevenLabs credits replenished. `2026-03-22`
- [ ] **Custom domain SSL** — Configure ACM certificate for firetalk.comutato.com and attach to CloudFront. Currently accessible via CloudFront URL only. P1. `2026-03-22`
- [ ] **Audience reaction SFX** — Subtle crowd sounds between debate turns (gasps after bold claims, applause after closings). Deferred due to cheesiness risk. P3. `2026-03-22`
- [ ] **S3 + DynamoDB storage** — Replace local file-based storage with S3 (audio) + DynamoDB (metadata/votes) for production persistence. Currently data lives on Lambda ephemeral storage. P1. `2026-03-22`

## Completed

- [x] **Gallery page + credit exhaustion redirect** — Gallery on landing page shows past battles. Credit exhaustion shows "limit reached" message. **Completed:** 2026-03-22
- [x] **Multi-page Firecrawl scraping** — Scrapes homepage + /pricing + /about + /features in parallel. **Completed:** 2026-03-22
- [x] **Comparison table + summary verdict** — LLM generates structured comparison table and mini-article. **Completed:** 2026-03-22
