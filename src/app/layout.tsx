import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FireTalk — AI Product Battles",
  description:
    "Compare any two products with AI-powered analysis. Get a detailed comparison, audio breakdown, and verdict.",
  openGraph: {
    title: "FireTalk — AI Product Battles",
    description:
      "Compare any two products with AI-powered analysis. Audio breakdown + comparison table + verdict.",
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
