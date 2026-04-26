import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";
import CmdK from "@/components/CmdK";

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

// Display face. Used for h1 + tier badges. Single weight is intentional —
// we don't need a type system, we need a voice.
const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

// Devanagari face for आरोग्य and any Sanskrit / Hindi rendering. Default
// Devanagari is generic system fallback; this is intentional.
const tiroDevanagariHindi = Tiro_Devanagari_Hindi({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: "400",
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
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${tiroDevanagariHindi.variable} h-full`}
    >
      <body className="min-h-full font-sans">
        {children}
        <CmdK />
      </body>
    </html>
  );
}
