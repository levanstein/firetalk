"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CompanyLogo } from "@/components/CompanyLogo";
import type { Debate } from "@/lib/types";

type Step = "idle" | "scraping" | "scripting" | "voicing" | "done" | "error";

interface ScriptToken {
  text: string;
  id: number;
}

export default function Home() {
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [scriptTokens, setScriptTokens] = useState<ScriptToken[]>([]);
  const [generating, setGenerating] = useState(false);
  const [gallery, setGallery] = useState<Debate[]>([]);
  const tokenIdRef = useRef(0);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((data) => setGallery(data.debates || []))
      .catch(() => {});
  }, []);

  const isValidUrl = (s: string) => {
    try {
      new URL(s);
      return true;
    } catch {
      return false;
    }
  };

  const handleGenerate = async () => {
    if (!isValidUrl(url1) || !isValidUrl(url2)) {
      setError("Please enter valid URLs for both products.");
      return;
    }
    if (url1 === url2) {
      setError("Enter two different product URLs.");
      return;
    }

    setGenerating(true);
    setStep("scraping");
    setError("");
    setScriptTokens([]);
    tokenIdRef.current = 0;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url1, url2 }),
      });

      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "Unknown error");
        throw new Error(errBody);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          if (jsonStr === "[DONE]") continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "step") {
              setStep(event.step as Step);
            } else if (event.type === "script") {
              const id = tokenIdRef.current++;
              setScriptTokens((prev) => [...prev, { text: event.token, id }]);
            } else if (event.type === "done") {
              setStep("done");
              setTimeout(() => router.push(`/battle/${event.slug}`), 500);
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (err) {
      setStep("error");
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
      setGenerating(false);
    }
  };

  const stepLabels: Record<string, string> = {
    scraping: "Analyzing products...",
    scripting: "Writing product analysis...",
    voicing: "Generating audio breakdown...",
    done: "Product Battle ready!",
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-4 pt-20 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-3">
            <span className="text-orange-500 fire-glow-text">Fire</span>
            <span className="text-zinc-100">Talk</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-md mx-auto">
            AI-powered product comparisons. Drop two URLs. Get an audio breakdown, comparison table, and verdict.
          </p>
        </div>

        {/* Generation in progress */}
        {generating && step !== "idle" && step !== "error" ? (
          <div className="w-full max-w-2xl">
            {/* Company logos during generation */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <CompanyLogo url={url1} size={48} />
              <span className="text-2xl font-black text-zinc-600">vs</span>
              <CompanyLogo url={url2} size={48} />
            </div>

            {/* Progress stepper */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {["scraping", "scripting", "voicing", "done"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      step === s
                        ? "bg-orange-500 scale-125 animate-pulse"
                        : ["scraping", "scripting", "voicing", "done"].indexOf(step) > i
                          ? "bg-orange-500"
                          : "bg-zinc-700"
                    }`}
                  />
                  {i < 3 && (
                    <div
                      className={`w-8 h-0.5 ${
                        ["scraping", "scripting", "voicing", "done"].indexOf(step) > i
                          ? "bg-orange-500"
                          : "bg-zinc-700"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            <p className="text-center text-zinc-300 text-sm mb-4">
              {stepLabels[step] || "Processing..."}
            </p>

            {/* Streaming script preview */}
            {scriptTokens.length > 0 && (
              <div className="bg-zinc-900 rounded-lg p-5 max-h-48 overflow-y-auto border border-zinc-800">
                <p className="text-sm text-zinc-400 leading-relaxed font-mono">
                  {scriptTokens.map((t) => (
                    <span key={t.id} className="typing-word inline">
                      {t.text}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* URL inputs */}
            <div className="w-full max-w-lg space-y-3">
              <div className="flex items-center gap-3">
                {url1 && <CompanyLogo url={url1} size={36} />}
                <input
                  type="url"
                  placeholder="https://product-a.com"
                  value={url1}
                  onChange={(e) => setUrl1(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/20 transition"
                />
              </div>

              <div className="text-center text-xl font-black text-zinc-600 py-0.5">
                vs
              </div>

              <div className="flex items-center gap-3">
                {url2 && <CompanyLogo url={url2} size={36} />}
                <input
                  type="url"
                  placeholder="https://product-b.com"
                  value={url2}
                  onChange={(e) => setUrl2(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/20 transition"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all fire-glow"
              >
                Generate Product Battle
              </button>

              <button
                onClick={() => {
                  setUrl1("https://anthropic.com");
                  setUrl2("https://openai.com");
                }}
                className="w-full py-2 text-sm text-zinc-500 hover:text-orange-400 transition"
              >
                Try: Anthropic vs OpenAI
              </button>
            </div>
          </>
        )}
      </div>

      {/* Gallery Section */}
      {gallery.length > 0 && !generating && (
        <section className="px-4 pb-16 max-w-4xl mx-auto">
          <h2 className="text-lg font-semibold text-zinc-300 mb-4">
            Recent Product Battles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gallery.map((battle) => (
              <a
                key={battle.slug}
                href={`/battle/${battle.slug}`}
                className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition group"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CompanyLogo url={battle.companyA.url} size={28} />
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {battle.companyA.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-zinc-600 shrink-0">
                  vs
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {battle.companyB.name}
                  </span>
                  <CompanyLogo url={battle.companyB.url} size={28} />
                </div>
                <svg
                  className="w-4 h-4 text-zinc-600 group-hover:text-orange-500 transition shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="px-4 pb-8 text-center">
        <div className="flex items-center justify-center gap-4 text-sm text-zinc-500">
          <span>Built with</span>
          <a
            href="https://firecrawl.dev"
            target="_blank"
            className="flex items-center gap-1.5 hover:text-orange-400 transition"
          >
            <img
              src="https://www.google.com/s2/favicons?sz=32&domain=firecrawl.dev"
              alt="Firecrawl"
              className="h-4 w-4 rounded-sm"
            />
            Firecrawl
          </a>
          <span>+</span>
          <a
            href="https://elevenlabs.io"
            target="_blank"
            className="flex items-center gap-1.5 hover:text-orange-400 transition"
          >
            <img
              src="https://www.google.com/s2/favicons?sz=32&domain=elevenlabs.io"
              alt="ElevenLabs"
              className="h-4 w-4 rounded-sm"
            />
            ElevenLabs
          </a>
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          <a href="https://hacks.elevenlabs.io" target="_blank" className="hover:text-zinc-400 transition">
            #ElevenHacks
          </a>
        </p>
      </footer>
    </main>
  );
}
