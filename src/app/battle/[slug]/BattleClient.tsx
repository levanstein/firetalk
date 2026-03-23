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
  const reviewSources = (debate.sources || []).filter((s) => s.type === "review");
  const websiteSources = (debate.sources || []).filter((s) => s.type === "website");

  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      {/* VS Header — animated intro */}
      <div className="flex items-center justify-center gap-8 mb-8">
        <div className="text-center battle-intro-left">
          <CompanyLogo url={debate.companyA.url} size={56} className="mx-auto mb-2" />
          <h2 className="text-base font-semibold text-gray-800">{debate.companyA.name}</h2>
        </div>
        <span className="text-3xl font-black text-orange-500 battle-intro-vs">vs</span>
        <div className="text-center battle-intro-right">
          <CompanyLogo url={debate.companyB.url} size={56} className="mx-auto mb-2" />
          <h2 className="text-base font-semibold text-gray-800">{debate.companyB.name}</h2>
        </div>
      </div>

      <div className="battle-intro-content">
        {/* Audio Player with Waveform */}
        <div className="bg-white rounded-2xl p-5 mb-4 border border-gray-200 shadow-sm">
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

            {/* Waveform */}
            <div className="flex-1 flex items-center justify-center gap-[2px] h-14">
              {Array.from({ length: 50 }).map((_, i) => {
                const position = i / 50;
                const envelope = Math.sin(position * Math.PI) * 0.7 + 0.3;
                const detail = Math.sin(i * 0.8) * 0.3 + Math.cos(i * 1.5) * 0.2 + Math.sin(i * 2.3) * 0.1;
                const height = (envelope + detail) * 100;
                return (
                  <div
                    key={i}
                    className={`w-[2.5px] rounded-full transition-all duration-300 ${
                      playing ? "bg-orange-500 wave-bar" : "bg-gray-300 wave-bar-static"
                    }`}
                    style={{
                      height: `${Math.max(12, Math.min(95, height))}%`,
                      animationDelay: `${i * 0.04}s`,
                    }}
                  />
                );
              })}
            </div>

            {currentTurn >= 0 && (
              <span className="text-xs text-gray-400 shrink-0">
                {currentTurn + 1}/{debate.transcript.length}
              </span>
            )}
          </div>
        </div>

        {/* Vote */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 text-center mb-3">Which product wins?</p>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => handleVote("a")}
              disabled={hasVoted}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                hasVoted
                  ? "bg-gray-100 text-gray-400 cursor-default"
                  : "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"
              }`}
            >
              {debate.companyA.name}
            </button>
            <button
              onClick={() => handleVote("b")}
              disabled={hasVoted}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                hasVoted
                  ? "bg-gray-100 text-gray-400 cursor-default"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
              }`}
            >
              {debate.companyB.name}
            </button>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex bg-gray-100">
            <div className="bg-orange-500 transition-all duration-500" style={{ width: `${pctA}%` }} />
            <div className="bg-gray-400 transition-all duration-500" style={{ width: `${pctB}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>{pctA}%</span>
            <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
            <span>{pctB}%</span>
          </div>
        </div>

        {/* Sources Panel */}
        {(debate.sources || []).length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">[ Sources ]</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {websiteSources.map((source, i) => (
                <a
                  key={`w-${i}`}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-orange-200 transition text-sm"
                >
                  <img
                    src={`https://www.google.com/s2/favicons?sz=32&domain=${source.domain}`}
                    alt=""
                    className="w-5 h-5 rounded-sm mt-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-700 truncate">{source.name}</p>
                    <p className="text-xs text-gray-400">Official website</p>
                  </div>
                </a>
              ))}
              {reviewSources.map((source, i) => (
                <a
                  key={`r-${i}`}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl hover:border-orange-200 transition text-sm"
                >
                  <img
                    src={`https://www.google.com/s2/favicons?sz=32&domain=${source.domain}`}
                    alt=""
                    className="w-5 h-5 rounded-sm mt-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-700 truncate">{source.name}</p>
                    <p className="text-xs text-orange-500">Independent review</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {debate.comparison && debate.comparison.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">[ Comparison ]</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Criteria</th>
                    <th className="text-left px-4 py-3 text-orange-500 font-medium">{debate.companyA.name}</th>
                    <th className="text-left px-4 py-3 text-gray-700 font-medium">{debate.companyB.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {debate.comparison.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 text-gray-500 font-medium">{row.criterion}</td>
                      <td className={`px-4 py-3 ${row.verdict === "A" ? "text-orange-600 font-medium" : "text-gray-500"}`}>
                        {row.productA}
                        {row.verdict === "A" && <span className="ml-1.5 text-orange-500">●</span>}
                      </td>
                      <td className={`px-4 py-3 ${row.verdict === "B" ? "text-gray-800 font-medium" : "text-gray-500"}`}>
                        {row.productB}
                        {row.verdict === "B" && <span className="ml-1.5 text-gray-600">●</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        {debate.summary && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">[ Verdict ]</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{debate.summary}</p>
            </div>
          </div>
        )}

        {/* Quote Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div className="p-5 rounded-2xl border border-orange-200 bg-orange-50">
            <div className="flex items-center gap-2 mb-2">
              <CompanyLogo url={debate.companyA.url} size={20} />
              <span className="text-xs font-semibold text-orange-600">{debate.companyA.name}</span>
            </div>
            <p className="text-sm text-gray-700 leading-snug italic">&ldquo;{debate.bestQuoteA}&rdquo;</p>
          </div>
          <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <CompanyLogo url={debate.companyB.url} size={20} />
              <span className="text-xs font-semibold text-gray-600">{debate.companyB.name}</span>
            </div>
            <p className="text-sm text-gray-700 leading-snug italic">&ldquo;{debate.bestQuoteB}&rdquo;</p>
          </div>
        </div>

        {/* Transcript */}
        <div className="mb-6">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition mb-3"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showTranscript ? "rotate-90" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
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
                    className={`p-4 rounded-xl border ${
                      currentTurn === i
                        ? "border-orange-300 bg-orange-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className={`text-xs font-semibold mb-1 ${isA ? "text-orange-500" : "text-gray-500"}`}>
                      {turn.speaker}
                    </p>
                    <p className="text-gray-600 text-sm leading-relaxed">{turn.text}</p>
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
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 hover:text-gray-700 hover:border-gray-300 transition"
          >
            Share on X
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 hover:text-gray-700 hover:border-gray-300 transition"
          >
            Share on LinkedIn
          </a>
          <button
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 hover:text-gray-700 hover:border-gray-300 transition"
          >
            Copy Link
          </button>
        </div>

        <div className="text-center mb-8">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition fire-glow"
          >
            New Product Battle
          </a>
        </div>

        {/* Footer */}
        <footer className="text-center pb-8">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span>Built with</span>
            <a href="https://firecrawl.dev" target="_blank" className="text-orange-500 hover:underline">Firecrawl</a>
            <span>+</span>
            <a href="https://elevenlabs.io" target="_blank" className="text-gray-500 hover:underline">ElevenLabs</a>
          </div>
          <p className="text-xs text-gray-300 mt-1">
            <a href="https://hacks.elevenlabs.io" target="_blank" className="hover:text-gray-500 transition">#ElevenHacks</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
