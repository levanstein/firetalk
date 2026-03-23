"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CompanyLogo } from "@/components/CompanyLogo";
import type { Debate } from "@/lib/types";

type Step = "idle" | "resolving" | "scraping" | "sources" | "scripting" | "voicing" | "done" | "error";

interface ScriptToken {
  text: string;
  id: number;
}

const SUGGESTIONS = [
  { a: "Slack", b: "Microsoft Teams" },
  { a: "Figma", b: "Canva" },
  { a: "Notion", b: "Obsidian" },
  { a: "ChatGPT", b: "Claude" },
  { a: "Vercel", b: "Netlify" },
  { a: "Stripe", b: "PayPal" },
  { a: "Linear", b: "Jira" },
  { a: "Spotify", b: "Apple Music" },
];

export default function Home() {
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [stepDetail, setStepDetail] = useState("");
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

  const handleGenerate = async () => {
    if (!input1.trim() || !input2.trim()) {
      setError("Enter two products to compare — URLs or product names.");
      return;
    }
    if (input1.trim() === input2.trim()) {
      setError("Enter two different products.");
      return;
    }

    setGenerating(true);
    setStep("scraping");
    setStepDetail("Starting...");
    setError("");
    setScriptTokens([]);
    tokenIdRef.current = 0;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input1: input1.trim(), input2: input2.trim() }),
      });

      if (!res.ok || !res.body) {
        throw new Error(await res.text().catch(() => "Unknown error"));
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
              if (event.detail) setStepDetail(event.detail);
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
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setGenerating(false);
    }
  };

  const stepLabels: Record<string, { label: string; emoji: string }> = {
    resolving: { label: "Finding products...", emoji: "🔍" },
    scraping: { label: "Scraping product data...", emoji: "🔥" },
    sources: { label: "Analyzing reviews...", emoji: "📰" },
    scripting: { label: "Writing debate script...", emoji: "✍️" },
    voicing: { label: "Generating voices with ElevenLabs...", emoji: "🎙️" },
    done: { label: "Product Battle ready!", emoji: "🏆" },
  };

  const currentStep = stepLabels[step];
  const featuredBattles = gallery.filter((d) => d.featured);
  const recentBattles = gallery.filter((d) => !d.featured);
  const displayBattles = featuredBattles.length > 0 ? featuredBattles : recentBattles;

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-4 pt-20 pb-16 dot-grid">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-3">
            <span className="text-orange-500 fire-glow-text">Fire</span>
            <span className="text-gray-900">Talk</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-md mx-auto">
            AI-powered product battles. Drop two products — get an audio debate, comparison table, and verdict powered by real internet data.
          </p>
        </div>

        {/* Generation in progress */}
        {generating && step !== "idle" && step !== "error" ? (
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            {/* Progress stepper */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {["resolving", "scraping", "scripting", "voicing", "done"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      step === s
                        ? "bg-orange-500 scale-125 animate-pulse"
                        : ["resolving", "scraping", "sources", "scripting", "voicing", "done"].indexOf(step) > ["resolving", "scraping", "scripting", "voicing", "done"].indexOf(s)
                          ? "bg-orange-500"
                          : "bg-gray-300"
                    }`}
                  />
                  {i < 4 && (
                    <div
                      className={`w-8 h-0.5 ${
                        ["resolving", "scraping", "sources", "scripting", "voicing", "done"].indexOf(step) > ["resolving", "scraping", "scripting", "voicing", "done"].indexOf(s)
                          ? "bg-orange-500"
                          : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="text-center mb-4">
              <span className="text-2xl mr-2">{currentStep?.emoji}</span>
              <span className="text-gray-700 font-medium">{currentStep?.label || "Processing..."}</span>
            </div>

            {stepDetail && (
              <p className="text-center text-gray-400 text-sm mb-4">{stepDetail}</p>
            )}

            {/* Streaming script preview */}
            {scriptTokens.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-5 max-h-48 overflow-y-auto border border-gray-200">
                <p className="text-sm text-gray-500 leading-relaxed font-mono">
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
            {/* Product inputs */}
            <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Product name or URL (e.g. Slack, https://figma.com)"
                  value={input1}
                  onChange={(e) => setInput1(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/20 transition"
                />

                <div className="text-center text-xl font-black text-gray-300 py-0.5">
                  vs
                </div>

                <input
                  type="text"
                  placeholder="Product name or URL (e.g. Teams, https://notion.so)"
                  value={input2}
                  onChange={(e) => setInput2(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/20 transition"
                />

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all fire-glow"
                >
                  Generate Product Battle
                </button>
              </div>

              {/* Rotating suggestions */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-gray-400">Try:</span>
                {SUGGESTIONS.slice(0, 4).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput1(s.a); setInput2(s.b); }}
                    className="text-xs text-gray-500 hover:text-orange-500 transition px-2 py-1 rounded-lg hover:bg-orange-50"
                  >
                    {s.a} vs {s.b}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Featured / Gallery Section */}
      {displayBattles.length > 0 && !generating && (
        <section className="px-4 pb-16 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
              [ {featuredBattles.length > 0 ? "Featured" : "Recent"} ]
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayBattles.map((battle) => (
              <a
                key={battle.slug}
                href={`/battle/${battle.slug}`}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-sm transition group"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CompanyLogo url={battle.companyA.url} size={28} />
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {battle.companyA.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-400 shrink-0">vs</span>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {battle.companyB.name}
                  </span>
                  <CompanyLogo url={battle.companyB.url} size={28} />
                </div>
                <svg
                  className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition shrink-0"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="px-4 pb-8 text-center">
        <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
          <span>Built with</span>
          <a href="https://firecrawl.dev" target="_blank" className="flex items-center gap-1.5 hover:text-orange-500 transition">
            <img src="https://www.google.com/s2/favicons?sz=32&domain=firecrawl.dev" alt="Firecrawl" className="h-4 w-4 rounded-sm" />
            Firecrawl
          </a>
          <span>+</span>
          <a href="https://elevenlabs.io" target="_blank" className="flex items-center gap-1.5 hover:text-orange-500 transition">
            <img src="https://www.google.com/s2/favicons?sz=32&domain=elevenlabs.io" alt="ElevenLabs" className="h-4 w-4 rounded-sm" />
            ElevenLabs
          </a>
        </div>
        <p className="text-xs text-gray-300 mt-2">
          <a href="https://hacks.elevenlabs.io" target="_blank" className="hover:text-gray-500 transition">
            #ElevenHacks
          </a>
        </p>
      </footer>
    </main>
  );
}
