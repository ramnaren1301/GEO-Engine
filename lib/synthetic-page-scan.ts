import type { BlockAudit } from "../components/true-geo/page-audit";
import type { LiveScanResult } from "../components/true-geo/live-scan";
import { auditPage } from "./page-audit";
import { assertPublicPageUrl } from "./public-url";
import { scanPage } from "./visibility-scanner";

export const SYNTHETIC_DISCLOSURE =
  "Synthetic demonstration generated from the entered URL. The target page was not fetched or rendered.";

type SyntheticPair = {
  url: URL;
  rawHtml: string;
  humanHtml: string;
  crawlerHtml: Record<string, string>;
};

type SyntheticBlock = { tag: string; text: string; extractable: boolean };

const hash = (value: string) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1)
    result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return result >>> 0;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const titleCase = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(
      (part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`,
    )
    .join(" ");

function pageIdentity(url: URL) {
  const parts = url.pathname
    .split("/")
    .filter(Boolean)
    .map((part) =>
      titleCase(decodeURIComponent(part).replace(/[^\p{L}\p{N}\s_-]+/gu, " ")),
    )
    .filter(Boolean);
  const host = url.hostname.replace(/^www\./i, "");
  const site = titleCase(host.split(".")[0] || "Example");
  const title = parts.at(-1) || site;
  const category = parts.at(-2) || "Overview";
  return { host, site, title, category };
}

function syntheticBlocks(url: URL): SyntheticBlock[] {
  const { site, title, category } = pageIdentity(url);
  const seed = hash(url.href);
  const visitor = ["buyer", "customer", "visitor", "decision-maker"][seed % 4];
  const option = ["choices", "options", "plans", "solutions"][(seed >>> 3) % 4];
  const proof = [
    "clear evidence",
    "verifiable details",
    "plain-language proof",
    "source-backed guidance",
  ][(seed >>> 6) % 4];
  const hiddenShift = seed % 3;
  const hidden = new Set([
    4 + hiddenShift,
    7,
    8 + (hiddenShift % 2),
    11,
    12 + (hiddenShift % 2),
    15,
  ]);
  const rows: Array<[string, string]> = [
    ["h1", `Explore ${title}`],
    [
      "p",
      `This synthetic ${category.toLowerCase()} page introduces ${title} on ${site} and demonstrates the information a ${visitor} may use when researching a decision.`,
    ],
    ["h2", `A quick overview of ${title}`],
    [
      "p",
      `The server-delivered summary explains the purpose of this page, the main ${option}, and where a visitor can find ${proof}.`,
    ],
    ["h2", `Interactive ${option} for ${title}`],
    [
      "p",
      `A simulated comparison panel appears only after JavaScript loads, including filters, expandable details, and a personalized recommendation path.`,
    ],
    [
      "li",
      `Compare the most relevant ${option} side by side before making a decision.`,
    ],
    [
      "li",
      `Review important trade-offs, eligibility details, and the evidence behind each choice.`,
    ],
    ["h2", "Pricing, availability, and current details"],
    [
      "p",
      `In this demonstration, current ${title} details are inserted after hydration and are therefore absent from the original page source.`,
    ],
    ["h2", "Questions people ask before deciding"],
    [
      "p",
      `The source HTML includes a basic answer explaining what ${title} is and who the page is intended to help.`,
    ],
    [
      "p",
      `A second simulated answer covering cost, limitations, and next steps is loaded dynamically and cannot be extracted from raw HTML.`,
    ],
    ["h2", "Trust, support, and ownership"],
    [
      "blockquote",
      `Good decision content makes benefits, limitations, sources, and responsibilities equally easy to understand.`,
    ],
    [
      "p",
      `The final simulated recommendation is personalized in the browser, so an AI crawler reading only source HTML would miss it.`,
    ],
    ["h2", `Next steps for ${title}`],
    [
      "p",
      `Use the visible overview, compare the available ${option}, verify the supporting evidence, and choose the next action that fits the visitor's needs.`,
    ],
  ];
  return rows.map(([tag, text], index) => ({
    tag,
    text,
    extractable: !hidden.has(index),
  }));
}

