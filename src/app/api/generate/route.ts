import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { scrapeCompany, resolveInput } from "@/lib/firecrawl";
import { generateDebateScript } from "@/lib/debate";
import { generateAllAudio } from "@/lib/elevenlabs";
import { saveDebate, saveAudioFile } from "@/lib/storage";
import type { Debate, Source } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/*
 * SSE PIPELINE (v2 — multi-source):
 *   POST { input1, input2 } (URL or product name)
 *     → event: step { resolving }    (if product name)
 *     → event: step { scraping, detail }
 *     → event: step { searching }    (review search)
 *     → event: step { sources, count }
 *     → event: step { scripting }
 *     → [Claude stream] → event: script { token }
 *     → event: step { voicing }
 *     → [ElevenLabs x6-8] + [save]
 *     → event: done { slug }
 */

function sseEvent(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

function isUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Support both old format (url1/url2) and new format (input1/input2)
  const input1 = body.input1 || body.url1;
  const input2 = body.input2 || body.url2;

  if (!input1 || !input2) {
    return new Response("Both products are required", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(type, data)));
        } catch {
          // stream closed
        }
      };

      try {
        // Step 0: Resolve product names to URLs if needed
        let url1 = input1;
        let url2 = input2;
        let name1 = "";
        let name2 = "";

        if (!isUrl(input1) || !isUrl(input2)) {
          send("step", { step: "resolving", detail: "Finding product websites..." });
        }

        if (!isUrl(input1)) {
          const resolved = await resolveInput(input1);
          url1 = resolved.url;
          name1 = resolved.name;
          send("step", { step: "resolving", detail: `Found ${resolved.name}` });
        }
        if (!isUrl(input2)) {
          const resolved = await resolveInput(input2);
          url2 = resolved.url;
          name2 = resolved.name;
          send("step", { step: "resolving", detail: `Found ${resolved.name}` });
        }

        // Step 1: Scrape both companies in parallel (with multi-source)
        send("step", { step: "scraping", detail: "Scraping product websites..." });

        let otherName1 = name2;
        let otherName2 = name1;
        try { otherName1 = otherName1 || new URL(url2).hostname.replace("www.", ""); } catch { otherName1 = input2; }
        try { otherName2 = otherName2 || new URL(url1).hostname.replace("www.", ""); } catch { otherName2 = input1; }

        const [dataA, dataB] = await Promise.all([
          scrapeCompany(url1, otherName1, (msg) => send("step", { step: "scraping", detail: msg })),
          scrapeCompany(url2, otherName2, (msg) => send("step", { step: "scraping", detail: msg })),
        ]);

        // Report sources found
        const allSources = [...(dataA.sources || []), ...(dataB.sources || [])];
        const reviewSources = allSources.filter((s) => s.type === "review");
        if (reviewSources.length > 0) {
          send("step", {
            step: "sources",
            detail: `Found ${reviewSources.length} review source${reviewSources.length > 1 ? "s" : ""}`,
            sources: reviewSources.map((s) => ({ name: s.name, domain: s.domain })),
          });
        }

        // Step 2: Generate debate script (stream tokens to client)
        send("step", { step: "scripting", detail: "Writing product analysis..." });
        const script = await generateDebateScript(dataA, dataB, (token) => {
          send("script", { token });
        });

        // Step 3: Generate audio for all turns
        send("step", { step: "voicing", detail: "Generating audio with ElevenLabs..." });
        const companyASlug = script.companyA.name.toLowerCase().replace(/\s+/g, "-");
        const audioBuffers = await generateAllAudio(script.turns, companyASlug);

        // Step 4: Save everything
        const slug = nanoid(6);
        const audioUrls: string[] = [];
        for (let i = 0; i < audioBuffers.length; i++) {
          const savedUrl = await saveAudioFile(slug, i, audioBuffers[i]!);
          audioUrls.push(savedUrl);
        }

        const debate: Debate = {
          slug,
          companyA: {
            name: script.companyA.name,
            url: url1,
            domain: dataA.domain,
            logoUrl: `https://www.google.com/s2/favicons?sz=128&domain=${dataA.domain}`,
          },
          companyB: {
            name: script.companyB.name,
            url: url2,
            domain: dataB.domain,
            logoUrl: `https://www.google.com/s2/favicons?sz=128&domain=${dataB.domain}`,
          },
          transcript: script.turns,
          bestQuoteA: script.bestQuoteA,
          bestQuoteB: script.bestQuoteB,
          comparison: script.comparison || [],
          summary: script.summary || "",
          audioUrls,
          sources: allSources,
          votesA: 0,
          votesB: 0,
          createdAt: new Date().toISOString(),
          status: "complete",
        };

        await saveDebate(debate);
        send("done", { slug });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";

        if (message.includes("QUOTA_EXHAUSTED")) {
          send("error", { message: "Voice generation limit reached — try again later!" });
        } else if (message.includes("INSUFFICIENT_DATA")) {
          send("error", { message });
        } else if (message.includes("RESOLVE_FAILED")) {
          send("error", { message });
        } else if (message.includes("SCRAPE_ERROR")) {
          send("error", { message });
        } else if (message.includes("RATE_LIMIT")) {
          send("error", { message: "Too many requests. Try again in a moment." });
        } else {
          console.error("[generate] Unexpected error:", message);
          send("error", { message: "Something went wrong. Please try again." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
