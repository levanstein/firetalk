"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Debate } from "@/lib/types";
import { CompanyLogo } from "@/components/CompanyLogo";
import { AudioBars } from "@/components/AudioBars";

export function BattleClient({ debate }: { debate: Debate }) {
  const [playing, setPlaying] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(-1);
  const [votesA, setVotesA] = useState(debate.votesA);
  const [votesB, setVotesB] = useState(debate.votesB);
  const [hasVoted, setHasVoted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const voted = localStorage.getItem(`voted:${debate.slug}`);
    if (voted) setHasVoted(true);
  }, [debate.slug]);

  const totalVotes = votesA + votesB;
  const pctA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;

  const playSequential = useCallback(async () => {
    setPlaying(true);

    for (let i = 0; i < debate.audioUrls.length; i++) {
      setCurrentTurn(i);

      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(debate.audioUrls[i]);
        audioRef.current = audio;
        audio.onended = () => {
          resolve();
        };
        audio.onerror = () => {
          resolve(); // skip failed turns
        };
        audio.play().catch(reject);
      });

      // 0.5s pause between turns
      if (i < debate.audioUrls.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setPlaying(false);
    setCurrentTurn(-1);
  }, [debate.audioUrls]);

  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
    setCurrentTurn(-1);
  };

  const handleVote = async (company: "a" | "b") => {
    if (hasVoted) return;
    setHasVoted(true);
    localStorage.setItem(`voted:${debate.slug}`, company);

    // Optimistic update
    if (company === "a") setVotesA((v) => v + 1);
    else setVotesB((v) => v + 1);

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: debate.slug, company }),
      });
      if (res.ok) {
        const data = await res.json();
        setVotesA(data.votesA);
        setVotesB(data.votesB);
      }
    } catch {
      // optimistic update stands
    }
  };

  const shareText = `I just watched ${debate.companyA.name} vs ${debate.companyB.name} debate on FireTalk — ${debate.companyA.name} is ${pctA > pctB ? "winning" : "losing"} ${pctA}% to ${pctB}%! #ElevenHacks @firecrawl @elevenlabs`;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/battle/${debate.slug}`
      : "";

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      {/* VS Card */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <div className="text-center">
          <CompanyLogo url={debate.companyA.url} size={64} className="mx-auto mb-2" />
          <h2 className="text-lg font-bold text-orange-400">
            {debate.companyA.name}
          </h2>
        </div>
        <span className="text-4xl font-black text-gray-600 vs-glow">VS</span>
        <div className="text-center">
          <CompanyLogo url={debate.companyB.url} size={64} className="mx-auto mb-2" />
          <h2 className="text-lg font-bold text-blue-400">
            {debate.companyB.name}
          </h2>
        </div>
      </div>

      {/* Audio Player */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={playing ? stopPlaying : playSequential}
            className="flex items-center gap-3 text-white hover:text-orange-400 transition"
          >
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
              {playing ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <rect x="5" y="4" width="3" height="12" />
                  <rect x="12" y="4" width="3" height="12" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 ml-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <polygon points="5,3 19,10 5,17" />
                </svg>
              )}
            </div>
            <span className="font-medium">
              {playing ? "Pause" : "Play Debate"}
            </span>
          </button>
          <AudioBars playing={playing} />
        </div>

        {/* Turn indicator */}
        {currentTurn >= 0 && (
          <p className="text-sm text-gray-400">
            Now speaking:{" "}
            <span
              className={
                debate.transcript[currentTurn]?.company ===
                debate.companyA.name.toLowerCase().replace(/\s+/g, "-")
                  ? "text-orange-400"
                  : "text-blue-400"
              }
            >
              {debate.transcript[currentTurn]?.speaker}
            </span>
          </p>
        )}
      </div>

      {/* Transcript */}
      <div className="space-y-4 mb-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Transcript
        </h3>
        {debate.transcript.map((turn, i) => {
          const isA =
            i % 2 === 0; // alternate colors for readability
          return (
            <div
              key={i}
              className={`p-4 rounded-lg border ${
                currentTurn === i
                  ? "border-orange-500 bg-gray-900"
                  : "border-gray-800 bg-gray-900/50"
              }`}
            >
              <p
                className={`text-sm font-bold mb-1 ${
                  isA ? "text-orange-400" : "text-blue-400"
                }`}
              >
                {turn.speaker}
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">
                {turn.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quote Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <QuoteCard
          quote={debate.bestQuoteA}
          company={debate.companyA.name}
          color="orange"
          logoUrl={debate.companyA.url}
        />
        <QuoteCard
          quote={debate.bestQuoteB}
          company={debate.companyB.name}
          color="blue"
          logoUrl={debate.companyB.url}
        />
      </div>

      {/* Vote */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
        <h3 className="text-center text-lg font-bold mb-4">Who won?</h3>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => handleVote("a")}
            disabled={hasVoted}
            className={`flex-1 py-3 rounded-lg font-bold transition ${
              hasVoted
                ? "bg-gray-800 text-gray-400 cursor-default"
                : "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30"
            }`}
          >
            {debate.companyA.name}
          </button>
          <button
            onClick={() => handleVote("b")}
            disabled={hasVoted}
            className={`flex-1 py-3 rounded-lg font-bold transition ${
              hasVoted
                ? "bg-gray-800 text-gray-400 cursor-default"
                : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30"
            }`}
          >
            {debate.companyB.name}
          </button>
        </div>
        {/* Vote bar */}
        <div className="h-3 rounded-full overflow-hidden flex bg-gray-800">
          <div
            className="bg-orange-500 transition-all duration-500"
            style={{ width: `${pctA}%` }}
          />
          <div
            className="bg-blue-500 transition-all duration-500"
            style={{ width: `${pctB}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-400 mt-2">
          <span>{pctA}%</span>
          <span>
            {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          </span>
          <span>{pctB}%</span>
        </div>
      </div>

      {/* Share */}
      <div className="flex flex-wrap gap-3 justify-center mb-8">
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          className="px-4 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition"
        >
          Share on X
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          className="px-4 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition"
        >
          Share on LinkedIn
        </a>
        <button
          onClick={() => {
            navigator.clipboard.writeText(shareUrl);
          }}
          className="px-4 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition"
        >
          Copy Link
        </button>
      </div>

      {/* Generate New */}
      <div className="text-center">
        <a
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-lg hover:from-orange-600 hover:to-red-700 transition"
        >
          Generate New Battle
        </a>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-gray-600">
        Built with{" "}
        <a href="https://firecrawl.dev" className="text-orange-500 hover:underline" target="_blank">
          Firecrawl
        </a>{" "}
        +{" "}
        <a href="https://elevenlabs.io" className="text-blue-500 hover:underline" target="_blank">
          ElevenLabs
        </a>{" "}
        for{" "}
        <a href="https://hacks.elevenlabs.io" className="hover:underline" target="_blank">
          #ElevenHacks
        </a>
        <br />
        <span className="mt-2 inline-block">
          Want to build your own AI voice app?{" "}
          <a href="https://elevenlabs.io" className="text-blue-400 hover:underline" target="_blank">
            Try ElevenLabs free →
          </a>{" "}
          | Need web scraping for AI?{" "}
          <a href="https://firecrawl.dev" className="text-orange-400 hover:underline" target="_blank">
            Try Firecrawl →
          </a>
        </span>
      </footer>
    </main>
  );
}

function QuoteCard({
  quote,
  company,
  color,
  logoUrl,
}: {
  quote: string;
  company: string;
  color: "orange" | "blue";
  logoUrl: string;
}) {
  return (
    <div
      className={`p-6 rounded-xl border ${
        color === "orange"
          ? "border-orange-500/30 bg-orange-500/5"
          : "border-blue-500/30 bg-blue-500/5"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <CompanyLogo url={logoUrl} size={24} />
        <span
          className={`text-sm font-bold ${
            color === "orange" ? "text-orange-400" : "text-blue-400"
          }`}
        >
          {company}
        </span>
      </div>
      <p className="text-lg font-medium text-white leading-snug italic">
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  );
}
