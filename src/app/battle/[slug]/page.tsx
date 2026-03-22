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
    title: `${debate.companyA.name} vs ${debate.companyB.name} — FireTalk`,
    description: `Watch ${debate.companyA.name} and ${debate.companyB.name} battle in an AI-generated debate podcast. Who wins? Vote now.`,
    openGraph: {
      title: `${debate.companyA.name} vs ${debate.companyB.name} — FireTalk AI Debate`,
      description: `Watch ${debate.companyA.name} and ${debate.companyB.name} battle it out in an AI-generated debate podcast. Who wins? Vote now.`,
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
