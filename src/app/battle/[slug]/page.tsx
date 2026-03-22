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

  return {
    title: `${debate.companyA.name} vs ${debate.companyB.name} — FireTalk Product Battle`,
    description: `AI-powered comparison of ${debate.companyA.name} and ${debate.companyB.name}. Listen to the audio breakdown, see the comparison table, and vote for your winner.`,
    openGraph: {
      title: `${debate.companyA.name} vs ${debate.companyB.name} — FireTalk`,
      description: `AI product comparison: ${debate.companyA.name} vs ${debate.companyB.name}. Audio breakdown + comparison table + verdict.`,
      type: "website",
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
