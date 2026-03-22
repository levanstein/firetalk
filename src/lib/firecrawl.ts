import type { ScrapedData } from "./types";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;
const MIN_WORD_COUNT = 100;

const SUBPAGES = ["/pricing", "/about", "/features", "/product"];

async function scrapeSinglePage(url: string): Promise<string> {
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

  if (!res.ok) return "";

  const json = await res.json();
  return json.data?.markdown || "";
}

export async function scrapeCompany(url: string): Promise<ScrapedData> {
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.replace("www.", "");
  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

  // Scrape homepage + subpages in parallel for richer data
  const pagesToScrape = [
    url,
    ...SUBPAGES.map((p) => `${baseUrl}${p}`),
  ];

  const results = await Promise.allSettled(
    pagesToScrape.map((pageUrl) => scrapeSinglePage(pageUrl))
  );

  const allContent = results
    .filter(
      (r): r is PromiseFulfilledResult<string> =>
        r.status === "fulfilled" && r.value.length > 0
    )
    .map((r) => r.value)
    .join("\n\n---\n\n");

  const wordCount = allContent.split(/\s+/).filter(Boolean).length;

  if (wordCount < MIN_WORD_COUNT) {
    throw new Error(
      `INSUFFICIENT_DATA: Not enough content found on ${url} (${wordCount} words). Try a different URL.`
    );
  }

  // Extract company name from homepage content
  const homepageResult = results[0];
  let companyName = domain;
  if (homepageResult?.status === "fulfilled") {
    // Try to extract from first heading or title-like content
    const firstLine = homepageResult.value.split("\n").find((l) => l.startsWith("#"));
    if (firstLine) {
      companyName = firstLine.replace(/^#+\s*/, "").split(/[|\-–—]/)[0]?.trim() || domain;
    }
  }

  return {
    companyName,
    url,
    domain,
    content: allContent.slice(0, 15000), // More content from multi-page scrape
    wordCount,
  };
}
