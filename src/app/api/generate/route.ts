import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { scrapeCompany } from "@/lib/firecrawl";
import { generateDebateScript } from "@/lib/debate";
import { generateAllAudio } from "@/lib/elevenlabs";
import { saveDebate, saveAudioFile } from "@/lib/storage";
import type { Debate } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/*
 * SSE PIPELINE:
 *   POST { url1, url2 }
 *     → event: step { scraping }
 *     → [Firecrawl x2 parallel]
 *     → event: step { scripting }
 *     → [Claude stream] → event: script { token }
 *     → event: step { voicing }
 *     → [ElevenLabs x6-8, p-limit(3)] + [S3 upload]
 *     → event: done { slug }
 */

function sseEvent(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

export async function POST(req: NextRequest) {
  const { url1, url2 } = await req.json();

  if (!url1 || !url2) {
    return new Response("Both URLs are required", { status: 400 });
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
        // Step 1: Scrape both companies in parallel
        send("step", { step: "scraping" });
        const [dataA, dataB] = await Promise.all([
          scrapeCompany(url1),
          scrapeCompany(url2),
        ]);

        // Step 2: Generate debate script (stream tokens to client)
        send("step", { step: "scripting" });
        const script = await generateDebateScript(dataA, dataB, (token) => {
          send("script", { token });
        });

        // Step 3: Generate audio for all turns
        send("step", { step: "voicing" });
        const companyASlug = script.companyA.name
          .toLowerCase()
          .replace(/\s+/g, "-");
        const audioBuffers = await generateAllAudio(
          script.turns,
          companyASlug
        );

        // Step 4: Save everything
        const slug = nanoid(6);
        const audioUrls: string[] = [];
        for (let i = 0; i < audioBuffers.length; i++) {
          const url = await saveAudioFile(slug, i, audioBuffers[i]!);
          audioUrls.push(url);
        }

        const debate: Debate = {
          slug,
          companyA: {
            name: script.companyA.name,
            url: url1,
            domain: dataA.domain,
            logoUrl: `https://logo.clearbit.com/${dataA.domain}`,
          },
          companyB: {
            name: script.companyB.name,
            url: url2,
            domain: dataB.domain,
            logoUrl: `https://logo.clearbit.com/${dataB.domain}`,
          },
          transcript: script.turns,
          bestQuoteA: script.bestQuoteA,
          bestQuoteB: script.bestQuoteB,
          audioUrls,
          votesA: 0,
          votesB: 0,
          createdAt: new Date().toISOString(),
          status: "complete",
        };

        await saveDebate(debate);
        send("done", { slug });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";

        if (message.includes("QUOTA_EXHAUSTED")) {
          send("error", {
            message: "Voice generation limit reached — try again later!",
          });
        } else if (message.includes("INSUFFICIENT_DATA")) {
          send("error", { message });
        } else if (message.includes("SCRAPE_ERROR")) {
          send("error", { message });
        } else if (message.includes("RATE_LIMIT")) {
          send("error", { message: "Too many requests. Try again in a moment." });
        } else {
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
