import type { ScrapedData, Source } from "./types";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;
const MIN_WORD_COUNT = 30;
const SUBPAGES = ["/pricing", "/about", "/features", "/product"];

async function scrapeSinglePage(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({ url, formats: ["markdown"] }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status === 429) {
      throw new Error(`RATE_LIMIT: Firecrawl rate limit hit for ${url}`);
    }

    if (!res.ok) return "";

    const json = await res.json();
    return json.data?.markdown || "";
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("RATE_LIMIT")) throw err;
    console.warn(`[firecrawl] Failed to scrape ${url}:`, err);
    return "";
  }
}

async function firecrawlSearch(query: string, limit = 3): Promise<{ url: string; title: string }[]> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({ query, limit }),
    });

    if (!res.ok) return [];

    const json = await res.json();
    return (json.data || []).map((r: { url: string; title: string }) => ({
      url: r.url,
      title: r.title || "",
    }));
  } catch {
    return [];
  }
}

function isUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function extractExcerpt(markdown: string, maxLen = 200): string {
  const lines = markdown.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("!["));
  const text = lines.slice(0, 5).join(" ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`]/g, "");
  return text.slice(0, maxLen) + (text.length > maxLen ? "..." : "");
}

export async function resolveInput(input: string): Promise<{ url: string; name: string }> {
  if (isUrl(input)) {
    return { url: input, name: extractDomain(input) };
  }

  const results = await firecrawlSearch(`${input} official site`, 1);
  if (results.length === 0) {
    throw new Error(`RESOLVE_FAILED: Could not find a website for "${input}". Try entering a URL instead.`);
  }

  const name = results[0]!.title.split(/[|\-–—]/)[0]?.trim() || input;
  return { url: results[0]!.url, name };
}

