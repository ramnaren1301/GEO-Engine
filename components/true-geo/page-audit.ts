export type BlockStatus = "extractable" | "not_extractable" | "structural";

export interface PageBlock {
  order: number;
  tag: string;
  label: string;
  text: string;
  status: BlockStatus;
  chars: number;
}

export interface BlockAuditStats {
  visible: number;
  notExtractable: number;
  structural: number;
  totalChars: number;
  humanBlocks: number;
}

export interface BlockAudit {
  url: string;
  blocks: PageBlock[];
  stats: BlockAuditStats;
  mode?: "live" | "synthetic_demo";
  disclosure?: string;
  error?: string;
}

const statuses = new Set<BlockStatus>([
  "extractable",
  "not_extractable",
  "structural",
]);

export function normalizeBlockAudit(
  input: Partial<BlockAudit> | undefined,
): BlockAudit | null {
  if (!input?.url || !Array.isArray(input.blocks) || !input.stats) return null;
  const blocks = input.blocks
    .slice(0, 240)
    .map((item, index): PageBlock | null => {
      const text = String(item?.text ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000);
      const status = statuses.has(item?.status as BlockStatus)
        ? (item.status as BlockStatus)
        : null;
      if (!text || !status) return null;
      return {
        order: Number.isFinite(Number(item.order))
          ? Math.round(Number(item.order))
          : index,
        tag: String(item.tag ?? "p")
          .toLowerCase()
          .slice(0, 24),
        label: String(item.label ?? text.slice(0, 60))
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 100),
        text,
        status,
        chars: Number.isFinite(Number(item.chars))
          ? Math.max(0, Math.round(Number(item.chars)))
          : text.length,
      };
    })
    .filter((item): item is PageBlock => Boolean(item));
  const content = blocks.filter((item) => item.status !== "structural");
  const structural = blocks.filter((item) => item.status === "structural");
  return {
    url: String(input.url).slice(0, 1000),
    blocks,
    stats: {
      visible: content.filter((item) => item.status === "extractable").length,
      notExtractable: content.filter(
        (item) => item.status === "not_extractable",
      ).length,
      structural: structural.length,
      totalChars: content.reduce((sum, item) => sum + item.chars, 0),
      humanBlocks: content.length,
    },
    mode:
      input.mode === "synthetic_demo"
        ? "synthetic_demo"
        : input.mode === "live"
          ? "live"
          : undefined,
    disclosure: input.disclosure
      ? String(input.disclosure).slice(0, 300)
      : undefined,
    error: input.error ? String(input.error).slice(0, 500) : undefined,
  };
}

export function contentBlocks(audit: BlockAudit) {
  return audit.blocks.filter((block) => block.status !== "structural");
}

export function structuralBlocks(audit: BlockAudit) {
  return audit.blocks.filter((block) => block.status === "structural");
}

export function auditPageTitle(audit: BlockAudit) {
  const metadata =
    structuralBlocks(audit).find((block) => block.tag === "metadata")?.text ??
    "";
  return (
    metadata.match(/(?:^|·\s*)Title:\s*([^·]+)/i)?.[1]?.trim() ||
    new URL(audit.url).hostname
  );
}

export function readableCharacterShare(audit: BlockAudit) {
  const blocks = contentBlocks(audit);
  const total = blocks.reduce((sum, block) => sum + block.chars, 0);
  const readable = blocks
    .filter((block) => block.status === "extractable")
    .reduce((sum, block) => sum + block.chars, 0);
  return total ? Math.round((readable / total) * 100) : 0;
}

export function hydrationContentGaps(audit: BlockAudit) {
  const total = Math.max(1, audit.stats.totalChars);
  const synthetic = audit.mode === "synthetic_demo";
  return contentBlocks(audit)
    .filter((block) => block.status === "not_extractable")
    .slice(0, 12)
    .map((block, index) => ({
      id: `hydration-gap-${block.order}`,
      rank: String(index + 1).padStart(2, "0"),
      title: `Make “${block.label}” visible to AI`,
      query: block.label,
      impact: `${Math.max(1, Math.round((block.chars / total) * 100))} page-text pts`,
      impactValue: Math.max(
        1,
        Math.min(100, Math.round((block.chars / total) * 100)),
      ),
      confidence: 100,
      cause: synthetic
        ? `In this synthetic URL scenario, the ${block.tag.toUpperCase()} block appears after hydration but its signature is absent from the simulated raw HTML.`
        : `People see this ${block.tag.toUpperCase()} block after the page loads, but its text signature is absent from the raw HTML that an AI crawler receives.`,
      fix: synthetic
        ? `Verify whether the real page has the same gap. If it does, render the matching ${block.tag.toUpperCase()} content in server-delivered HTML and keep its structured data in sync.`
        : `Render this exact ${block.tag.toUpperCase()} block in the server-delivered HTML. Keep the visible wording and any matching structured data in sync.`,
      evidence: [
        `Block ${String(block.order).padStart(2, "0")} in ${synthetic ? "synthetic" : "rendered"} page order`,
        `${block.chars} characters`,
        synthetic
          ? "Simulated as present after hydration"
          : "Present after hydration",
        synthetic
          ? "Simulated as absent from raw HTML"
          : "Absent from raw HTML",
      ],
      sourceUrls: [audit.url],
    }));
}
