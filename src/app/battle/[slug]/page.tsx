import type { Metadata } from "next";
import { getDebate } from "@/lib/storage";
import { notFound } from "next/navigation";
import { BattleClient } from "./BattleClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const debate = await getDebate(slug);
  if (!debate) return { title: "Not Found — FireTalk" };

  const title = `${debate.companyA.name} vs ${debate.companyB.name} — FireTalk Product Battle`;
  const description = `AI-powered comparison of ${debate.companyA.name} and ${debate.companyB.name}. Listen to the audio debate, see the comparison table, and vote for your winner. Based on real internet data from ${(debate.sources || []).length} sources.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [`/api/og/${slug}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/${slug}`],
    },
  };
}

export default async function BattlePage({ params }: Props) {
  const { slug } = await params;
  const debate = await getDebate(slug);

  if (!debate) {
    notFound();
  }

  return <BattleClient debate={debate} />;
}
