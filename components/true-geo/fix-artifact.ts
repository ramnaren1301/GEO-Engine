import type { Gap, PageEvidence } from "./runtime";

export type FixArtifact = {
  gapId: string;
  generatedAt: string;
  pageUrl: string;
  domainUrl: string;
  sourceTitle: string;
  sourceUrl: string;
  evidenceMode: "verified_page" | "reachability_only" | "synthetic_demo";
  reviewRequired: boolean;
  content: { headline: string; answer: string; recommendation: string };
  jsonLd: Record<string, unknown>;
};

const clean = (value: string, limit: number) =>
  value.replace(/\s+/g, " ").trim().slice(0, limit);

export function createFixArtifact(
  domainUrl: string,
  pageUrl: string,
  gap: Gap,
  evidence: PageEvidence,
): FixArtifact {
  const excerpt = clean(evidence.excerpt || evidence.description || "", 900);
  const sourceTitle = clean(evidence.title || gap.title, 160);
  const headline = clean(gap.query, 180);
  const sourceUrl = evidence.sourceUrl?.trim() || pageUrl;
  const evidenceMode =
    evidence.provenance === "synthetic"
      ? "synthetic_demo"
      : excerpt
        ? "verified_page"
        : "reachability_only";
  const answer =
    evidenceMode === "synthetic_demo"
      ? `Synthetic draft for review: ${gap.fix} Replace this demonstration wording with verified facts from ${pageUrl} before publishing.`
      : excerpt ||
        `Draft for review: ${gap.fix} The page blocked automated reading, so replace this guidance with verified facts from ${pageUrl} before publishing.`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: pageUrl,
    isPartOf: { "@type": "WebSite", url: domainUrl },
    mainEntity: [
      {
        "@type": "Question",
        name: headline,
        acceptedAnswer: { "@type": "Answer", text: answer },
      },
    ],
  };
  return {
    gapId: gap.id,
    generatedAt: new Date().toISOString(),
    pageUrl,
    domainUrl,
    sourceTitle,
    sourceUrl,
    evidenceMode,
    reviewRequired: evidenceMode !== "verified_page",
    content: { headline, answer, recommendation: gap.fix },
    jsonLd,
  };
}
