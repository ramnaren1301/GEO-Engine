import type { BlockAudit, PageBlock } from "../components/true-geo/page-audit";
import { assertPublicPageUrl } from "./public-url";

type FetchLike = typeof fetch;
type RenderHtml = (url: string) => Promise<string>;
type AuditOptions = { fetcher?: FetchLike; renderHtml?: RenderHtml; bypassCache?: boolean };

const TARGET_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "figcaption", "blockquote", "td"]);
const EXCLUDED_TAGS = new Set(["script", "style", "noscript", "header", "footer", "nav"]);
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const CACHE_TTL_MS = 15 * 60_000;
const MAX_MEMORY_CACHE_ENTRIES = 25;
const MAX_HTML_BYTES = 4_000_000;
const memoryCache = new Map<string, { expiresAt: number; audit: BlockAudit }>();

const ENTITY_MAP: Record<string, string> = {
  amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"',
  ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…", copy: "©", reg: "®", trade: "™",
};

export function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, code: string) => {
    if (code[0] !== "#") return ENTITY_MAP[code.toLowerCase()] ?? entity;
    const numeric = code[1]?.toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
    try { return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : entity; } catch { return entity; }
  });
}

export function normalizeAuditText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const collapse = (value: string) => decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
const signature = (value: string) => normalizeAuditText(value).slice(0, 60);

function labelFor(tag: string, text: string) {
  if (/^h[1-6]$/.test(tag)) return text.slice(0, 100);
  const firstSentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || text;
  return firstSentence.length > 60 ? `${firstSentence.slice(0, 57).trimEnd()}…` : firstSentence;
}

type StackEntry = { tag: string; excluded: boolean };
type ActiveBlock = { tag: string; depth: number; chunks: string[]; sequence: number };

/**
 * Small, deterministic HTML tokenizer for the exact block selectors used by the
 * audit. It preserves document order and textContent semantics, including text
 * nested inside inline elements, without executing any page code.
 */
export function extractOrderedBlocks(html: string) {
  const stack: StackEntry[] = [];
  const active: ActiveBlock[] = [];
  const completed: Array<{ tag: string; text: string; sequence: number }> = [];
  let excludedDepth = 0;
  let sequence = 0;
  const tokens = html.match(/<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>|[^<]+/g) ?? [];

  const appendText = (value: string) => {
    if (excludedDepth || !active.length) return;
    const text = collapse(value);
    if (!text) return;
    active.forEach((block) => block.chunks.push(text));
  };
  const finish = (tag: string, depth: number) => {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      const block = active[index];
      if (block.tag !== tag || block.depth !== depth) continue;
      active.splice(index, 1);
      const text = collapse(block.chunks.join(" "));
      if (text) completed.push({ tag: block.tag, text, sequence: block.sequence });
      break;
    }
  };

  for (const token of tokens) {
    if (!token.startsWith("<")) { appendText(token); continue; }
    if (/^<!--|^<!/i.test(token)) continue;
    const closing = /^<\//.test(token);
    const tag = token.match(/^<\/?\s*([A-Za-z][\w:-]*)/)?.[1]?.toLowerCase();
    if (!tag) continue;
    if (closing) {
      let matchIndex = -1;
      for (let index = stack.length - 1; index >= 0; index -= 1) if (stack[index].tag === tag) { matchIndex = index; break; }
      if (matchIndex < 0) continue;
      finish(tag, matchIndex + 1);
      const removed = stack.splice(matchIndex);
      excludedDepth = Math.max(0, excludedDepth - removed.filter((item) => item.excluded).length);
      continue;
    }
    const excluded = excludedDepth > 0 || EXCLUDED_TAGS.has(tag);
    stack.push({ tag, excluded: EXCLUDED_TAGS.has(tag) });
    if (EXCLUDED_TAGS.has(tag)) excludedDepth += 1;
    if (!excluded && TARGET_TAGS.has(tag)) active.push({ tag, depth: stack.length, chunks: [], sequence: sequence++ });
    if (tag === "br") appendText(" ");
    if (/\/\s*>$/.test(token) || VOID_TAGS.has(tag)) {
      finish(tag, stack.length);
      const removed = stack.pop();
      if (removed?.excluded) excludedDepth = Math.max(0, excludedDepth - 1);
    }
  }
  active.slice().reverse().forEach((block) => finish(block.tag, block.depth));

  const seen = new Set<string>();
  return completed.sort((left, right) => left.sequence - right.sequence).flatMap(({ tag, text }) => {
    const key = normalizeAuditText(text);
    if (text.length < 12 || !key || seen.has(key)) return [];
    seen.add(key);
    return [{ tag, text, label: labelFor(tag, text), chars: text.length }];
  });
}

