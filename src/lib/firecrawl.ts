import type { ScrapedData } from "./types";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;
const MIN_WORD_COUNT = 30;

const SUBPAGES = ["/pricing", "/about", "/features", "/product"];

async function scrapeSinglePage(url: string): Promise<string> {
  try {
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
  } catch (err) {
    // Re-throw rate limits, swallow everything else so other pages can still contribute
    if (err instanceof Error && err.message.startsWith("RATE_LIMIT")) throw err;
    console.warn(`[firecrawl] Failed to scrape ${url}:`, err);
    return "";
  }
}

export async function scrapeCompany(url: string): Promise<ScrapedData> {
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.replace("www.", "");
  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

  // 1) Scrape the provided URL first
  const homepageContent = await scrapeSinglePage(url);
  const homepageWords = homepageContent.split(/\s+/).filter(Boolean).length;

  // 2) If the homepage alone has enough content, also try subpages for richer data.
  //    If it has very little, still try subpages — they may have more.
  const subpageResults = await Promise.allSettled(
    SUBPAGES.map((p) => scrapeSinglePage(`${baseUrl}${p}`))
  );

  const subpageContent = subpageResults
    .filter(
      (r): r is PromiseFulfilledResult<string> =>
        r.status === "fulfilled" && r.value.length > 0
    )
    .map((r) => r.value);

  // Combine all content: homepage first, then subpages
  const allParts = [homepageContent, ...subpageContent].filter(Boolean);
  const allContent = allParts.join("\n\n---\n\n");
  const wordCount = allContent.split(/\s+/).filter(Boolean).length;

  // 3) If still too little, try the bare homepage (no path) as a last-resort fallback
  if (wordCount < MIN_WORD_COUNT && url !== baseUrl && url !== `${baseUrl}/`) {
    console.warn(
      `[firecrawl] Only ${wordCount} words from ${url} + subpages, trying bare homepage ${baseUrl}`
    );
    const fallback = await scrapeSinglePage(baseUrl);
    if (fallback) {
      const combined = [allContent, fallback].filter(Boolean).join("\n\n---\n\n");
      const combinedWords = combined.split(/\s+/).filter(Boolean).length;
      if (combinedWords >= MIN_WORD_COUNT) {
        return buildResult({
          url,
          domain,
          content: combined,
          wordCount: combinedWords,
          homepageContent: homepageContent || fallback,
        });
      }
    }
  }

  if (wordCount < MIN_WORD_COUNT) {
    throw new Error(
      `INSUFFICIENT_DATA: Could not gather enough content from ${domain} (only ${wordCount} words scraped). ` +
        `This can happen when a site blocks scrapers or loads content dynamically. ` +
        `Try a different URL — for example the /about or /pricing page directly.`
    );
  }

  return buildResult({
    url,
    domain,
    content: allContent,
    wordCount,
    homepageContent,
  });
}

function buildResult({
  url,
  domain,
  content,
  wordCount,
  homepageContent,
}: {
  url: string;
  domain: string;
  content: string;
  wordCount: number;
  homepageContent: string;
}): ScrapedData {
  let companyName = domain;
  const firstLine = homepageContent
    .split("\n")
    .find((l) => l.startsWith("#"));
  if (firstLine) {
    companyName =
      firstLine.replace(/^#+\s*/, "").split(/[|\-–—]/)[0]?.trim() || domain;
  }

  return {
    companyName,
    url,
    domain,
    content: content.slice(0, 15000),
    wordCount,
  };
}
