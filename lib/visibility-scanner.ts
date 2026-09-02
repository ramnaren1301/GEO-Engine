import type { HtmlContentBlock, HtmlSnapshot, HtmlVisibilityAudit } from "../components/true-geo/html-visibility";
import type { CrawlerCheck, LiveScanResult } from "../components/true-geo/live-scan";
import { generateDomainPrompts, type DomainPrompt } from "../components/true-geo/prompt-generator";
import type { AnswerObservation } from "../components/true-geo/runtime";
import { auditPageTitle, contentBlocks, readableCharacterShare } from "../components/true-geo/page-audit";
import { auditPage } from "./page-audit";
import { assertPublicPageUrl } from "./public-url";

export { assertPublicPageUrl } from "./public-url";

type FetchLike = typeof fetch;
type PageCopy = { title: string; description: string; text: string; excerpt: string; snapshot: HtmlSnapshot; scripts: number; blocks: HtmlContentBlock[] };
type FetchResult = { status: number; text: string; url: URL };

const crawlers = [
  { engine: "ChatGPT", crawler: "GPTBot", userAgent: "Mozilla/5.0 AppleWebKit/537.36; compatible; GPTBot/1.2; +https://openai.com/gptbot" },
  { engine: "Gemini", crawler: "Googlebot", userAgent: "Mozilla/5.0 AppleWebKit/537.36; compatible; Googlebot/2.1; +http://www.google.com/bot.html" },
  { engine: "Perplexity", crawler: "PerplexityBot", userAgent: "Mozilla/5.0 AppleWebKit/537.36; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot" },
  { engine: "Claude", crawler: "ClaudeBot", userAgent: "Mozilla/5.0 AppleWebKit/537.36; compatible; ClaudeBot/1.0; +https://anthropic.com/claudebot" },
];