export function extractStaticText(html: string) {
  const stack: StackEntry[] = [];
  const chunks: string[] = [];
  let excludedDepth = 0;
  for (const token of html.match(/<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>|[^<]+/g) ?? []) {
    if (!token.startsWith("<")) { if (!excludedDepth) chunks.push(collapse(token)); continue; }
    if (/^<!--|^<!/i.test(token)) continue;
    const closing = /^<\//.test(token);
    const tag = token.match(/^<\/?\s*([A-Za-z][\w:-]*)/)?.[1]?.toLowerCase();
    if (!tag) continue;
    if (closing) {
      let matchIndex = -1;
      for (let index = stack.length - 1; index >= 0; index -= 1) if (stack[index].tag === tag) { matchIndex = index; break; }
      if (matchIndex >= 0) {
        const removed = stack.splice(matchIndex);
        excludedDepth = Math.max(0, excludedDepth - removed.filter((item) => item.excluded).length);
      }
      continue;
    }
    const excluded = EXCLUDED_TAGS.has(tag);
    stack.push({ tag, excluded });
    if (excluded) excludedDepth += 1;
    if (/\/\s*>$/.test(token) || VOID_TAGS.has(tag)) {
      const removed = stack.pop();
      if (removed?.excluded) excludedDepth = Math.max(0, excludedDepth - 1);
    }
  }
  return collapse(chunks.filter(Boolean).join(" "));
}

function attr(tag: string, name: string) {
  const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  if (quoted) return collapse(quoted[2]);
  return collapse(tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i"))?.[1] ?? "");
}

function schemaSignals(html: string) {
  const types = new Set<string>();
  let faqCount = 0;
  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(walk); return; }
    const record = value as Record<string, unknown>;
    const declared = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
    declared.filter((item): item is string => typeof item === "string").forEach((item) => types.add(item));
    if (declared.includes("FAQPage") && Array.isArray(record.mainEntity)) faqCount += record.mainEntity.length;
    Object.values(record).forEach(walk);
  };
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attr(match[1], "type").toLowerCase() !== "application/ld+json") continue;
    try { walk(JSON.parse(match[2].trim())); } catch { /* Invalid JSON-LD remains absent instead of being invented. */ }
  }
  return { types: [...types].sort(), faqCount };
}

function documentMetadata(html: string) {
  const title = collapse(html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? "");
  let description = "";
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const name = (attr(match[0], "name") || attr(match[0], "property")).toLowerCase();
    if (name === "description" || name === "og:description") { description ||= attr(match[0], "content"); }
  }
  return { title, description };
}

export function buildBlockAudit(url: string, staticHtml: string, humanHtml: string): BlockAudit {
  const metadata = documentMetadata(staticHtml);
  const schema = schemaSignals(staticHtml);
  const normalizedStaticText = normalizeAuditText(extractStaticText(staticHtml));
  const human = extractOrderedBlocks(humanHtml);
  const content: PageBlock[] = human.map((block, index) => {
    const blockSignature = signature(block.text);
    const readable = block.text.length < 8 || Boolean(blockSignature && normalizedStaticText.includes(blockSignature));
    return { order: index + 1, tag: block.tag, label: block.label, text: block.text, chars: block.chars, status: readable ? "extractable" : "not_extractable" };
  });
  const structural: PageBlock[] = [
    { order: -3, tag: "metadata", label: "Document Metadata", text: metadata.title || metadata.description ? [metadata.title && `Title: ${metadata.title}`, metadata.description && `Description: ${metadata.description}`].filter(Boolean).join(" · ") : "No title or page description was found in the raw HTML.", status: "structural", chars: (metadata.title + metadata.description).length },
    { order: -2, tag: "json-ld", label: "Structured Data (Schema.org)", text: schema.types.length ? schema.types.join(", ") : "No Schema.org types were found in JSON-LD.", status: "structural", chars: schema.types.join(", ").length },
    { order: -1, tag: "faq-schema", label: `FAQ Schema (${schema.faqCount} question${schema.faqCount === 1 ? "" : "s"})`, text: schema.faqCount ? `${schema.faqCount} FAQ question${schema.faqCount === 1 ? " is" : "s are"} available directly in page-source JSON-LD.` : "No FAQPage questions were found in page-source JSON-LD.", status: "structural", chars: schema.faqCount },
  ];
  return {
    url,
    blocks: [...structural, ...content],
    stats: {
      visible: content.filter((block) => block.status === "extractable").length,
      notExtractable: content.filter((block) => block.status === "not_extractable").length,
      structural: structural.length,
      totalChars: content.reduce((sum, block) => sum + block.chars, 0),
      humanBlocks: content.length,
    },
  };
}

