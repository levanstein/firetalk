import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FireTalk — AI Debate Podcasts",
  description:
    "Drop two company URLs. Watch them battle in an AI-generated debate podcast.",
  openGraph: {
    title: "FireTalk — AI Debate Podcasts",
    description:
      "Drop two company URLs. Watch them battle in an AI-generated debate podcast.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
