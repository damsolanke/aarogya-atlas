import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aarogya Atlas — Agentic healthcare intelligence for 1.4B people",
  description:
    "Trust-scored, cost-aware, multilingual recommender over the Virtue Foundation 10,000-facility India dataset. On-device PHI extraction, Mosaic AI Vector Search, MLflow tracing, district-level desert detection.",
  openGraph: {
    title: "Aarogya Atlas",
    description:
      "Agentic healthcare facility intelligence for 1.4B people. Trust-scored, cost-aware, multilingual.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