async function fetchRawHtml(url: URL, fetcher: FetchLike) {
  let current = url;
  for (let redirect = 0; redirect < 5; redirect += 1) {
    const response = await fetcher(current, {
      method: "GET",
      redirect: "manual",
      headers: { accept: "text/html,application/xhtml+xml;q=0.9", "cache-control": "no-cache", "user-agent": "TRUE-GEO-Static-Audit/1.0" },
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      current = assertPublicPageUrl(new URL(response.headers.get("location")!, current).href);
      continue;
    }
    if (!response.ok) throw new Error(`The page returned HTTP ${response.status}. A raw page response is required for the AI-side comparison.`);
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_HTML_BYTES) throw new Error("The page is too large to audit safely.");
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    if (!html.trim()) throw new Error("The page returned an empty HTML response.");
    return html;
  }
  throw new Error("The page redirected too many times.");
}

async function workerRuntime() {
  try {
    const cloudflare = await import("cloudflare:workers");
    return cloudflare.env as unknown as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function runtimeValue(runtime: Record<string, unknown>, key: string) {
  const fromWorker = runtime[key];
  if (typeof fromWorker === "string" && fromWorker.trim()) return fromWorker.trim();
  if (typeof process !== "undefined") return process.env[key]?.trim() || "";
  return "";
}

async function renderedHtmlFromResponse(response: Response) {
  const body = await response.text();
  if (!response.ok) throw new Error(`The browser renderer returned HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") || body.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(body) as { html?: string; result?: string | { html?: string }; error?: string };
      const html = parsed.html ?? (typeof parsed.result === "string" ? parsed.result : parsed.result?.html);
      if (html?.trim()) return html.slice(0, MAX_HTML_BYTES);
      if (parsed.error) throw new Error(parsed.error);
    } catch (error) {
      if (error instanceof Error && !/JSON/.test(error.message)) throw error;
    }
  }
  if (!body.trim()) throw new Error("The browser renderer returned an empty document.");
  return body.slice(0, MAX_HTML_BYTES);
}

export async function captureRenderedHtml(url: string): Promise<string> {
  const runtime = await workerRuntime();
  const browser = runtime.BROWSER as { quickAction?: (name: string, input: Record<string, unknown>) => Promise<Response> } | undefined;
  if (browser?.quickAction) {
    const response = await browser.quickAction("content", { url, gotoOptions: { waitUntil: "networkidle0", timeout: 25_000 }, rejectResourceTypes: ["image", "media", "font"] });
    return renderedHtmlFromResponse(response);
  }

  const rendererUrl = runtimeValue(runtime, "PAGE_AUDIT_RENDERER_URL");
  if (rendererUrl) {
    const token = runtimeValue(runtime, "PAGE_AUDIT_RENDERER_TOKEN");
    const response = await fetch(rendererUrl, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ url, waitUntil: "networkidle" }), signal: AbortSignal.timeout(35_000) });
    return renderedHtmlFromResponse(response);
  }

  const accountId = runtimeValue(runtime, "CLOUDFLARE_ACCOUNT_ID");
  const apiToken = runtimeValue(runtime, "CLOUDFLARE_API_TOKEN");
  if (accountId && apiToken) {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/browser-rendering/content`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
      body: JSON.stringify({ url, gotoOptions: { waitUntil: "networkidle0", timeout: 25_000 }, rejectResourceTypes: ["image", "media", "font"] }),
      signal: AbortSignal.timeout(35_000),
    });
    return renderedHtmlFromResponse(response);
  }

  throw new Error("Live rendering is disabled in the synthetic demo build. Use the synthetic page routes or connect an explicit renderer for local live-audit development.");
}

function cachedAudit(url: string, now: number) {
  const cached = memoryCache.get(url);
  if (!cached) return undefined;
  if (cached.expiresAt <= now) {
    memoryCache.delete(url);
    return undefined;
  }
  // Refresh insertion order so the least-recently-used URL is evicted first.
  memoryCache.delete(url);
  memoryCache.set(url, cached);
  return cached.audit;
}

function cacheAudit(url: string, audit: BlockAudit, now: number) {
  for (const [key, cached] of memoryCache) {
    if (cached.expiresAt <= now) memoryCache.delete(key);
  }
  memoryCache.delete(url);
  while (memoryCache.size >= MAX_MEMORY_CACHE_ENTRIES) {
    const oldest = memoryCache.keys().next().value as string | undefined;
    if (!oldest) break;
    memoryCache.delete(oldest);
  }
  memoryCache.set(url, { expiresAt: now + CACHE_TTL_MS, audit });
}

export async function auditPage(input: string, options: AuditOptions = {}): Promise<BlockAudit> {
  const pageUrl = assertPublicPageUrl(input).href;
  const now = Date.now();
  if (!options.bypassCache) {
    const cached = cachedAudit(pageUrl, now);
    if (cached) return cached;
  }

  const fetcher = options.fetcher ?? fetch;
  const renderer = options.renderHtml ?? captureRenderedHtml;
  const [staticHtml, humanHtml] = await Promise.all([fetchRawHtml(new URL(pageUrl), fetcher), renderer(pageUrl)]);
  const audit = buildBlockAudit(pageUrl, staticHtml, humanHtml);
  cacheAudit(pageUrl, audit, now);
  return audit;
}
