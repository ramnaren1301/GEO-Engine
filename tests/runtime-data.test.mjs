import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";
import { createServer } from "vite";

const testRoot = new URL("..", import.meta.url).pathname;
const vite = await createServer({ appType: "custom", configFile: false, root: testRoot, resolve: { alias: { "@": testRoot } }, server: { middlewareMode: true } });
const runtime = await vite.ssrLoadModule("/components/true-geo/runtime.ts");
const artifacts = await vite.ssrLoadModule("/components/true-geo/fix-artifact.ts");
const htmlVisibility = await vite.ssrLoadModule("/components/true-geo/html-visibility.ts");
const prompts = await vite.ssrLoadModule("/components/true-geo/prompt-generator.ts");
const downloads = await vite.ssrLoadModule("/components/true-geo/download-package.ts");
const scanner = await vite.ssrLoadModule("/lib/visibility-scanner.ts");
const pageAudit = await vite.ssrLoadModule("/lib/page-audit.ts");
const pageAuditClient = await vite.ssrLoadModule("/components/true-geo/page-audit.ts");
const promptRunner = await vite.ssrLoadModule("/lib/prompt-runner.ts");
const promptRun = await vite.ssrLoadModule("/components/true-geo/prompt-run.ts");
const demoPrompts = await vite.ssrLoadModule("/components/true-geo/demo-prompts.ts");
const promptRoute = await vite.ssrLoadModule("/app/api/prompt/route.ts");
const visibilityRoute = await vite.ssrLoadModule("/app/api/visibility/route.ts");
const pageAuditRoute = await vite.ssrLoadModule("/app/api/page-audit/route.ts");
const syntheticScan = await vite.ssrLoadModule("/lib/synthetic-page-scan.ts");
const toolManifest = await vite.ssrLoadModule("/components/true-geo/tool-manifest.ts");

after(async () => vite.close());

test("no observation payload means no calculated dataset", () => {
  assert.throws(() => runtime.analyzeObservations("example.com", "United States", "Find gaps", []), /observation/i);
  assert.equal("createWorkspaceScan" in runtime, false);
});

test("returned model observations calculate a complete prompt visibility score without HTML evidence", () => {
  const observations = [
    { engine: "ChatGPT", query: "Best option", mentioned: true, cited: true, sentiment: 80, leader: "example.com", sourceUrls: ["https://example.com/a"] },
    { engine: "ChatGPT", query: "Most trusted", mentioned: false, cited: false, sentiment: 40, leader: "Competitor X", sourceUrls: [] },
    { engine: "Gemini", query: "Best option", mentioned: true, cited: true, sentiment: 70, leader: "example.com", sourceUrls: ["https://example.com/a"] },
    { engine: "Gemini", query: "Most trusted", mentioned: true, cited: false, sentiment: 90, leader: "Competitor Y", sourceUrls: ["https://example.com/b"] },
  ];
  const result = runtime.analyzeObservations("example.com", "United States", "Compare trust", observations);

  assert.match(result.modeLabel, /2 models · 2 answer dimensions/);
  assert.equal(result.answerCount, 4);
  assert.equal(result.promptCount, 2);
  assert.equal(result.metrics.shareOfAnswer, 75);
  assert.equal(result.metrics.citationRate, 50);
  assert.equal(result.runKind, "prompt");
  assert.equal(result.metrics.aiVisibilityScore, 68);
  assert.equal(result.models.find((item) => item.name === "ChatGPT").score, 53);
  assert.equal(result.models.find((item) => item.name === "Gemini").score, 78);
  assert.equal(result.sourcePages, 2);
  assert.equal(result.gaps[0].impactValue, 50);
  assert.ok(result.competitors.some((item) => item.name === "Competitor X"));
});

