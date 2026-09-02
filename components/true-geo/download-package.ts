import { strToU8, zipSync } from "fflate";
import type { FixArtifact } from "./fix-artifact";
import type { HtmlVisibilityAudit } from "./html-visibility";
import type { PromptImplementationTarget } from "./prompt-analysis";
import type { VisibilityData } from "./runtime";
import { toolsMarkdown, webMcpTools } from "./tool-manifest";

type PackageInput = {
  targetLabel: string;
  artifact: FixArtifact;
  data: VisibilityData;
  htmlAudit: HtmlVisibilityAudit | null;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export function buildOptimizationFiles({
  targetLabel,
  artifact,
  data,
  htmlAudit,
}: PackageInput) {
  const gaps = data.gaps.length
    ? data.gaps
    : [
        {
          ...data.gaps[0],
          query: artifact.content.headline,
          fix: artifact.content.recommendation,
        },
      ];
  const faq = gaps.filter(Boolean).map((gap) => ({
    question: gap.query,
    answer:
      artifact.evidenceMode === "verified_page"
        ? `${artifact.content.answer} Suggested clarification for this question: ${gap.fix}`
        : `${artifact.evidenceMode === "synthetic_demo" ? "Synthetic demo draft" : "Draft"} for review: ${gap.fix} Replace this guidance with page-verified facts and supporting evidence before publishing.`,
    recommendedAddition: gap.fix,
    source: artifact.sourceUrl,
    pageUrl: artifact.pageUrl,
    evidenceMode: artifact.evidenceMode,
    reviewRequired: artifact.reviewRequired,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: artifact.pageUrl,
    isPartOf: { "@type": "WebSite", url: artifact.domainUrl },
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  const llms = [
    `# ${artifact.sourceTitle}`,
    `> ${artifact.content.answer}`,
    "",
    `Canonical page: ${artifact.pageUrl}`,
    `Site: ${artifact.domainUrl}`,
    `${artifact.evidenceMode === "verified_page" ? "Verified source" : artifact.evidenceMode === "synthetic_demo" ? "Synthetic target — not fetched" : "Target page (origin blocked)"}: ${artifact.sourceUrl}`,
    "",
    "## Questions this exact page should answer",
    ...faq.flatMap((item) => [
      `### ${item.question}`,
      item.answer,
      `Suggested improvement: ${item.recommendedAddition}`,
      "",
    ]),
  ].join("\n");
  const llmsFull = [
    llms,
    "",
    "## Consolidated implementation plan",
    ...data.gaps.flatMap((gap) => [
      `### ${gap.rank}. ${gap.query}`,
      `- Current gap: ${gap.impactValue} visibility points`,
      `- Recommendation: ${gap.fix}`,
      `- Evidence: ${gap.evidence.join("; ")}`,
      "",
    ]),
    "## Evidence summary",
    `- Exact page: ${artifact.pageUrl}`,
    `- AI visibility score: ${data.metrics.aiVisibilityScore ?? "not calculated"}`,
    `- Crawler and prompt checks: ${data.answerCount}`,
    `- Answer engines: ${data.modelCount}`,
    `- Source HTML visibility: ${htmlAudit ? `${htmlAudit.sourceVisibility}%` : "not available"}`,
  ].join("\n");
  const faqHtml = faq
    .map(
      (item) =>
        `<article class="card"><p class="eyebrow">Frequently asked question${item.reviewRequired ? " · draft for review" : ""}</p><h2>${escapeHtml(item.question)}</h2><p>${escapeHtml(item.answer)}</p><aside><strong>Suggested page improvement:</strong> ${escapeHtml(item.recommendedAddition)}</aside><a href="${escapeHtml(item.source)}">${item.reviewRequired ? "Target page" : "Verified source"}: ${escapeHtml(artifact.sourceTitle)}</a></article>`,
    )
    .join("");
  const preview = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(artifact.sourceTitle)} — suggested GEO content</title><script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll("<", "\\u003c")}</script><style>body{margin:0;background:#f5f9ff;color:#10233f;font:16px/1.65 system-ui,sans-serif}.wrap{max-width:820px;margin:64px auto;padding:0 20px}.intro{margin-bottom:28px}.card{margin:18px 0;border:1px solid #dbe8f7;border-radius:20px;background:#fff;padding:32px;box-shadow:0 20px 60px rgba(37,99,235,.1)}.eyebrow{color:#2563eb;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}h1{font-size:34px;line-height:1.2}h2{font-size:25px;line-height:1.3}aside{margin:20px 0;padding:14px;border-radius:12px;background:#eef6ff}a{color:#2563eb}</style></head><body><main class="wrap"><header class="intro"><p class="eyebrow">Suggested consolidated page content</p><h1>${escapeHtml(artifact.sourceTitle)}</h1><p>Prepared only for <a href="${escapeHtml(artifact.pageUrl)}">${escapeHtml(artifact.pageUrl)}</a>.</p></header>${faqHtml}</main></body></html>`;
  const faqMarkdown = faq
    .map((item) =>
      [
        `## ${item.question}`,
        "",
        item.answer,
        "",
        `Suggested improvement: ${item.recommendedAddition}`,
        `Source: ${item.source}`,
        "",
      ].join("\n"),
    )
    .join("\n");
  const nextSteps = [
    `# Next steps for ${targetLabel}`,
    "",
    `Scan: ${data.scanId}`,
    `Page: ${artifact.pageUrl}`,
    "",
    ...data.gaps.map((gap) =>
      [
        `## ${gap.rank}. ${gap.title}`,
        "",
        `- Recoverable visibility: ${gap.impactValue} points`,
        `- Confidence: ${gap.confidence}%`,
        `- Cause: ${gap.cause}`,
        `- Recommended action: ${gap.fix}`,
        "",
      ].join("\n"),
    ),
  ].join("\n");
  const files: Record<string, Uint8Array> = {
    "DEMO-DISCLOSURE.txt": strToU8(
      artifact.evidenceMode === "synthetic_demo"
        ? "This package was generated from a deterministic synthetic URL scenario. The target page was not fetched or rendered. All content, scores, FAQs, structured data, and recommendations are demonstration drafts that require verification before use."
        : "This package contains URL-scoped recommendations. Review all generated content before publishing.",
    ),
    "llms.txt": strToU8(llms),
    "llms-full.txt": strToU8(llmsFull),
    "faqs.json": strToU8(JSON.stringify(faq, null, 2)),
    "faq-content.md": strToU8(
      `# Suggested FAQs for ${artifact.pageUrl}\n\n${faqMarkdown}`,
    ),
    "structured-data.jsonld": strToU8(JSON.stringify(jsonLd, null, 2)),
    "schema.json": strToU8(JSON.stringify(jsonLd, null, 2)),
    "content-preview.html": strToU8(preview),
    "page-visibility-audit.json": strToU8(
      JSON.stringify(data.pageAudit, null, 2),
    ),
    "html-visibility-audit.json": strToU8(JSON.stringify(htmlAudit, null, 2)),
    "answer-engine-scores.json": strToU8(JSON.stringify(data.models, null, 2)),
    "high-intent-prompts.json": strToU8(
      JSON.stringify(data.answerPrompts, null, 2),
    ),
    "next-steps.md": strToU8(nextSteps),
    "action-plan.json": strToU8(
      JSON.stringify(
        {
          runType: "page",
          target: targetLabel,
          pageUrl: artifact.pageUrl,
          domainUrl: artifact.domainUrl,
          scope:
            artifact.pageUrl === artifact.domainUrl ||
            artifact.pageUrl === `${artifact.domainUrl}/`
              ? "site-root"
              : "specific-page",
          evidenceMode: artifact.evidenceMode,
          reviewRequired: artifact.reviewRequired,
          scanId: data.scanId,
          score: data.metrics.aiVisibilityScore,
          metrics: data.metrics,
          pageVisibilityAudit: data.pageAudit,
          gaps: data.gaps,
          generatedAt: artifact.generatedAt,
        },
        null,
        2,
      ),
    ),
    "webmcp-tools.json": strToU8(
      JSON.stringify(
        {
          name: "true-geo-engine",
          version: "4.3",
          transport: "browser-webmcp",
          tools: webMcpTools,
        },
        null,
        2,
      ),
    ),
    "webmcp-tools.md": strToU8(toolsMarkdown()),
  };
  return files;
}

export function downloadOptimizationPackage(input: PackageInput) {
  const files = buildOptimizationFiles(input);
  const bytes = zipSync(files, { level: 6 });
  const payload =
    bytes.buffer instanceof ArrayBuffer
      ? bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        )
      : Uint8Array.from(bytes).buffer;
  const blob = new Blob([payload], { type: "application/zip" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  const pageSlug = (() => {
    try {
      const url = new URL(input.artifact.pageUrl);
      return `${url.hostname}${url.pathname}`;
    } catch {
      return input.targetLabel;
    }
  })()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  link.download = `${pageSlug || "true-geo"}-suggested-geo-package.zip`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  return { filename: link.download, fileCount: Object.keys(files).length };
}

export function buildPromptAnalysisFiles(
  subject: string,
  data: VisibilityData,
  target: PromptImplementationTarget,
) {
  const answers = data.modelAnswers
    .map((item) =>
      [
        `## ${item.model}`,
        "",
        item.answer,
        "",
        ...(item.sources.length
          ? [
              "### Sources",
              ...item.sources.map(
                (source) => `- [${source.title}](${source.url})`,
              ),
            ]
          : ["No cited web sources were returned."]),
        "",
      ].join("\n"),
    )
    .join("\n");
  const sources = data.modelAnswers.flatMap((item) =>
    item.sources.map((source) => ({ model: item.model, ...source })),
  );
  const gaps = data.gaps.length
    ? data.gaps
    : data.answerPrompts.map((item, index) => ({
        rank: String(index + 1).padStart(2, "0"),
        query: item.query,
        title: item.query,
        impactValue: 0,
        confidence: 70,
        cause: `The benchmark needs a clearer ${item.sentimentTopic.toLowerCase()} answer.`,
        fix: `Publish a sourced, plain-language answer for ${item.query}`,
        evidence: ["Prompt benchmark"],
        sourceUrls: sources.map((item) => item.url),
      }));
  const faqs = gaps.map((gap) => ({
    question: gap.query,
    answer: `Suggested answer for ${subject}: ${gap.fix} Use the attached benchmark sources to add verifiable facts, an important trade-off, and a direct recommendation for the exact prompt intent.`,
    recommendedPage: target.pageUrl,
    recommendedAddition: gap.fix,
    evidenceMode: "prompt_benchmark",
    reviewRequired: true,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: target.pageUrl,
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  const llms = [
    `# ${subject}`,
    `> Suggested GEO implementation package for the prompt: ${data.goal}`,
    "",
    `Canonical page: ${target.pageUrl}`,
    `Site: ${target.domainUrl}`,
    "Evidence mode: prompt benchmark — review all facts before publishing",
    "",
    "## Questions this page should answer",
    ...faqs.flatMap((item) => [
      `### ${item.question}`,
      item.answer,
      `Recommended addition: ${item.recommendedAddition}`,
      "",
    ]),
  ].join("\n");
  const llmsFull = [
    llms,
    "",
    "## Complete ranked action plan",
    ...gaps.flatMap((gap) => [
      `### ${gap.rank}. ${gap.title}`,
      `- Visibility opportunity: ${gap.impactValue} points`,
      `- Confidence: ${gap.confidence}%`,
      `- Diagnosis: ${gap.cause}`,
      `- Recommended action: ${gap.fix}`,
      "",
    ]),
    "## Benchmark evidence",
    ...sources.map(
      (source) => `- ${source.model}: [${source.title}](${source.url})`,
    ),
  ].join("\n");
  const faqMarkdown = faqs
    .map((item) =>
      [
        `## ${item.question}`,
        "",
        item.answer,
        "",
        `Recommended target: ${item.recommendedPage}`,
        `Recommended addition: ${item.recommendedAddition}`,
        "",
      ].join("\n"),
    )
    .join("\n");
  const cards = faqs
    .map(
      (item) =>
        `<article class="card"><p class="eyebrow">Suggested FAQ · review required</p><h2>${escapeHtml(item.question)}</h2><p>${escapeHtml(item.answer)}</p><aside><strong>Recommended addition:</strong> ${escapeHtml(item.recommendedAddition)}</aside></article>`,
    )
    .join("");
  const preview = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)} — suggested GEO content</title><script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll("<", "\\u003c")}</script><style>body{margin:0;background:#f5f9ff;color:#10233f;font:16px/1.65 system-ui,sans-serif}.wrap{max-width:820px;margin:64px auto;padding:0 20px}.card{margin:18px 0;border:1px solid #dbe8f7;border-radius:20px;background:#fff;padding:32px}.eyebrow{color:#2563eb;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}h1{font-size:34px}h2{font-size:24px}aside{margin-top:20px;padding:14px;border-radius:12px;background:#eef6ff}</style></head><body><main class="wrap"><p class="eyebrow">Prompt-led page package</p><h1>${escapeHtml(subject)}</h1><p>Suggested for ${escapeHtml(target.pageUrl)}. Verify every fact before publishing.</p>${cards}</main></body></html>`;
  const nextSteps = [
    `# Next steps for ${subject}`,
    "",
    `Run: ${data.scanId}`,
    `Prompt: ${data.goal}`,
    `Suggested target: ${target.pageUrl}`,
    "",
    ...gaps.map((gap) =>
      [
        `## ${gap.rank}. ${gap.title}`,
        "",
        `- Visibility opportunity: ${gap.impactValue} points`,
        `- Confidence: ${gap.confidence}%`,
        `- Diagnosis: ${gap.cause}`,
        `- Recommended action: ${gap.fix}`,
        "",
      ].join("\n"),
    ),
  ].join("\n");
  return {
    "llms.txt": strToU8(llms),
    "llms-full.txt": strToU8(llmsFull),
    "faqs.json": strToU8(JSON.stringify(faqs, null, 2)),
    "faq-content.md": strToU8(
      `# Suggested FAQs for ${target.pageUrl}\n\n${faqMarkdown}`,
    ),
    "structured-data.jsonld": strToU8(JSON.stringify(jsonLd, null, 2)),
    "schema.json": strToU8(JSON.stringify(jsonLd, null, 2)),
    "content-preview.html": strToU8(preview),
    "prompt.txt": strToU8(data.goal),
    "model-answers.md": strToU8(`# Model answers — ${subject}\n\n${answers}`),
    "sources.json": strToU8(JSON.stringify(sources, null, 2)),
    "answer-engine-scores.json": strToU8(JSON.stringify(data.models, null, 2)),
    "answer-dimensions.json": strToU8(
      JSON.stringify(data.answerPrompts, null, 2),
    ),
    "next-steps.md": strToU8(nextSteps),
    "action-plan.json": strToU8(
      JSON.stringify(
        {
          runType: "prompt",
          brand: subject,
          prompt: data.goal,
          pageUrl: target.pageUrl,
          domainUrl: target.domainUrl,
          scope: target.scope,
          targetDerivation: target.derivation,
          evidenceMode: "prompt_benchmark",
          reviewRequired: true,
          runId: data.scanId,
          score: data.metrics.aiVisibilityScore,
          metrics: data.metrics,
          gaps,
          generatedAt: data.scannedAt,
        },
        null,
        2,
      ),
    ),
    "webmcp-tools.json": strToU8(
      JSON.stringify(
        {
          name: "true-geo-engine",
          version: "4.3",
          transport: "browser-webmcp",
          tools: webMcpTools,
        },
        null,
        2,
      ),
    ),
    "webmcp-tools.md": strToU8(toolsMarkdown()),
  };
}

export function downloadPromptAnalysisPackage(
  subject: string,
  data: VisibilityData,
  target: PromptImplementationTarget,
) {
  const files = buildPromptAnalysisFiles(subject, data, target);
  const bytes = zipSync(files, { level: 6 });
  const payload =
    bytes.buffer instanceof ArrayBuffer
      ? bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        )
      : Uint8Array.from(bytes).buffer;
  const blob = new Blob([payload], { type: "application/zip" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  const targetSlug = new URL(target.pageUrl).pathname
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  link.download = `${
    subject
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "prompt"
  }-${targetSlug || "site"}-suggested-geo-package.zip`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  return { filename: link.download, fileCount: Object.keys(files).length };
}
