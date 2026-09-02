import type { Metadata } from "next";
import "./globals.css";

const siteOrigin = process.env.SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "TRUE GEO ENGINE — Synthetic AI visibility",
  description: "Use one public page URL to generate a deterministic Human-vs-AI visibility scenario, replay a benchmark prompt, compare answer-engine readiness, and export reusable WebMCP tools.",
  openGraph: {
    title: "TRUE GEO ENGINE",
    description: "Synthetic page AI visibility and URL-free benchmark prompt analysis with answer-engine scores, gaps, and downloadable next steps.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TRUE GEO ENGINE",
    description: "Generate a synthetic page visibility scenario or replay a URL-free benchmark prompt.",
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><meta name="codex-preview" content="development" /></head><body>{children}</body></html>;
}
