# FireTalk — AI Product Battles

Compare any two products with AI-powered analysis. Drop two URLs, get an audio breakdown, comparison table, and verdict.

**Live:** [d88sat15zs2a1.cloudfront.net](https://d88sat15zs2a1.cloudfront.net) · **Custom domain:** firetalk.comutato.com (pending DNS)

Built for [ElevenHacks](https://hacks.elevenlabs.io) with [Firecrawl](https://firecrawl.dev) + [ElevenLabs](https://elevenlabs.io).

## How It Works

1. Enter two product URLs (e.g., `anthropic.com` vs `openai.com`)
2. FireTalk scrapes both sites (homepage + /pricing + /about + /features)
3. Claude generates an analytical comparison script via AWS Bedrock
4. ElevenLabs creates a two-voice audio breakdown
5. You get: audio player with waveform, comparison table, summary verdict, and voting

## Tech Stack

- **Frontend:** Next.js 16 + Tailwind CSS
- **LLM:** Claude Sonnet 4 via AWS Bedrock
- **Scraping:** Firecrawl API (multi-page)
- **Voice:** ElevenLabs TTS (Daniel + Sarah voices)
- **Infra:** AWS Lambda + CloudFront + S3 via SST
- **DNS:** Namecheap API (automated)

## Local Development

```bash
bun install
cp .env.local.example .env.local  # add your API keys
bun run dev
```

Required environment variables:
- `FIRECRAWL_API_KEY` — from [firecrawl.dev](https://firecrawl.dev)
- `ELEVENLABS_API_KEY` — from [elevenlabs.io](https://elevenlabs.io)
- `AWS_PROFILE` — AWS profile with Bedrock access (default: `abm-setup`)

## Deploy

```bash
AWS_PROFILE=abm-setup npx sst deploy --stage production
```

## Project Structure

```
src/
  app/
    page.tsx                — Landing page (URL inputs + gallery)
    battle/[slug]/          — Battle page (player, comparison, vote)
    api/generate/           — SSE pipeline (scrape → script → voice)
    api/vote/               — Vote endpoint
    api/debate/[slug]/      — Get battle data
    api/gallery/            — List all battles
  components/
    AudioBars.tsx           — Animated audio visualizer
    CompanyLogo.tsx         — Google Favicons with initial fallback
  lib/
    firecrawl.ts            — Multi-page Firecrawl scraping
    debate.ts               — Claude Bedrock analytical prompt
    elevenlabs.ts           — ElevenLabs TTS with p-limit(2)
    storage.ts              — File-based storage (local dev)
    types.ts                — TypeScript interfaces
```

## Credits

- [Firecrawl](https://firecrawl.dev) — web scraping for AI
- [ElevenLabs](https://elevenlabs.io) — text-to-speech
- [Anthropic Claude](https://anthropic.com) — AI analysis via AWS Bedrock
