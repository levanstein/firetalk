"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AudioBars } from "@/components/AudioBars";
import { CompanyLogo } from "@/components/CompanyLogo";

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
  const tokenIdRef = useRef(0);
  const router = useRouter();

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
      setError("Please enter valid URLs for both companies.");
      return;
    }
    if (url1 === url2) {
      setError("Enter two different company URLs.");
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
    scraping: "Researching companies...",
    scripting: "Writing the debate script...",
    voicing: "Generating AI voices...",
    done: "Battle ready!",
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-black tracking-tight mb-4">
          <span className="text-orange-500">Fire</span>
          <span className="text-blue-500">Talk</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-lg mx-auto">
          AI debate podcasts. Drop company URLs. Watch them battle.
        </p>
      </div>

      {/* Generation in progress */}
      {generating && step !== "idle" && step !== "error" ? (
        <div className="w-full max-w-2xl">
          {/* Progress stepper */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {["scraping", "scripting", "voicing", "done"].map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full transition-all ${
                    step === s
                      ? "bg-orange-500 scale-125 animate-pulse"
                      : ["scraping", "scripting", "voicing", "done"].indexOf(
                            step
                          ) > i
                        ? "bg-orange-500"
                        : "bg-gray-700"
                  }`}
                />
                {i < 3 && (
                  <div
                    className={`w-12 h-0.5 ${
                      ["scraping", "scripting", "voicing", "done"].indexOf(
                        step
                      ) > i
                        ? "bg-orange-500"
                        : "bg-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-gray-300 mb-6">
            {stepLabels[step] || "Processing..."}
          </p>

          {/* Streaming script preview */}
          {scriptTokens.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-6 max-h-64 overflow-y-auto border border-gray-800">
              <p className="text-sm text-gray-300 leading-relaxed">
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
          <div className="w-full max-w-lg space-y-4">
            <div className="flex items-center gap-3">
              <CompanyLogo url={url1} size={32} />
              <input
                type="url"
                placeholder="https://anthropic.com"
                value={url1}
                onChange={(e) => setUrl1(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
              />
            </div>

            <div className="text-center text-2xl font-black text-gray-600 vs-glow">
              VS
            </div>

            <div className="flex items-center gap-3">
              <CompanyLogo url={url2} size={32} />
              <input
                type="url"
                placeholder="https://openai.com"
                value={url2}
                onChange={(e) => setUrl2(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-lg text-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {generating ? "Generating..." : "🔥 Generate Battle"}
            </button>

            <button
              onClick={() => {
                setUrl1("https://anthropic.com");
                setUrl2("https://openai.com");
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-300 transition"
            >
              Try: Anthropic vs OpenAI
            </button>
          </div>

          {/* Powered by footer */}
          <footer className="mt-16 text-center text-xs text-gray-600">
            Built with{" "}
            <a
              href="https://firecrawl.dev"
              className="text-orange-500 hover:underline"
              target="_blank"
            >
              Firecrawl
            </a>{" "}
            +{" "}
            <a
              href="https://elevenlabs.io"
              className="text-blue-500 hover:underline"
              target="_blank"
            >
              ElevenLabs
            </a>{" "}
            for{" "}
            <a
              href="https://hacks.elevenlabs.io"
              className="hover:underline"
              target="_blank"
            >
              #ElevenHacks
            </a>
          </footer>
        </>
      )}
    </main>
  );
}