test("the final AI visibility score includes source-vs-hydrated HTML visibility", () => {
  const audit = htmlVisibility.normalizeHtmlAudit({
    pageUrl: "https://example.com/page", capturedAt: "2026-09-01T00:00:00Z",
    source: { textChars: 800, headings: 4, links: 10, jsonLdBlocks: 1, contentHash: "source" },
    hydrated: { textChars: 1000, headings: 5, links: 12, jsonLdBlocks: 1, contentHash: "hydrated" },
  }, "https://example.com/page");
  const observations = [
    { engine: "ChatGPT", query: "Is Page trustworthy?", sentimentTopic: "Trust", mentioned: true, cited: true, sentiment: 80, leader: "example.com", sourceUrls: ["https://example.com/page"], sourceKind: "live_url" },
    { engine: "Gemini", query: "Is Page trustworthy?", sentimentTopic: "Trust", mentioned: false, cited: false, sentiment: 40, leader: "Alternative", sourceUrls: [], sourceKind: "live_url" },
  ];
  const result = runtime.analyzeObservations("example.com", "United States", "Compare trust", observations, null, audit);

  assert.equal(audit.sourceVisibility, 80);
  assert.equal(audit.hydrationDependency, 20);
  assert.equal(result.metrics.aiVisibilityScore, 64);
  assert.match(result.summarySignal, /80% of (?:the )?post-hydration page text/);
});

test("domain prompt generation returns one specific prompt per sentiment topic", () => {
  const result = prompts.generateDomainPrompts("https://example.com", "https://example.com/cloud-platform");
  assert.deepEqual(result.map((item) => item.sentimentTopic), ["Trust", "Quality", "Value", "Experience", "Risk", "Recommendation"]);
  assert.ok(result.every((item) => item.query.includes("Cloud Platform") || item.query.includes("example.com")));
});

test("one page URL produces a disclosed synthetic block audit plus URL-scoped analysis", async () => {
  const result = await syntheticScan.scanSyntheticPage("https://example.com/cloud-platform");

  assert.equal(result.status, "ready");
  assert.equal(result.runtime, "synthetic_demo");
  assert.equal(result.isSynthetic, true);
  assert.match(result.disclosure, /synthetic demonstration/i);
  assert.match(result.disclosure, /not fetched or rendered/i);
  assert.equal(result.evidence.provenance, "synthetic");
  assert.equal(result.pageAudit.mode, "synthetic_demo");
  assert.equal(result.pageAudit.disclosure, result.disclosure);
  assert.equal(result.htmlAudit.method, "synthetic");
  assert.equal(result.htmlAudit.warning, result.disclosure);
  assert.match(result.evidence.title, /^Cloud Platform/);
  assert.equal(result.prompts.length, 6);
  assert.equal(result.crawlers.length, 4);
  assert.equal(result.observations.length, 24);
  assert.equal(result.pageAudit.stats.humanBlocks, 18);
  assert.ok(result.pageAudit.stats.visible > 0);
  assert.ok(result.pageAudit.stats.notExtractable > 0);
  assert.equal(result.pageAudit.blocks.filter((item) => item.status === "structural").length, 3);
  assert.match(result.pageAudit.blocks.find((item) => item.tag === "faq-schema").label, /1 question/);
  assert.equal(result.pageAudit.blocks.some((item) => /Demo site navigation|demonstration footer/.test(item.text)), false);
});

test("synthetic URL analysis is deterministic while remaining URL-specific", async () => {
  const first = await syntheticScan.scanSyntheticPage("https://example.com/catalog/cloud-platform");
  const second = await syntheticScan.scanSyntheticPage("https://example.com/catalog/cloud-platform");
  const different = await syntheticScan.scanSyntheticPage("https://example.com/catalog/security-platform");

  const stableProjection = (result) => ({
    pageUrl: result.pageUrl,
    pageAudit: result.pageAudit,
    prompts: result.prompts,
    observations: result.observations,
    crawlers: result.crawlers,
    html: { source: result.htmlAudit.source, hydrated: result.htmlAudit.hydrated, sourceVisibility: result.htmlAudit.sourceVisibility },
  });
  assert.deepEqual(stableProjection(second), stableProjection(first));
  assert.notDeepEqual(different.pageAudit.blocks, first.pageAudit.blocks);
  assert.notEqual(different.htmlAudit.hydrated.contentHash, first.htmlAudit.hydrated.contentHash);
});