function renderBlocks(blocks: SyntheticBlock[], indexes: Set<number>) {
  return blocks
    .flatMap((block, index) =>
      indexes.has(index)
        ? [`<${block.tag}>${escapeHtml(block.text)}</${block.tag}>`]
        : [],
    )
    .join("\n");
}

function renderDocument(
  url: URL,
  blocks: SyntheticBlock[],
  indexes: Set<number>,
  schemaEnabled: boolean,
) {
  const { site, title, category } = pageIdentity(url);
  const description = `Synthetic ${title} visibility scenario for ${site}, demonstrating source HTML versus post-hydration content in the ${category.toLowerCase()} journey.`;
  const schema = schemaEnabled
    ? `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: title, url: url.href }, { "@type": "BreadcrumbList" }, { "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: `What should someone know about ${title}?`, acceptedAnswer: { "@type": "Answer", text: "Review the visible overview, trade-offs, and supporting evidence before deciding." } }] }] }).replaceAll("<", "\\u003c")}</script>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)} | ${escapeHtml(site)}</title><meta name="description" content="${escapeHtml(description)}">${schema}</head><body><header><p>Demo site navigation</p></header><nav><a href="${escapeHtml(url.origin)}">Home</a><a href="${escapeHtml(url.href)}">${escapeHtml(title)}</a></nav><main>${renderBlocks(blocks, indexes)}</main><footer><p>Synthetic demonstration footer</p></footer></body></html>`;
}

export function syntheticHtmlPair(pageInput: string): SyntheticPair {
  const url = assertPublicPageUrl(pageInput);
  const blocks = syntheticBlocks(url);
  const rawIndexes = new Set(
    blocks.flatMap((block, index) => (block.extractable ? [index] : [])),
  );
  const allIndexes = new Set(blocks.map((_, index) => index));
  const rawHtml = renderDocument(url, blocks, rawIndexes, true);
  const humanHtml = renderDocument(url, blocks, allIndexes, true);
  const engineNames = ["GPTBot", "Googlebot", "PerplexityBot", "ClaudeBot"];
  const crawlerHtml = Object.fromEntries(
    engineNames.map((engine, engineIndex) => {
      const selected = new Set(
        [...rawIndexes].filter(
          (_, index) =>
            (index + engineIndex + (hash(url.href) % 3)) % (5 + engineIndex) !==
            0,
        ),
      );
      return [engine, renderDocument(url, blocks, selected, engineIndex !== 2)];
    }),
  );
  return { url, rawHtml, humanHtml, crawlerHtml };
}

function syntheticFetcher(pair: SyntheticPair): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requested = new URL(
      typeof input === "string" || input instanceof URL
        ? String(input)
        : input.url,
    );
    if (requested.pathname === "/robots.txt")
      return new Response("User-agent: *\nAllow: /", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    const userAgent = new Headers(init?.headers).get("user-agent") ?? "";
    const engine = Object.keys(pair.crawlerHtml).find((name) =>
      userAgent.includes(name),
    );
    const html = engine ? pair.crawlerHtml[engine] : pair.rawHtml;
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }) as typeof fetch;
}

export async function auditSyntheticPage(
  pageInput: string,
): Promise<BlockAudit> {
  const pair = syntheticHtmlPair(pageInput);
  const audit = await auditPage(pair.url.href, {
    fetcher: syntheticFetcher(pair),
    renderHtml: async () => pair.humanHtml,
    bypassCache: true,
  });
  return { ...audit, mode: "synthetic_demo", disclosure: SYNTHETIC_DISCLOSURE };
}

export async function scanSyntheticPage(
  pageInput: string,
): Promise<LiveScanResult> {
  const pair = syntheticHtmlPair(pageInput);
  const result = await scanPage(
    pair.url.href,
    syntheticFetcher(pair),
    async () => pair.humanHtml,
  );
  return {
    ...result,
    runtime: "synthetic_demo",
    isSynthetic: true,
    disclosure: SYNTHETIC_DISCLOSURE,
    evidence: { ...result.evidence, provenance: "synthetic" },
    pageAudit: {
      ...result.pageAudit,
      mode: "synthetic_demo",
      disclosure: SYNTHETIC_DISCLOSURE,
    },
    htmlAudit: {
      ...result.htmlAudit,
      method: "synthetic",
      warning: SYNTHETIC_DISCLOSURE,
    },
  };
}
