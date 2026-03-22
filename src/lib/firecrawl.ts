import type { ScrapedData } from "./types";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;
const MIN_WORD_COUNT = 200;

export async function scrapeCompany(url: string): Promise<ScrapedData> {
  const domain = new URL(url).hostname.replace("www.", "");

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
    }),
  });

  if (res.status === 429) {
    throw new Error(`RATE_LIMIT: Firecrawl rate limit hit for ${url}`);
  }

  if (!res.ok) {
    throw new Error(
      `SCRAPE_ERROR: Could not scrape ${url} — status ${res.status}`
    );
  }

  const json = await res.json();
  const markdown: string = json.data?.markdown || "";
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;

  if (wordCount < MIN_WORD_COUNT) {
    throw new Error(
      `INSUFFICIENT_DATA: Not enough content found on ${url} (${wordCount} words). Try a different URL.`
    );
  }

  const companyName =
    json.data?.metadata?.title?.split(/[|\-–—]/)[0]?.trim() || domain;

  return {
    companyName,
    url,
    domain,
    content: markdown.slice(0, 8000),
    wordCount,
  };
}