test("public page-analysis routes complete without any outbound network access", async () => {
  const originalFetch = globalThis.fetch;
  let outboundCalls = 0;
  globalThis.fetch = async () => {
    outboundCalls += 1;
    throw new Error("Unexpected outbound network request");
  };
  try {
    const visibilityResponse = await visibilityRoute.POST(new Request("http://localhost/api/visibility", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageUrl: "https://example.com/catalog/cloud-platform" }),
    }));
    const visibility = await visibilityResponse.json();
    assert.equal(visibilityResponse.status, 200);
    assert.equal(visibility.runtime, "synthetic_demo");
    assert.equal(visibility.isSynthetic, true);

    const auditResponse = await pageAuditRoute.POST(new Request("http://localhost/api/page-audit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/catalog/cloud-platform" }),
    }));
    const audit = await auditResponse.json();
    assert.equal(auditResponse.status, 200);
    assert.equal(audit.mode, "synthetic_demo");
    assert.match(audit.disclosure, /not fetched or rendered/i);
    assert.equal(outboundCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("block audit keeps one human master list and classifies it by static signatures", () => {
  const raw = `<!doctype html><html><head><title>Buyer Guide</title><meta property="og:description" content="Plain guidance"><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Article"},{"@type":"FAQPage","mainEntity":[{},{}]}]}</script></head><body><nav><p>Skip navigation links</p></nav><main><h1>Complete buyer guide</h1><p>Choose the right option using verified ownership costs and clear trade-offs.</p></main></body></html>`;
  const rendered = raw.replace("</main>", "<p>Live inventory and personalized offers are inserted after hydration.</p><blockquote>Independent reviewers recommend checking the complete terms.</blockquote></main>");
  const result = pageAudit.buildBlockAudit("https://example.com/guide", raw, rendered);
  assert.deepEqual(Object.keys(result).sort(), ["blocks", "stats", "url"]);
  const content = result.blocks.filter((item) => item.status !== "structural");
  assert.deepEqual(content.map((item) => item.tag), ["h1", "p", "p", "blockquote"]);
  assert.deepEqual(content.map((item) => item.status), ["extractable", "extractable", "not_extractable", "not_extractable"]);
  assert.equal(result.stats.visible, 2);
  assert.equal(result.stats.notExtractable, 2);
  assert.match(result.blocks.find((item) => item.tag === "json-ld").text, /Article, FAQPage/);
  assert.match(result.blocks.find((item) => item.tag === "faq-schema").label, /2 questions/);
  assert.equal(content.some((item) => /Skip navigation/.test(item.text)), false);
  const gaps = pageAuditClient.hydrationContentGaps(result);
  assert.equal(gaps.length, 2);
  assert.ok(gaps.every((gap) => gap.sourceUrls[0] === result.url && /server-delivered HTML/.test(gap.fix)));
});

test("page-audit URL caching never accesses the hosted Worker default cache", async () => {
  const source = readFileSync(new URL("../lib/page-audit.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /caches\??\.default|platformCache|cacheRequest/);

  const raw = `<!doctype html><html><head><title>Cached Audit</title></head><body><main><h1>Cached audit page</h1><p>This server-delivered paragraph is readable by an AI crawler.</p></main></body></html>`;
  const rendered = raw.replace("</main>", "<p>This browser-rendered paragraph appears after hydration completes.</p></main>");
  let fetchCount = 0;
  let renderCount = 0;
  const options = {
    fetcher: async () => { fetchCount += 1; return new Response(raw, { status: 200, headers: { "content-type": "text/html" } }); },
    renderHtml: async () => { renderCount += 1; return rendered; },
  };

  const first = await pageAudit.auditPage("https://worker-cache.example/audit", options);
  const second = await pageAudit.auditPage("https://worker-cache.example/audit", options);
  assert.deepEqual(second, first);
  assert.equal(fetchCount, 1);
  assert.equal(renderCount, 1);
});

test("live scanner rejects local and private-network URLs", () => {
  assert.throws(() => scanner.assertPublicPageUrl("http://localhost:3000"), /public page/i);
  assert.throws(() => scanner.assertPublicPageUrl("http://192.168.1.10/page"), /private network/i);
});

test("a URL-independent model answer produces five scored prompt dimensions", () => {
  const sources = [{ title: "Evidence", url: "https://example.com/evidence" }];
  const observations = promptRunner.buildPromptObservations(
    "How is Ford positioned for reliability, and what risks matter?",
    "Ford",
    "gpt-5.6",
    "Ford has strong reliability benefits, but the best option depends on cost and risk. Research and current evidence support comparing limits before you choose. In 2026, the recommended approach is to verify the source.",
    sources,
  );
  const data = runtime.analyzeObservations("Ford", "Global", "How is Ford positioned for reliability, and what risks matter?", observations, null, null, [{ model: "gpt-5.6", answer: "Grounded answer about Ford", sources }]);

  assert.equal(observations.length, 5);
  assert.ok(observations.every((item) => item.sourceKind === "answer_engine"));
  assert.equal(data.runKind, "prompt");
  assert.equal(data.models[0].name, "gpt-5.6");
  assert.equal(data.modelAnswers[0].sources[0].url, sources[0].url);
  assert.equal(typeof data.metrics.aiVisibilityScore, "number");
  assert.ok(data.answerPrompts.some((item) => item.sentimentTopic === "Brand presence"));
});

test("prompt runtime is deterministic and never requires server credentials", () => {
  assert.equal(promptRunner.hasServerPromptRuntime({ OPENAI_API_KEY: "" }), false);
  assert.equal(promptRunner.hasServerPromptRuntime({ OPENAI_API_KEY: "secret" }), false);
  assert.equal(promptRunner.getServerPromptModel(), "Curated benchmark · 4 engines");
});

test("brand is inferred from the only prompt input", () => {
  assert.equal(promptRunner.extractBrandFromPrompt("How is Ford positioned for reliability compared with Toyota?"), "Ford");
  assert.equal(promptRunner.extractBrandFromPrompt("Compare Ford and Toyota on ownership value"), "Ford");
  assert.equal(promptRunner.extractBrandFromPrompt("Tell me about Nike reliability"), "Nike");
  assert.equal(promptRunner.extractBrandFromPrompt("is acme reliable for first-time buyers?"), "Acme");
  assert.throws(() => promptRunner.validateBrandPrompt("What are the strongest options for a first-time buyer?"), /Include the brand/);
});

test("curated catalog expands into a robust four-engine evidence set", async () => {
  const catalog = demoPrompts.demoPromptCatalog();
  const selected = catalog.prompts[0];
  const result = await promptRun.requestPromptRun(selected.prompt);
  assert.equal(catalog.scenarioCount, 8);
  assert.equal(catalog.expandedObservationCount, 192);
  assert.equal(result.brand, selected.brand);
  assert.equal(result.runtime, "curated_demo");
  assert.equal(result.answers.length, 4);
  assert.equal(new Set(result.answers.map((item) => item.answer)).size, 4);
  assert.ok(result.answers.every((item) => item.answer.includes(selected.brand)));
  assert.ok(result.answers.every((item) => item.sources.some((source) => source.url === result.target.pageUrl)));
  assert.equal(result.observations.length, 24);
  assert.deepEqual([...new Set(result.observations.map((item) => item.engine))], ["ChatGPT", "Gemini", "Perplexity", "Claude"]);
});

test("every curated prompt selects a unique implementation target without a URL input", async () => {
  const catalog = demoPrompts.demoPromptCatalog();
  const runs = await Promise.all(catalog.prompts.map((item) => promptRun.requestPromptRun(item.prompt)));
  assert.equal(new Set(runs.map((item) => item.target.pageUrl)).size, catalog.scenarioCount);
  assert.ok(runs.every((item) => item.target.scope === "specific-page"));
  assert.ok(runs.every((item) => item.target.derivation === "curated_prompt_target"));
});

test("prompt Next Steps package includes implementation files and exact target evidence", async () => {
  const selected = demoPrompts.demoPromptCatalog().prompts[0];
  const run = await promptRun.requestPromptRun(selected.prompt);
  const data = runtime.analyzeObservations(run.brand, "Global", run.prompt, run.observations, null, null, run.answers);
  const files = downloads.buildPromptAnalysisFiles(run.subject, data, run.target);
  assert.deepEqual(Object.keys(files).sort(), ["action-plan.json", "answer-dimensions.json", "answer-engine-scores.json", "content-preview.html", "faq-content.md", "faqs.json", "llms-full.txt", "llms.txt", "model-answers.md", "next-steps.md", "prompt.txt", "schema.json", "sources.json", "structured-data.jsonld", "webmcp-tools.json", "webmcp-tools.md"]);
  const decoder = new TextDecoder();
  const faq = JSON.parse(decoder.decode(files["faqs.json"]));
  const schema = JSON.parse(decoder.decode(files["structured-data.jsonld"]));
  const action = JSON.parse(decoder.decode(files["action-plan.json"]));
  const preview = decoder.decode(files["content-preview.html"]);
  const llms = decoder.decode(files["llms.txt"]);
  assert.equal(schema.url, run.target.pageUrl);
  assert.deepEqual(schema.mainEntity.map((item) => [item.name, item.acceptedAnswer.text]), faq.map((item) => [item.question, item.answer]));
  assert.ok(faq.every((item) => preview.includes(item.question) && preview.includes(item.answer)));
  assert.match(llms, new RegExp(`Canonical page: ${run.target.pageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.equal(action.runType, "prompt");
  assert.equal(action.pageUrl, run.target.pageUrl);
  assert.equal(action.reviewRequired, true);
});

test("prompt Next Steps UI requests the consolidated GEO package", () => {
  const source = readFileSync(new URL("../components/true-geo/PromptNextSteps.tsx", import.meta.url), "utf8");
  assert.match(source, /llms\.txt/);
  assert.match(source, /JSON-LD/);
  assert.match(source, /FAQs/);
  assert.match(source, /Download all suggested GEO files/);
  assert.doesNotMatch(source, /Download prompt analysis|implementation files remain exclusive/);
});

test("prompt API returns benchmark analysis without credentials", async () => {
  const selected = demoPrompts.demoPromptOptions[1];
  const response = await promptRoute.POST(new Request("http://localhost/api/prompt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: selected.prompt }) }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.runtime, "curated_demo");
  assert.equal(body.observations.length, 24);
});

test("hosted prompt route contains no OpenAI secret or external model call", async () => {
  const source = readFileSync(new URL("../app/api/prompt/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /OPENAI_API_KEY|api\.openai\.com|LanguageModel/);
  assert.match(source, /createDemoPromptRun/);
  assert.match(source, /demoPromptCatalog/);
});

test("WebMCP manifest keeps page and prompt inputs independent", () => {
  assert.equal(toolManifest.webMcpTools.length, 8);
  assert.deepEqual(toolManifest.webMcpTools.slice(0, 4).map((tool) => tool.name), ["geo_ai_visibility_audit", "geo_analyze_prompt", "geo_visibility_overview", "geo_list_tools"]);
  assert.match(toolManifest.toolsMarkdown(), /geo_ai_visibility_audit/);
  assert.match(toolManifest.toolsMarkdown(), /page_url/);
  const promptTool = toolManifest.webMcpTools.find((tool) => tool.name === "geo_analyze_prompt");
  assert.deepEqual(promptTool.inputSchema.required, ["prompt"]);
  assert.equal("page_url" in promptTool.inputSchema.properties, false);
  assert.deepEqual(Object.keys(promptTool.inputSchema.properties), ["prompt"]);
  const pageTool = toolManifest.webMcpTools.find((tool) => tool.name === "geo_ai_visibility_audit");
  assert.match(pageTool.description, /deterministic synthetic/i);
  assert.match(pageTool.description, /target page is not fetched/i);
  assert.doesNotMatch(pageTool.description, /real Chromium|live URL scan/i);
  assert.match(toolManifest.toolsMarkdown(), /synthetic/i);
});

test("repository exposes the direct browser WebMCP registration contract", () => {
  const source = readFileSync(new URL("../components/true-geo/webmcp.ts", import.meta.url), "utf8");
  assert.match(source, /document\.modelContext\.registerTool\(\{/);
  assert.match(source, /name: entry\.name/);
  assert.match(source, /description: entry\.description/);
  assert.match(source, /inputSchema: entry\.inputSchema/);
  assert.match(source, /execute: async \(input\)/);
});

test("Human and AI columns render the same ordered block instance", () => {
  const source = readFileSync(new URL("../components/true-geo/PageVisibilityAudit.tsx", import.meta.url), "utf8");
  assert.match(source, /blocks\.map\(\(block, index\) =>/);
  assert.match(source, /<HumanBlock block=\{block\} index=\{index\} \/>[\s\S]*?<AiBlock block=\{block\} index=\{index\} \/>/);
  assert.match(source, /Behind the page — Machine-Readable Signals/);
  assert.match(source, /Simulated Human View — Full Page/);
  assert.match(source, /Simulated AI Extraction/);
  assert.match(source, /target page was not fetched or rendered/i);
  assert.match(source, /Not visible to AI/);
});

test("production page routes use the synthetic engine and contain no renderer fallback", () => {
  const visibilitySource = readFileSync(new URL("../app/api/visibility/route.ts", import.meta.url), "utf8");
  const auditSource = readFileSync(new URL("../app/api/page-audit/route.ts", import.meta.url), "utf8");
  const combined = `${visibilitySource}\n${auditSource}`;
  assert.match(visibilitySource, /scanSyntheticPage/);
  assert.match(auditSource, /auditSyntheticPage/);
  assert.doesNotMatch(combined, /captureRenderedHtml|PAGE_AUDIT_RENDERER|MICROLINK|CLOUDFLARE|\bBROWSER\b|playwright|chromium/i);
  assert.doesNotMatch(combined, /request limit|renderer is not connected/i);
});

test("change values require a preceding submitted scan", () => {
  const firstInput = [{ engine: "ChatGPT", query: "Best option", mentioned: false, cited: false, sentiment: 40, leader: "Competitor X", sourceUrls: [] }];
  const nextInput = [{ engine: "ChatGPT", query: "Best option", mentioned: true, cited: true, sentiment: 80, leader: "example.com", sourceUrls: ["https://example.com/a"] }];
  const first = runtime.analyzeObservations("example.com", "United States", "Compare", firstInput);
  const next = runtime.analyzeObservations("example.com", "United States", "Compare", nextInput, first);

  assert.equal(first.metrics.shareDelta, null);
  assert.equal(next.metrics.shareDelta, 100);
  assert.equal(next.trend.length, 2);
  assert.equal(next.trend[1].target, 100);
});

test("content, JSON-LD, and preview data remain downloadable when a page blocks reading", () => {
  const gap = { id: "gap-1", rank: "01", title: "A question", query: "What does this page provide?", impact: "50 visibility pts", impactValue: 50, confidence: 90, cause: "Observed", fix: "Add the sourced answer to the selected page.", evidence: ["2 observations"], sourceUrls: ["https://example.com/page"] };
  const fallback = artifacts.createFixArtifact("https://example.com", "https://example.com/page", gap, { title: "Page", excerpt: "" });
  assert.equal(fallback.evidenceMode, "reachability_only");
  assert.equal(fallback.reviewRequired, true);
  assert.match(fallback.content.answer, /Draft for review/);
  assert.equal(fallback.jsonLd["@type"], "FAQPage");
  const result = artifacts.createFixArtifact("https://example.com", "https://example.com/page", gap, { title: "Verified page", excerpt: "This is the exact verified answer.", sourceUrl: "https://example.com/page" });
  assert.equal(result.evidenceMode, "verified_page");
  assert.equal(result.reviewRequired, false);
  assert.equal(result.content.answer, "This is the exact verified answer.");
  assert.equal(result.jsonLd["@type"], "FAQPage");
  assert.equal(result.jsonLd.url, "https://example.com/page");
  assert.equal(result.jsonLd.mainEntity[0].acceptedAnswer.text, result.content.answer);
  const synthetic = artifacts.createFixArtifact("https://example.com", "https://example.com/page", gap, { title: "Synthetic page", excerpt: "Synthetic evidence that must not be called verified.", sourceUrl: "https://example.com/page", provenance: "synthetic" });
  assert.equal(synthetic.evidenceMode, "synthetic_demo");
  assert.equal(synthetic.reviewRequired, true);
  assert.match(synthetic.content.answer, /Synthetic draft for review/);
});

test("download package contains every requested implementation artifact", () => {
  const gap = { id: "gap-1", rank: "01", title: "A question", query: "What does this page provide?", impact: "50 visibility pts", impactValue: 50, confidence: 90, cause: "Observed", fix: "Add the sourced answer to the selected page.", evidence: ["2 observations"], sourceUrls: ["https://example.com/page"] };
  const artifact = artifacts.createFixArtifact("https://example.com", "https://example.com/page", gap, { title: "Synthetic page", excerpt: "Synthetic scenario content.", sourceUrl: "https://example.com/page", provenance: "synthetic" });
  const audit = htmlVisibility.normalizeHtmlAudit({ method: "synthetic", source: { textChars: 900 }, hydrated: { textChars: 1000 }, warning: syntheticScan.SYNTHETIC_DISCLOSURE }, "https://example.com/page");
  const data = runtime.analyzeObservations("example.com", "United States", "Compare", [
    { engine: "ChatGPT", query: gap.query, sentimentTopic: "Value", mentioned: false, cited: false, sentiment: 58, leader: "Alternative", sourceUrls: ["https://example.com/page"], sourceKind: "live_url" },
    { engine: "ChatGPT", query: "How clear are warranty terms?", sentimentTopic: "Trust", mentioned: false, cited: false, sentiment: 52, leader: "Alternative", sourceUrls: ["https://example.com/page"], sourceKind: "live_url" },
  ], null, audit);
  data.pageAudit = { url: "https://example.com/page", mode: "synthetic_demo", disclosure: syntheticScan.SYNTHETIC_DISCLOSURE, blocks: [], stats: { visible: 0, notExtractable: 0, structural: 0, totalChars: 0, humanBlocks: 0 } };
  const files = downloads.buildOptimizationFiles({ targetLabel: "example.com", artifact, data, htmlAudit: audit });

  assert.deepEqual(Object.keys(files).sort(), ["DEMO-DISCLOSURE.txt", "action-plan.json", "answer-engine-scores.json", "content-preview.html", "faq-content.md", "faqs.json", "high-intent-prompts.json", "html-visibility-audit.json", "llms-full.txt", "llms.txt", "next-steps.md", "page-visibility-audit.json", "schema.json", "structured-data.jsonld", "webmcp-tools.json", "webmcp-tools.md"]);
  const decoder = new TextDecoder();
  const faq = JSON.parse(decoder.decode(files["faqs.json"]));
  const schema = JSON.parse(decoder.decode(files["structured-data.jsonld"]));
  const actionPlan = JSON.parse(decoder.decode(files["action-plan.json"]));
  const disclosure = decoder.decode(files["DEMO-DISCLOSURE.txt"]);
  assert.equal(faq.length, Math.max(1, data.gaps.length));
  assert.ok(faq.every((item) => item.evidenceMode === "synthetic_demo" && item.reviewRequired === true));
  assert.equal(schema.url, "https://example.com/page");
  assert.equal(schema.mainEntity.length, Math.max(1, data.gaps.length));
  assert.equal(new Set(faq.map((item) => item.answer)).size, faq.length);
  assert.equal(actionPlan.scope, "specific-page");
  assert.equal(actionPlan.pageUrl, "https://example.com/page");
  assert.equal(actionPlan.evidenceMode, "synthetic_demo");
  assert.equal(actionPlan.reviewRequired, true);
  assert.equal(actionPlan.pageVisibilityAudit.mode, "synthetic_demo");
  assert.match(disclosure, /target page was not fetched or rendered/i);
  assert.match(disclosure, /require verification/i);
  assert.match(decoder.decode(files["llms.txt"]), /Canonical page: https:\/\/example.com\/page/);
  assert.match(decoder.decode(files["llms.txt"]), /Synthetic target — not fetched/i);
});
