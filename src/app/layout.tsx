import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FireTalk — AI Product Battles",
  description:
    "Compare any two products with AI-powered analysis. Get an audio debate, comparison table, and verdict based on real internet data.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "FireTalk — AI Product Battles",
    description:
      "Compare any two products with AI-powered analysis. Audio debate + comparison table + verdict.",
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
      <body className={`min-h-screen antialiased ${inter.className}`}>{children}</body>
    </html>
  );
}
