"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Debate } from "@/lib/types";
import { CompanyLogo } from "@/components/CompanyLogo";

export function BattleClient({ debate }: { debate: Debate }) {
  const [playing, setPlaying] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(-1);
  const [votesA, setVotesA] = useState(debate.votesA);
  const [votesB, setVotesB] = useState(debate.votesB);
  const [hasVoted, setHasVoted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [shareUrl, setShareUrl] = useState(`/battle/${debate.slug}`);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const voted = localStorage.getItem(`voted:${debate.slug}`);
    if (voted) setHasVoted(true);
    setShareUrl(`${window.location.origin}/battle/${debate.slug}`);
  }, [debate.slug]);

  const totalVotes = votesA + votesB;
  const pctA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;

  const playSequential = useCallback(async () => {
    setPlaying(true);
    for (let i = 0; i < debate.audioUrls.length; i++) {
      setCurrentTurn(i);
      await new Promise<void>((resolve) => {
        const audio = new Audio(debate.audioUrls[i]);
        audioRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
      if (i < debate.audioUrls.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
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
    } catch { /* optimistic update stands */ }
  };

  const shareText = `${debate.companyA.name} vs ${debate.companyB.name} — AI Product Battle on FireTalk. ${pctA}% vs ${pctB}%. #ElevenHacks @firecrawl @elevenlabs`;

  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      {/* VS Header */}
      <div className="flex items-center justify-center gap-8 mb-8">
        <div className="text-center">
          <CompanyLogo url={debate.companyA.url} size={56} className="mx-auto mb-2" />
          <h2 className="text-base font-semibold text-zinc-200">{debate.companyA.name}</h2>
        </div>
        <span className="text-3xl font-black text-zinc-700">vs</span>
        <div className="text-center">
          <CompanyLogo url={debate.companyB.url} size={56} className="mx-auto mb-2" />
          <h2 className="text-base font-semibold text-zinc-200">{debate.companyB.name}</h2>
        </div>
      </div>

      {/* Audio Player with Waveform */}
      <div className="bg-zinc-900 rounded-xl p-5 mb-4 border border-zinc-800">
        <div className="flex items-center gap-4">
          <button
            onClick={playing ? stopPlaying : playSequential}
            className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition shrink-0 fire-glow"
          >
            {playing ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <rect x="5" y="4" width="3" height="12" />
                <rect x="12" y="4" width="3" height="12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <polygon points="5,3 19,10 5,17" />
              </svg>
            )}
          </button>

          {/* Waveform visualization */}
          <div className="flex-1 flex items-end justify-center gap-[3px] h-12">
            {Array.from({ length: 40 }).map((_, i) => {
              const height = 20 + Math.sin(i * 0.7) * 15 + Math.cos(i * 1.3) * 10;
              return (
                <div
                  key={i}
                  className={`w-[3px] rounded-full transition-colors ${
                    playing
                      ? "bg-orange-500 wave-bar"
                      : "bg-zinc-700 wave-bar-static"
                  }`}
                  style={{
                    height: `${Math.max(8, height)}%`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              );
            })}
          </div>

          {currentTurn >= 0 && (
            <span className="text-xs text-zinc-500 shrink-0">
              {currentTurn + 1}/{debate.transcript.length}
            </span>
          )}
        </div>
      </div>

      {/* Vote — directly under player */}
      <div className="bg-zinc-900 rounded-xl p-5 mb-6 border border-zinc-800">
        <p className="text-sm font-medium text-zinc-400 text-center mb-3">
          Which product wins?
        </p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => handleVote("a")}
            disabled={hasVoted}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
              hasVoted
                ? "bg-zinc-800 text-zinc-500 cursor-default"
                : "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20"
            }`}
          >
            {debate.companyA.name}
          </button>
          <button
            onClick={() => handleVote("b")}
            disabled={hasVoted}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
              hasVoted
                ? "bg-zinc-800 text-zinc-500 cursor-default"
                : "bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
            }`}
          >
            {debate.companyB.name}
          </button>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex bg-zinc-800">
          <div className="bg-orange-500 transition-all duration-500" style={{ width: `${pctA}%` }} />
          <div className="bg-zinc-500 transition-all duration-500" style={{ width: `${pctB}%` }} />
        </div>
        <div className="flex justify-between text-xs text-zinc-500 mt-1.5">
          <span>{pctA}%</span>
          <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
          <span>{pctB}%</span>
        </div>
      </div>

      {/* Comparison Table */}
      {debate.comparison && debate.comparison.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Comparison
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Criteria</th>
                  <th className="text-left px-4 py-3 text-orange-400 font-medium">{debate.companyA.name}</th>
                  <th className="text-left px-4 py-3 text-zinc-300 font-medium">{debate.companyB.name}</th>
                </tr>
              </thead>
              <tbody>
                {debate.comparison.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-4 py-3 text-zinc-400 font-medium">{row.criterion}</td>
                    <td className={`px-4 py-3 ${row.verdict === "A" ? "text-orange-400" : "text-zinc-400"}`}>
                      {row.productA}
                      {row.verdict === "A" && <span className="ml-1.5 text-orange-500">●</span>}
                    </td>
                    <td className={`px-4 py-3 ${row.verdict === "B" ? "text-zinc-200" : "text-zinc-400"}`}>
                      {row.productB}
                      {row.verdict === "B" && <span className="ml-1.5 text-zinc-300">●</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Article */}
      {debate.summary && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Verdict
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
              {debate.summary}
            </p>
          </div>
        </div>
      )}

      {/* Quote Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="p-5 rounded-xl border border-orange-500/20 bg-orange-500/5">
          <div className="flex items-center gap-2 mb-2">
            <CompanyLogo url={debate.companyA.url} size={20} />
            <span className="text-xs font-semibold text-orange-400">{debate.companyA.name}</span>
          </div>
          <p className="text-sm text-zinc-200 leading-snug italic">&ldquo;{debate.bestQuoteA}&rdquo;</p>
        </div>
        <div className="p-5 rounded-xl border border-zinc-700 bg-zinc-800/30">
          <div className="flex items-center gap-2 mb-2">
            <CompanyLogo url={debate.companyB.url} size={20} />
            <span className="text-xs font-semibold text-zinc-400">{debate.companyB.name}</span>
          </div>
          <p className="text-sm text-zinc-200 leading-snug italic">&ldquo;{debate.bestQuoteB}&rdquo;</p>
        </div>
      </div>

      {/* Transcript (collapsed by default) */}
      <div className="mb-6">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition mb-3"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showTranscript ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Full Transcript ({debate.transcript.length} turns)
        </button>
        {showTranscript && (
          <div className="space-y-3">
            {debate.transcript.map((turn, i) => {
              const isA = turn.company === debate.transcript[0]?.company;
              return (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    currentTurn === i
                      ? "border-orange-500/50 bg-zinc-900"
                      : "border-zinc-800 bg-zinc-900/50"
                  }`}
                >
                  <p className={`text-xs font-semibold mb-1 ${isA ? "text-orange-400" : "text-zinc-400"}`}>
                    {turn.speaker}
                  </p>
                  <p className="text-zinc-300 text-sm leading-relaxed">{turn.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share + New Battle */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition"
        >
          Share on X
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition"
        >
          Share on LinkedIn
        </a>
        <button
          onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition"
        >
          Copy Link
        </button>
      </div>

      <div className="text-center mb-8">
        <a
          href="/"
          className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition fire-glow"
        >
          New Product Battle
        </a>
      </div>

      {/* Footer */}
      <footer className="text-center pb-8">
        <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
          <span>Built with</span>
          <a href="https://firecrawl.dev" target="_blank" className="text-orange-400 hover:underline">Firecrawl</a>
          <span>+</span>
          <a href="https://elevenlabs.io" target="_blank" className="text-zinc-400 hover:underline">ElevenLabs</a>
        </div>
        <p className="text-xs text-zinc-600 mt-1">
          <a href="https://hacks.elevenlabs.io" target="_blank" className="hover:text-zinc-400 transition">#ElevenHacks</a>
        </p>
      </footer>
    </main>
  );
}
