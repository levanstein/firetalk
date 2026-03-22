export interface ScrapedData {
  companyName: string;
  url: string;
  domain: string;
  content: string;
  wordCount: number;
}

export interface DebateTurn {
  speaker: string;
  company: string;
  text: string;
}

export interface ComparisonRow {
  criterion: string;
  productA: string;
  productB: string;
  verdict: "A" | "B" | "Tie";
}

export interface DebateScript {
  companyA: { name: string; speaker: string };
  companyB: { name: string; speaker: string };
  turns: DebateTurn[];
  bestQuoteA: string;
  bestQuoteB: string;
  comparison: ComparisonRow[];
  summary: string;
}

export interface Debate {
  slug: string;
  companyA: { name: string; url: string; domain: string; logoUrl: string };
  companyB: { name: string; url: string; domain: string; logoUrl: string };
  transcript: DebateTurn[];
  bestQuoteA: string;
  bestQuoteB: string;
  comparison: ComparisonRow[];
  summary: string;
  audioUrls: string[];
  votesA: number;
  votesB: number;
  createdAt: string;
  status: "generating" | "complete" | "failed";
}

export interface SSEEvent {
  type: "step" | "script" | "done" | "error";
  data: Record<string, unknown>;
}