export async function scrapeCompany(
  input: string,
  otherProduct?: string,
  onStep?: (msg: string) => void
): Promise<ScrapedData> {
  const sources: Source[] = [];

  // 1) Resolve input to URL if it's a product name
  let url: string;
  let resolvedName: string;

  if (isUrl(input)) {
    url = input;
    resolvedName = extractDomain(input);
  } else {
    onStep?.(`Searching for ${input}...`);
    const resolved = await resolveInput(input);
    url = resolved.url;
    resolvedName = resolved.name;
  }

  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.replace("www.", "");
  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

  // 2) Scrape product website (homepage + subpages in parallel)
  onStep?.(`Scraping ${domain}...`);
  const homepageContent = await scrapeSinglePage(url);

  const subpageResults = await Promise.allSettled(
    SUBPAGES.map((p) => scrapeSinglePage(`${baseUrl}${p}`))
  );

  const subpageContent = subpageResults
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled" && r.value.length > 0)
    .map((r) => r.value);

  const siteContent = [homepageContent, ...subpageContent].filter(Boolean).join("\n\n---\n\n");

  if (siteContent.length > 0) {
    sources.push({
      name: resolvedName || domain,
      url,
      domain,
      excerpt: extractExcerpt(homepageContent || siteContent),
      type: "website",
    });
  }

  // 3) Search for review/comparison content
  if (otherProduct) {
    onStep?.(`Searching for reviews...`);
    const reviewQuery = `${resolvedName || domain} vs ${otherProduct} reviews comparison`;
    const reviewResults = await firecrawlSearch(reviewQuery, 3);

    // Filter out the product's own site and scrape top 2 review blogs
    const externalReviews = reviewResults.filter(
      (r) => !r.url.includes(domain) && !r.url.includes("reddit.com") && !r.url.includes("g2.com")
    );

    if (externalReviews.length > 0) {
      onStep?.(`Found ${externalReviews.length} review source${externalReviews.length > 1 ? "s" : ""}...`);

      const reviewScrapes = await Promise.allSettled(
        externalReviews.slice(0, 2).map((r) => scrapeSinglePage(r.url).then((md) => ({ ...r, markdown: md })))
      );

      for (const result of reviewScrapes) {
        if (result.status === "fulfilled" && result.value.markdown.length > 100) {
          const r = result.value;
          const reviewDomain = extractDomain(r.url);
          sources.push({
            name: r.title.split(/[|\-–—]/)[0]?.trim() || reviewDomain,
            url: r.url,
            domain: reviewDomain,
            excerpt: extractExcerpt(r.markdown),
            type: "review",
          });
        }
      }
    }
  }

  // Combine all content
  const reviewContent = sources
    .filter((s) => s.type === "review")
    .map((s) => `[Review from ${s.name}]\n${s.excerpt}`)
    .join("\n\n---\n\n");

  const allContent = [siteContent, reviewContent].filter(Boolean).join("\n\n=== INDEPENDENT REVIEWS ===\n\n");
  const wordCount = allContent.split(/\s+/).filter(Boolean).length;

  // Fallback 1: try bare homepage if too little content
  let finalContent = allContent;
  let finalWordCount = wordCount;
  let fallbackHomepage = homepageContent;

  if (finalWordCount < MIN_WORD_COUNT && url !== baseUrl && url !== `${baseUrl}/`) {
    const fallback = await scrapeSinglePage(baseUrl);
    if (fallback) {
      finalContent = [finalContent, fallback].filter(Boolean).join("\n\n---\n\n");
      finalWordCount = finalContent.split(/\s+/).filter(Boolean).length;
      if (!fallbackHomepage) fallbackHomepage = fallback;
    }
  }

  // Fallback 2: if still too little, use Firecrawl search to find content ABOUT the product
  if (finalWordCount < MIN_WORD_COUNT) {
    onStep?.(`${domain} blocked scraping, searching for alternative content...`);
    const searchResults = await firecrawlSearch(`${resolvedName || domain} product features pricing review`, 2);
    const altResults = searchResults.filter((r) => !r.url.includes(domain));

    for (const alt of altResults) {
      const altContent = await scrapeSinglePage(alt.url);
      if (altContent && altContent.split(/\s+/).filter(Boolean).length > 50) {
        finalContent = [finalContent, altContent].filter(Boolean).join("\n\n---\n\n");
        finalWordCount = finalContent.split(/\s+/).filter(Boolean).length;
        if (!fallbackHomepage) fallbackHomepage = altContent;
        sources.push({
          name: alt.title.split(/[|\-–—]/)[0]?.trim() || extractDomain(alt.url),
          url: alt.url,
          domain: extractDomain(alt.url),
          excerpt: extractExcerpt(altContent),
          type: "review",
        });
        if (finalWordCount >= MIN_WORD_COUNT) break;
      }
    }
  }

  if (finalWordCount < MIN_WORD_COUNT) {
    throw new Error(
      `INSUFFICIENT_DATA: Could not gather enough content about ${resolvedName || domain} (only ${finalWordCount} words found). ` +
      `This site blocks scrapers and no alternative content was found. ` +
      `Try a different product or enter a specific URL like a /pricing or /about page.`
    );
  }

  // Extract company name from homepage
  let companyName = resolvedName || domain;
  const firstLine = (fallbackHomepage || siteContent).split("\n").find((l) => l.startsWith("#"));
  if (firstLine) {
    companyName = firstLine.replace(/^#+\s*/, "").split(/[|\-–—]/)[0]?.trim() || companyName;
  }

  return {
    companyName,
    url,
    domain,
    content: finalContent.slice(0, 20000),
    wordCount: finalWordCount,
    sources,
  };
}

function buildResult({
  url, domain, content, wordCount, homepageContent, sources,
}: {
  url: string; domain: string; content: string; wordCount: number; homepageContent: string; sources: Source[];
}): ScrapedData {
  let companyName = domain;
  const firstLine = homepageContent.split("\n").find((l) => l.startsWith("#"));
  if (firstLine) {
    companyName = firstLine.replace(/^#+\s*/, "").split(/[|\-–—]/)[0]?.trim() || domain;
  }

  return { companyName, url, domain, content: content.slice(0, 20000), wordCount, sources };
}