const topicTerms: Record<string, string[]> = {
  Trust: ["trust", "trusted", "secure", "verified", "official", "privacy", "transparent"],
  Quality: ["quality", "reliable", "complete", "detailed", "performance", "standard", "durable"],
  Value: ["value", "benefit", "saving", "price", "cost", "outcome", "included"],
  Experience: ["experience", "easy", "support", "service", "simple", "customer", "use"],
  Risk: ["risk", "limit", "concern", "safety", "issue", "warranty", "requirement"],
  Recommendation: ["best", "recommend", "ideal", "suitable", "choose", "option", "compare"],
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const decode = (value: string) => value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
const clean = (value: string) => decode(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const matchCount = (value: string, pattern: RegExp) => value.match(pattern)?.length ?? 0;
const emptySnapshot = (): HtmlSnapshot => ({ textChars: 0, headings: 0, links: 0, jsonLdBlocks: 0, contentHash: hashText("") });
const blockKind = (tag: string): HtmlContentBlock["kind"] => /^h[1-6]$/.test(tag) ? "heading" : tag === "li" ? "list" : tag === "blockquote" ? "quote" : tag === "p" ? "paragraph" : "other";

function blocksFromHtml(html: string) {
  const blocks: HtmlContentBlock[] = [];
  const seen = new Set<string>();
  const body = html.replace(/<!--([\s\S]*?)-->/g, " ").replace(/<(script|style|template|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const pattern = /<(h[1-6]|p|li|blockquote|figcaption)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  for (const match of body.matchAll(pattern)) {
    const text = clean(match[2]).slice(0, 1200);
    const key = text.toLowerCase();
    if (text.length < 12 || seen.has(key)) continue;
    seen.add(key);
    blocks.push({ id: `source-${blocks.length + 1}-${hashText(text)}`, order: blocks.length, kind: blockKind(match[1].toLowerCase()), text, chars: text.length });
    if (blocks.length >= 30) break;
  }
  return blocks;
}

function htmlCopy(html: string): PageCopy {
  const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "Untitled page").slice(0, 160);
  const description = clean(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] ?? "").slice(0, 500);
  const body = html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|template|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const text = clean(body).slice(0, 180000);
  const blocks = blocksFromHtml(body);
  return {
    title, description, text, excerpt: (description || text.slice(0, 900)).slice(0, 900), scripts: matchCount(html, /<script\b/gi),
    blocks, snapshot: {
      textChars: text.length,
      headings: matchCount(html, /<h[1-6]\b/gi),
      links: matchCount(html, /<a\b/gi),
      jsonLdBlocks: matchCount(html, /<script[^>]+type=["']application\/ld\+json["']/gi),
      contentHash: hashText(text),
    },
  };
}

function urlCopy(url: URL): PageCopy {
  const slug = decodeURIComponent(url.pathname).split("/").filter(Boolean).pop() ?? url.hostname;
  const title = slug.split(/[\s_-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") || url.hostname;
  return { title: title.slice(0, 160), description: "", text: "", excerpt: "", scripts: 0, blocks: [], snapshot: emptySnapshot() };
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function fetchText(fetcher: FetchLike, initialUrl: URL, userAgent: string, limit = 2_000_000) {
  let url = initialUrl;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await fetcher(url, { redirect: "manual", headers: { accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5", "accept-language": "en-US,en;q=0.9", "cache-control": "no-cache", "user-agent": userAgent }, signal: AbortSignal.timeout(15000) });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) { url = assertPublicPageUrl(new URL(response.headers.get("location")!, url).href); continue; }
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > limit) throw new Error("The page is too large to scan safely.");
    return { status: response.status, text: (await response.text()).slice(0, limit), url };
  }
  throw new Error("The page redirected too many times.");
}

function pageCandidates(pageUrl: URL) {
  const candidates: URL[] = [];
  const add = (candidate: URL) => { if (!candidates.some((item) => item.href === candidate.href)) candidates.push(candidate); };
  const addPathVariants = (candidate: URL) => {
    add(candidate);
    if (candidate.pathname !== "/" && !candidate.pathname.endsWith("/")) { const withSlash = new URL(candidate); withSlash.pathname += "/"; add(withSlash); }
  };
  addPathVariants(new URL(pageUrl));
  const labels = pageUrl.hostname.split(".");
  if (labels.length === 2 && labels.every(Boolean)) { const withWww = new URL(pageUrl); withWww.hostname = `www.${pageUrl.hostname}`; addPathVariants(withWww); }
  else if (pageUrl.hostname.startsWith("www.") && labels.length === 3) { const withoutWww = new URL(pageUrl); withoutWww.hostname = pageUrl.hostname.slice(4); addPathVariants(withoutWww); }
  return candidates;
}

async function firstReadable(fetcher: FetchLike, candidates: URL[], userAgent: string): Promise<{ result: FetchResult; pageUrl: URL } | null> {
  let last: { result: FetchResult; pageUrl: URL } | null = null;
  for (const pageUrl of candidates) {
    try {
      const result = await fetchText(fetcher, pageUrl, userAgent);
      last = { result, pageUrl };
      if (result.status >= 200 && result.status < 400 && result.text.trim()) return last;
    } catch { /* Try the next canonical variant. */ }
  }
  return last;
}

function robotsAllows(robots: string, crawler: string, path: string) {
  if (!robots.trim()) return true;
  const groups = robots.split(/\n\s*\n/).map((group) => group.split(/\r?\n/).map((line) => line.replace(/#.*/, "").trim()).filter(Boolean));
  const relevant = groups.filter((lines) => lines.some((line) => /^user-agent\s*:/i.test(line) && ["*", crawler.toLowerCase()].includes(line.split(":").slice(1).join(":").trim().toLowerCase())));
  const rules = relevant.flatMap((lines) => lines.filter((line) => /^(allow|disallow)\s*:/i.test(line)).map((line) => { const [kind, ...rest] = line.split(":"); return { allow: kind.toLowerCase() === "allow", path: rest.join(":").trim() }; })).filter((rule) => rule.path && path.startsWith(rule.path));
  return rules.sort((a, b) => b.path.length - a.path.length)[0]?.allow ?? true;
}

function promptAnswerability(prompt: string, copy: PageCopy) {
  const stopWords = new Set("a an and are as at be before by can compared does for from how in is it of on or should someone that the their this to using what when which who why with would your".split(" "));
  const terms = [...new Set(prompt.toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((term) => !stopWords.has(term)) ?? [])].slice(0, 18);
  const matched = terms.filter((term) => copy.text.toLowerCase().includes(term)).length;
  const overlap = terms.length ? matched / terms.length : 0;
  return clamp(overlap * 70 + Math.min(15, copy.snapshot.textChars / 300) + Math.min(15, copy.snapshot.headings * 2 + copy.snapshot.jsonLdBlocks * 5));
}

function topicSignal(topic: string, text: string) {
  const terms = topicTerms[topic] ?? [];
  const hits = terms.filter((term) => text.toLowerCase().includes(term)).length;
  return clamp(35 + hits * 9);
}

export async function scanPage(pageInput: string, fetcher: FetchLike = fetch, renderHtml?: (url: string) => Promise<string>): Promise<LiveScanResult> {
  const pageUrl = assertPublicPageUrl(pageInput);
  const domainUrl = pageUrl.origin;
  const genericAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";
  const robotsUrl = new URL("/robots.txt", pageUrl.origin);
  const candidates = pageCandidates(pageUrl);
  const [pageAudit, sourceAttempt, robotsResult] = await Promise.all([
    auditPage(pageUrl.href, { fetcher, renderHtml, bypassCache: Boolean(renderHtml) }),
    firstReadable(fetcher, candidates, genericAgent),
    fetchText(fetcher, robotsUrl, genericAgent, 500_000).catch(() => ({ status: 0, text: "", url: robotsUrl })),
  ]);
  const directSourceReady = Boolean(sourceAttempt && sourceAttempt.result.status >= 200 && sourceAttempt.result.status < 400 && sourceAttempt.result.text.trim());
  const effectiveUrl = sourceAttempt && directSourceReady ? sourceAttempt.pageUrl : pageUrl;
  const crawlerResults = await Promise.all(crawlers.map((crawler) => fetchText(fetcher, effectiveUrl, crawler.userAgent).catch(() => ({ status: 0, text: "", url: effectiveUrl }))));
  const fallback = urlCopy(pageUrl);
  const source = directSourceReady ? htmlCopy(sourceAttempt!.result.text) : { ...fallback, blocks: [], snapshot: emptySnapshot() };
  const auditedContent = contentBlocks(pageAudit);
  const renderedText = auditedContent.map((block) => block.text).join(" ");
  const renderedBlocks: HtmlContentBlock[] = auditedContent.map((block, index) => ({ id: `human-${index + 1}-${hashText(block.text)}`, order: index, kind: blockKind(block.tag), text: block.text, chars: block.chars }));
  const rendered: PageCopy = {
    title: auditPageTitle(pageAudit),
    description: pageAudit.blocks.find((block) => block.tag === "metadata")?.text ?? "",
    text: renderedText,
    excerpt: renderedText.slice(0, 900),
    scripts: 0,
    blocks: renderedBlocks,
    snapshot: {
      textChars: pageAudit.stats.totalChars,
      headings: auditedContent.filter((block) => /^h[1-6]$/.test(block.tag)).length,
      links: source.snapshot.links,
      jsonLdBlocks: source.snapshot.jsonLdBlocks,
      contentHash: hashText(renderedText),
    },
  };
  const sourceVisibility = readableCharacterShare(pageAudit);
  const readableChars = auditedContent.filter((block) => block.status === "extractable").reduce((sum, block) => sum + block.chars, 0);
  const canonicalNote = effectiveUrl.href !== pageUrl.href ? ` The scanner recovered through the canonical variant ${effectiveUrl.href}.` : "";
  const htmlAudit: HtmlVisibilityAudit = {
    pageUrl: pageUrl.href, capturedAt: new Date().toISOString(), method: "playwright",
    source: { ...source.snapshot, textChars: readableChars }, hydrated: rendered.snapshot, sourceVisibility, hydrationDependency: 100 - sourceVisibility,
    blockComparisons: auditedContent.map((block, index) => {
      const hydrated = renderedBlocks[index];
      return { id: `audit-${index}-${hashText(block.text)}`, order: index, source: block.status === "extractable" ? hydrated : null, hydrated, status: block.status === "extractable" ? "same" as const : "hydrated_only" as const, similarity: block.status === "extractable" ? 100 : 0 };
    }),
    warning: `Real-browser audit compares the raw HTTP response with the post-hydration DOM, block by block.${canonicalNote}`,
  };
  const crawlerChecks: CrawlerCheck[] = crawlers.map((crawler, index) => {
    const result = crawlerResults[index];
    const copy = result.status >= 200 && result.status < 400 && result.text.trim() ? htmlCopy(result.text) : fallback;
    const robotsAllowed = robotsAllows(robotsResult.text, crawler.crawler, pageUrl.pathname);
    const accessible = result.status >= 200 && result.status < 400 && copy.snapshot.textChars > 100;
    const content = accessible ? Math.min(30, copy.snapshot.textChars / 200) : 0;
    const structure = accessible ? Math.min(20, copy.snapshot.headings * 2 + copy.snapshot.links / 10) : 0;
    const schema = accessible ? Math.min(15, copy.snapshot.jsonLdBlocks * 8) : 0;
    return { engine: crawler.engine, crawler: crawler.crawler, accessible, robotsAllowed, status: result.status, textChars: copy.snapshot.textChars, score: clamp((accessible ? 25 : 0) + (robotsAllowed ? 10 : 0) + content + structure + schema) };
  });
  const evidenceCopy = rendered;
  const evidence = { title: evidenceCopy.title, description: evidenceCopy.description, excerpt: evidenceCopy.excerpt, sourceUrl: pageUrl.href };
  const prompts: DomainPrompt[] = generateDomainPrompts(domainUrl, pageUrl.href, evidence);
  const analyses = prompts.map((prompt) => ({ ...prompt, answerability: promptAnswerability(prompt.query, rendered) }));
  const observations: AnswerObservation[] = crawlerChecks.flatMap((crawler) => analyses.map((analysis) => {
    const readiness = analysis.answerability * crawler.score / 100;
    return { engine: crawler.engine, query: analysis.query, sentimentTopic: analysis.sentimentTopic, mentioned: readiness >= 45, cited: readiness >= 62 && source.snapshot.links > 0, sentiment: clamp(topicSignal(analysis.sentimentTopic, rendered.text) * .55 + analysis.answerability * .45), leader: readiness >= 45 ? "Target page" : "No answer found", sourceUrls: readiness >= 45 ? [pageUrl.href] : [], sourceKind: "live_url" as const };
  }));
  return { status: "ready", pageUrl: pageUrl.href, domainUrl, scannedAt: new Date().toISOString(), evidence, pageAudit, htmlAudit, prompts, observations, crawlers: crawlerChecks };
}
