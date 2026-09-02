export type HtmlSnapshot = {
  textChars: number;
  headings: number;
  links: number;
  jsonLdBlocks: number;
  contentHash: string;
};

export type HtmlContentBlock = {
  id: string;
  order: number;
  kind: "heading" | "paragraph" | "list" | "quote" | "other";
  text: string;
  chars: number;
};

export type HtmlBlockComparison = {
  id: string;
  order: number;
  source: HtmlContentBlock | null;
  hydrated: HtmlContentBlock | null;
  status: "same" | "changed" | "hydrated_only" | "source_only";
  similarity: number;
};

export type HtmlVisibilityAudit = {
  pageUrl: string;
  capturedAt: string;
  method?: "playwright" | "synthetic";
  source: HtmlSnapshot;
  hydrated: HtmlSnapshot;
  sourceVisibility: number;
  hydrationDependency: number;
  blockComparisons?: HtmlBlockComparison[];
  warning?: string;
};

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));
const finite = (value: unknown) =>
  Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

const snapshot = (input: Partial<HtmlSnapshot> | undefined): HtmlSnapshot => ({
  textChars: Math.round(finite(input?.textChars)),
  headings: Math.round(finite(input?.headings)),
  links: Math.round(finite(input?.links)),
  jsonLdBlocks: Math.round(finite(input?.jsonLdBlocks)),
  contentHash: String(input?.contentHash ?? "").slice(0, 128),
});

const contentBlock = (
  input: Partial<HtmlContentBlock> | null | undefined,
  fallbackOrder: number,
): HtmlContentBlock | null => {
  if (!input?.text?.trim()) return null;
  const text = String(input.text).replace(/\s+/g, " ").trim().slice(0, 1200);
  const kind = ["heading", "paragraph", "list", "quote", "other"].includes(
    String(input.kind),
  )
    ? (input.kind as HtmlContentBlock["kind"])
    : "other";
  return {
    id: String(input.id || `block-${fallbackOrder}`).slice(0, 120),
    order: Math.round(finite(input.order ?? fallbackOrder)),
    kind,
    text,
    chars: Math.round(finite(input.chars ?? text.length)),
  };
};

export function normalizeHtmlAudit(
  input: Partial<HtmlVisibilityAudit> | undefined,
  fallbackUrl: string,
): HtmlVisibilityAudit | null {
  if (!input?.source || !input?.hydrated) return null;
  const source = snapshot(input.source);
  const hydrated = snapshot(input.hydrated);
  if (!hydrated.textChars) return null;
  const calculatedVisibility = clamp(
    (source.textChars / hydrated.textChars) * 100,
  );
  const sourceVisibility =
    input.sourceVisibility === undefined
      ? calculatedVisibility
      : clamp(finite(input.sourceVisibility));
  const blockComparisons = (input.blockComparisons ?? [])
    .slice(0, 40)
    .map((item, index) => {
      const sourceBlock = contentBlock(item.source, index);
      const hydratedBlock = contentBlock(item.hydrated, index);
      if (!sourceBlock && !hydratedBlock) return null;
      const allowed = ["same", "changed", "hydrated_only", "source_only"];
      const status = allowed.includes(String(item.status))
        ? item.status
        : sourceBlock && hydratedBlock
          ? "changed"
          : sourceBlock
            ? "source_only"
            : "hydrated_only";
      return {
        id: String(item.id || `comparison-${index}`).slice(0, 120),
        order: Math.round(finite(item.order ?? index)),
        source: sourceBlock,
        hydrated: hydratedBlock,
        status,
        similarity: clamp(finite(item.similarity)),
      } as HtmlBlockComparison;
    })
    .filter((item): item is HtmlBlockComparison => Boolean(item));
  return {
    pageUrl: String(input.pageUrl || fallbackUrl).slice(0, 500),
    capturedAt: String(input.capturedAt || new Date().toISOString()).slice(
      0,
      80,
    ),
    method: input.method,
    source,
    hydrated,
    sourceVisibility,
    hydrationDependency:
      input.hydrationDependency === undefined
        ? 100 - sourceVisibility
        : clamp(finite(input.hydrationDependency)),
    blockComparisons,
    warning: input.warning ? String(input.warning).slice(0, 300) : undefined,
  };
}
