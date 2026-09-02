"use client";

import {
  BookOpenText,
  Bot,
  Code2,
  Link2,
  Network,
  Radio,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityPanel } from "./ActivityPanel";
import { AgentRail, type ChatMessage } from "./AgentRail";
import { AnswerMap } from "./AnswerMap";
import { type ActivityItem, tabs, type TabId } from "./data";
import {
  downloadOptimizationPackage,
  downloadPromptAnalysisPackage,
} from "./download-package";
import { EvidenceEmpty } from "./EvidenceEmpty";
import { createFixArtifact, type FixArtifact } from "./fix-artifact";
import { FixPanel } from "./FixPanel";
import { GapsPanel } from "./GapsPanel";
import type { CrawlerCheck } from "./live-scan";
import { requestPageScan } from "./live-scan";
import { Overview } from "./Overview";
import { PageAuditLoading } from "./PageVisibilityAudit";
import { hydrationContentGaps } from "./page-audit";
import type { DomainPrompt } from "./prompt-generator";
import { demoPromptOptions } from "./demo-prompts";
import type { PromptRunPayload } from "./prompt-analysis";
import { PromptBar, type RunMode } from "./PromptBar";
import { PromptNextSteps } from "./PromptNextSteps";
import { requestPromptRun } from "./prompt-run";
import {
  analyzeObservations,
  type PageEvidence,
  type VisibilityData,
} from "./runtime";
import { ToolsDialog } from "./ToolsDialog";
import { webMcpTools } from "./tool-manifest";
import { useWebMCP } from "./webmcp";

type Target = { domainUrl: string; pageUrl: string };
const pageReadyActivity: ActivityItem[] = [
  {
    id: 1,
    tool: "page_workflow_ready",
    detail: "Enter one page URL to run a URL-scoped synthetic AI visibility demo",
    time: "Now",
    status: "complete",
  },
];
const promptReadyActivity: ActivityItem[] = [
  {
    id: 2,
    tool: "prompt_workflow_ready",
    detail: "Choose a curated prompt; no page URL or model runtime is used",
    time: "Now",
    status: "complete",
  },
];
const pageReadyMessages: ChatMessage[] = [
  {
    id: 1,
    role: "agent",
    text: "Enter one page URL. Every tab will stay scoped to a deterministic synthetic scenario for that URL; the target page will not be fetched.",
  },
];
const promptReadyMessages: ChatMessage[] = [
  {
    id: 2,
    role: "agent",
    text: "Choose a benchmark prompt. Every tab will stay scoped to that exact prompt, brand, four-engine evidence set, and ranked gaps.",
  },
];

function validatedPage(value: string): Target {
  if (!value.trim()) throw new Error("Enter the page URL to analyze.");
  const page = new URL(value.trim());
  if (!/^https?:$/.test(page.protocol))
    throw new Error("The page URL must begin with http:// or https://.");
  page.hash = "";
  return { domainUrl: page.origin, pageUrl: page.href };
}

const targetLabelOf = (pageUrl: string) => {
  try {
    return new URL(pageUrl).hostname;
  } catch {
    return "Target page";
  }
};
const pageSnapshot = (target: Target, data: VisibilityData | null) =>
  data
    ? {
        status: "ready",
        run_type: "page",
        runtime: "synthetic_demo",
        is_synthetic: true,
        disclosure:
          data.pageAudit?.disclosure ??
          "Synthetic demonstration generated from the entered URL. The target page was not fetched or rendered.",
        target: { page_url: target.pageUrl, domain_url: target.domainUrl },
        run_id: data.scanId,
        ran_at: data.scannedAt,
        prompts_scored: data.promptCount,
        answer_engines: data.modelCount,
        ai_visibility_score: data.metrics.aiVisibilityScore,
        answer_coverage: data.metrics.shareOfAnswer,
        citation_readiness: data.metrics.citationRate,
        sentiment_signals: data.metrics.positiveSentiment,
        source_html_visibility: data.htmlAudit?.sourceVisibility ?? null,
        human_blocks: data.pageAudit?.stats.humanBlocks ?? null,
        ai_readable_blocks: data.pageAudit?.stats.visible ?? null,
        not_extractable_blocks: data.pageAudit?.stats.notExtractable ?? null,
        page_audit: data.pageAudit,
        top_gap_id: data.gaps[0]?.id ?? null,
      }
    : {
        status: "not_run",
        run_type: "page",
        runtime: "synthetic_demo",
        is_synthetic: true,
        target: { page_url: target.pageUrl || null },
        message: "Run AI visibility for this page to calculate scores.",
      };
const promptSnapshot = (
  run: PromptRunPayload | null,
  data: VisibilityData | null,
) =>
  data && run
    ? {
        status: "ready",
        run_type: "prompt",
        input: { prompt: run.prompt, brand: run.brand },
        brand: run.brand,
        engine: run.model,
        runtime: run.runtime,
        run_id: data.scanId,
        ran_at: data.scannedAt,
        ai_visibility_score: data.metrics.aiVisibilityScore,
        answer_coverage: data.metrics.shareOfAnswer,
        citation_rate: data.metrics.citationRate,
        sentiment_signals: data.metrics.positiveSentiment,
        answer_engine_scores: data.models,
        top_gap_id: data.gaps[0]?.id ?? null,
      }
    : {
        status: "not_run",
        run_type: "prompt",
        message: "Run a brand-specific prompt to calculate scores.",
      };

export function TrueGeoApp() {
  const [mode, setMode] = useState<RunMode>("visibility");
  const [tab, setTab] = useState<TabId>("pulse");
  const [pageUrl, setPageUrl] = useState("");
  const [pageTarget, setPageTarget] = useState<Target | null>(null);
  const [prompt, setPrompt] = useState(demoPromptOptions[0]?.prompt ?? "");
  const [targetError, setTargetError] = useState("");
  const [pageData, setPageData] = useState<VisibilityData | null>(null);
  const [promptData, setPromptData] = useState<VisibilityData | null>(null);
  const [promptRun, setPromptRun] = useState<PromptRunPayload | null>(null);
  const [pageEvidence, setPageEvidence] = useState<PageEvidence | null>(null);
  const [generatedPrompts, setGeneratedPrompts] = useState<DomainPrompt[]>([]);
  const [crawlers, setCrawlers] = useState<CrawlerCheck[]>([]);
  const [artifact, setArtifact] = useState<FixArtifact | null>(null);
  const [pageSelectedGap, setPageSelectedGap] = useState("");
  const [promptSelectedGap, setPromptSelectedGap] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mcpStatus, setMcpStatus] = useState<
    "checking" | "registered" | "unavailable" | "error"
  >("checking");
  const [pageActivity, setPageActivity] =
    useState<ActivityItem[]>(pageReadyActivity);
  const [promptActivity, setPromptActivity] =
    useState<ActivityItem[]>(promptReadyActivity);
  const [pageMessages, setPageMessages] =
    useState<ChatMessage[]>(pageReadyMessages);
  const [promptMessages, setPromptMessages] =
    useState<ChatMessage[]>(promptReadyMessages);
  const targetRef = useRef<Target>({ domainUrl: "", pageUrl: "" });
  const data = mode === "visibility" ? pageData : promptData;
  const selectedGap =
    mode === "visibility" ? pageSelectedGap : promptSelectedGap;
  const activity = mode === "visibility" ? pageActivity : promptActivity;
  const messages = mode === "visibility" ? pageMessages : promptMessages;
  const activeGap =
    data?.gaps.find((gap) => gap.id === selectedGap) ?? data?.gaps[0] ?? null;
  const activeArtifact =
    mode === "visibility" && activeGap && artifact?.gapId === activeGap.id
      ? artifact
      : null;
  const targetLabel =
    mode === "visibility"
      ? targetLabelOf(pageUrl)
      : (promptRun?.subject ?? "Prompt topic");
  const overviewTarget = mode === "visibility" && pageData ? pageTarget : null;

  const addActivity = (
    scope: RunMode,
    tool: string,
    detail: string,
    status: ActivityItem["status"] = "complete",
  ) => {
    const update = (items: ActivityItem[]) =>
      [{ id: Date.now(), tool, detail, time: "Now", status }, ...items].slice(
        0,
        10,
      );
    if (scope === "visibility") setPageActivity(update);
    else setPromptActivity(update);
  };
  const addMessage = (
    scope: RunMode,
    role: ChatMessage["role"],
    text: string,
  ) => {
    const update = (items: ChatMessage[]) => [
      ...items,
      { id: Date.now() + Math.random(), role, text },
    ];
    if (scope === "visibility") setPageMessages(update);
    else setPromptMessages(update);
  };
  const setSelectedGap = (value: string) => {
    if (mode === "visibility") setPageSelectedGap(value);
    else setPromptSelectedGap(value);
  };
  const clearPageResults = () => {
    setPageData(null);
    setPageTarget(null);
    setPageEvidence(null);
    setGeneratedPrompts([]);
    setCrawlers([]);
    setArtifact(null);
    setPageSelectedGap("");
    setPageActivity(pageReadyActivity);
    setPageMessages(pageReadyMessages);
  };
  const clearPromptResults = () => {
    setPromptData(null);
    setPromptRun(null);
    setPromptSelectedGap("");
    setPromptActivity(promptReadyActivity);
    setPromptMessages(promptReadyMessages);
  };
  const changePage = (value: string) => {
    setPageUrl(value);
    setTargetError("");
    if (pageData && value.trim() !== targetRef.current.pageUrl)
      clearPageResults();
  };
  const changePrompt = (value: string) => {
    setPrompt(value);
    setTargetError("");
    if (promptData && value.trim() !== promptRun?.prompt) clearPromptResults();
  };

  const performVisibility = async (requestedUrl = pageUrl) => {
    if (scanning) return { status: "already_running" };
    let target: Target;
    try {
      target = validatedPage(requestedUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Enter a valid page URL.";
      setTargetError(message);
      return { status: "rejected", message };
    }
    const changed = targetRef.current.pageUrl !== target.pageUrl;
    if (changed) clearPageResults();
    targetRef.current = target;
    setPageTarget(target);
    setPageUrl(target.pageUrl);
    setMode("visibility");
    setTab("pulse");
    setTargetError("");
    setScanning(true);
    setProgress(12);
    addActivity(
      "visibility",
      "geo_ai_visibility_audit",
      `Generating synthetic evidence for ${target.pageUrl}`,
      "running",
    );
    const timer = window.setInterval(
      () => setProgress((value) => Math.min(88, value + 7)),
      320,
    );
    try {
      const live = await requestPageScan(target.pageUrl);
      setProgress(100);
      const measured = analyzeObservations(
        targetLabelOf(target.pageUrl),
        "Global",
        "Synthetic page AI visibility demo",
        live.observations,
        changed ? null : pageData,
        live.htmlAudit,
      );
      const hydrationGaps = hydrationContentGaps(live.pageAudit);
      const next: VisibilityData = {
        ...measured,
        pageAudit: live.pageAudit,
        gaps: (hydrationGaps.length
          ? [...hydrationGaps, ...measured.gaps]
          : measured.gaps
        )
          .slice(0, 12)
          .map((gap, index) => ({
            ...gap,
            rank: String(index + 1).padStart(2, "0"),
          })),
      };
      const topGap = next.gaps[0];
      const nextArtifact = topGap
        ? createFixArtifact(
            target.domainUrl,
            target.pageUrl,
            topGap,
            live.evidence,
          )
        : null;
      setPageData(next);
      setPageEvidence(live.evidence);
      setGeneratedPrompts(live.prompts);
      setCrawlers(live.crawlers);
      setPageSelectedGap(topGap?.id ?? "");
      setArtifact(nextArtifact);
      setPageActivity((items) =>
        items.map((item, index) =>
          index === 0
            ? {
                ...item,
                detail: `${live.pageAudit.stats.visible} readable blocks · ${live.pageAudit.stats.notExtractable} hydration-only blocks · ${live.pageAudit.stats.totalChars.toLocaleString()} characters`,
                status: "complete",
              }
            : item,
        ),
      );
      addMessage(
        "visibility",
        "agent",
        `The synthetic Human vs AI audit is ready for ${target.pageUrl}: ${live.pageAudit.stats.visible} simulated blocks are extractable and ${live.pageAudit.stats.notExtractable} are hydration-only. The target page was not fetched, and every tab remains scoped to this URL scenario.`,
      );
      return pageSnapshot(target, next);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The page could not be analyzed.";
      setTargetError(message);
      addActivity("visibility", "geo_ai_visibility_audit", message);
      addMessage("visibility", "agent", message);
      return { status: "rejected", message };
    } finally {
      window.clearInterval(timer);
      window.setTimeout(() => {
        setScanning(false);
        setProgress(0);
      }, 260);
    }
  };

  const performPrompt = async (requestedPrompt = prompt) => {
    if (scanning) return { status: "already_running" };
    const cleanPrompt = requestedPrompt.trim();
    if (cleanPrompt.length < 3) {
      const message = "Enter a prompt with at least 3 characters.";
      setTargetError(message);
      return { status: "rejected", message };
    }
    const comparable = promptRun?.prompt === cleanPrompt ? promptData : null;
    setPrompt(cleanPrompt);
    setMode("prompt");
    setTab("pulse");
    setTargetError("");
    setScanning(true);
    setProgress(10);
    addActivity(
      "prompt",
      "geo_analyze_prompt",
      "Replaying the selected four-engine benchmark",
      "running",
    );
    const timer = window.setInterval(
      () => setProgress((value) => Math.min(90, value + 5)),
      420,
    );
    try {
      const result = await requestPromptRun(cleanPrompt);
      setProgress(100);
      const next = analyzeObservations(
        result.brand,
        "Global",
        result.prompt,
        result.observations,
        comparable,
        null,
        result.answers,
      );
      setPromptRun(result);
      setPromptData(next);
      setPromptSelectedGap(next.gaps[0]?.id ?? "");
      setPromptActivity((items) =>
        items.map((item, index) =>
          index === 0
            ? {
                ...item,
                detail: `${result.brand} prompt visibility ${next.metrics.aiVisibilityScore}/100 · ${next.modelCount} engines · ${next.answerCount} scored observations`,
                status: "complete",
              }
            : item,
        ),
      );
      addMessage(
        "prompt",
        "agent",
        `${result.brand} prompt visibility is ${next.metrics.aiVisibilityScore}/100. Every score, gap, and next step is tied to this selected prompt and its curated four-engine evidence; no page URL or paid model was used.`,
      );
      return promptSnapshot(result, next);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The prompt could not be run.";
      setTargetError(message);
      addActivity("prompt", "geo_analyze_prompt", message);
      addMessage("prompt", "agent", message);
      return { status: "rejected", message };
    } finally {
      window.clearInterval(timer);
      window.setTimeout(() => {
        setScanning(false);
        setProgress(0);
      }, 260);
    }
  };

  const stageFix = (gapId: string) => {
    const gap = data?.gaps.find((item) => item.id === gapId) ?? data?.gaps[0];
    if (!gap)
      return {
        status: "not_ready",
        message: `Run ${mode === "prompt" ? "a prompt" : "AI visibility"} first.`,
      };
    setSelectedGap(gap.id);
    setTab("fixes");
    if (mode === "prompt") {
      addActivity(
        "prompt",
        "geo_generate_next_steps",
        `Opened ${promptRun?.brand ?? "brand"}-specific answer improvements for ${gap.title}`,
      );
      return {
        status: "package_ready",
        gap_id: gap.id,
        files: 16,
        target: promptRun?.target.pageUrl,
        run_type: "prompt",
      };
    }
    if (!pageEvidence)
      return { status: "not_ready", message: "Run AI visibility first." };
    const next = createFixArtifact(
      targetRef.current.domainUrl,
      targetRef.current.pageUrl,
      gap,
      pageEvidence,
    );
    setArtifact(next);
    addActivity(
      "visibility",
      "geo_generate_next_steps",
      `Generated synthetic URL-scoped draft content, JSON-LD, preview, and download package for ${gap.title}`,
    );
    return {
      status: "package_ready",
      gap_id: gap.id,
      files: 16,
      run_type: "page",
    };
  };

  const downloadPackage = () => {
    if (mode === "prompt") {
      if (!promptData || !promptRun)
        return { status: "not_ready", message: "Run a prompt first." };
      const result = downloadPromptAnalysisPackage(
        promptRun.subject,
        promptData,
        promptRun.target,
      );
      addActivity(
        "prompt",
        "geo_download_package",
        `Downloaded ${result.fileCount} prompt-led GEO implementation and evidence files for ${promptRun.target.pageUrl} as ${result.filename}`,
      );
      addMessage("prompt", "agent", `Downloaded ${result.filename}.`);
      return {
        status: "downloaded",
        filename: result.filename,
        file_count: result.fileCount,
        run_type: "prompt",
      };
    }
    if (!pageData)
      return { status: "not_ready", message: "Run AI visibility first." };
    const artifactForDownload =
      activeArtifact ??
      (activeGap && pageEvidence
        ? createFixArtifact(
            targetRef.current.domainUrl,
            targetRef.current.pageUrl,
            activeGap,
            pageEvidence,
          )
        : null);
    if (!artifactForDownload)
      return {
        status: "not_ready",
        message: "No URL-specific recommendations are ready yet.",
      };
    const result = downloadOptimizationPackage({
      targetLabel,
      artifact: artifactForDownload,
      data: pageData,
      htmlAudit: pageData.htmlAudit,
    });
    addActivity(
      "visibility",
      "geo_download_package",
      `Downloaded ${result.fileCount} URL-specific page implementation files as ${result.filename}`,
    );
    addMessage("visibility", "agent", `Downloaded ${result.filename}.`);
    return {
      status: "downloaded",
      filename: result.filename,
      file_count: result.fileCount,
      run_type: "page",
    };
  };

  const selectGap = (gapId: string) => {
    const gap = data?.gaps.find((item) => item.id === gapId);
    setSelectedGap(gapId);
    if (mode === "visibility" && gap && pageEvidence)
      setArtifact(
        createFixArtifact(
          targetRef.current.domainUrl,
          targetRef.current.pageUrl,
          gap,
          pageEvidence,
        ),
      );
  };
  const explainGap = (gapId: string) => {
    const gap = data?.gaps.find((item) => item.id === gapId) ?? data?.gaps[0];
    if (!gap)
      return {
        status: "not_ready",
        message: `Run ${mode === "prompt" ? "a prompt" : "AI visibility"} first.`,
      };
    setSelectedGap(gap.id);
    setTab("gaps");
    return {
      status: "explained",
      run_type: mode === "visibility" ? "page" : "prompt",
      gap_id: gap.id,
      confidence: gap.confidence,
      visibility_gap: gap.impactValue,
      evidence: gap.evidence,
      cause: gap.cause,
    };
  };

  const handleCommand = (text: string) => {
    addMessage(mode, "user", text);
    const urls = text.match(/https?:\/\/[^\s]+/g) ?? [];
    if (urls[0]) {
      setMode("visibility");
      changePage(urls[0]);
      addMessage(
        "visibility",
        "agent",
        `Page URL set to ${urls[0]}. Run AI Visibility when ready.`,
      );
      return;
    }
    const normalized = text.toLowerCase();
    if (normalized.includes("tool")) {
      setToolsOpen(true);
      return;
    }
    if (normalized.includes("download")) {
      downloadPackage();
      return;
    }
    if (normalized.includes("run prompt")) {
      setMode("prompt");
      void performPrompt();
      return;
    }
    if (normalized.includes("visibility") || normalized.includes("scan")) {
      setMode("visibility");
      void performVisibility();
      return;
    }
    if (mode === "prompt" && !promptData) {
      addMessage(
        "prompt",
        "agent",
        "Choose one of the curated prompts above, then run it.",
      );
      return;
    }
    if (!data) {
      addMessage(
        mode,
        "agent",
        mode === "prompt"
          ? "Enter a prompt that names the brand, then run it."
          : "Enter the page URL first, then run AI visibility.",
      );
      return;
    }
    if (
      normalized.includes("next") ||
      normalized.includes("fix") ||
      normalized.includes("json") ||
      normalized.includes("preview")
    ) {
      stageFix(selectedGap);
      return;
    }
    if (normalized.includes("gap") || normalized.includes("why")) {
      const result = explainGap(selectedGap);
      if ("cause" in result && typeof result.cause === "string")
        addMessage(mode, "agent", result.cause);
      return;
    }
    addMessage(mode, "agent", data.summarySignal);
  };

  useWebMCP({
    runVisibility: (url) => performVisibility(url),
    runPrompt: (value) => performPrompt(value),
    snapshot: () =>
      mode === "prompt"
        ? promptSnapshot(promptRun, promptData)
        : pageSnapshot(targetRef.current, pageData),
    listTools: () => ({
      version: "4.3",
      count: webMcpTools.length,
      tools: webMcpTools,
    }),
    explainGap,
    stageFix,
    downloadPackage,
    exportPlan: () =>
      data
        ? {
            ...(mode === "prompt"
              ? promptSnapshot(promptRun, promptData)
              : pageSnapshot(targetRef.current, pageData)),
            answer_dimensions: data.answerPrompts,
            answer_engine_scores: data.models,
            cited_sources: data.modelAnswers.flatMap((item) => item.sources),
            generated_prompts:
              mode === "visibility" ? generatedPrompts : undefined,
            crawler_checks: mode === "visibility" ? crawlers : undefined,
            page_visibility_audit:
              mode === "visibility" ? data.pageAudit : undefined,
            priorities: data.gaps,
            package_ready:
              mode === "prompt" ? Boolean(promptRun) : Boolean(artifact),
            webmcp_tools: webMcpTools.map((tool) => tool.name),
          }
        : mode === "prompt"
          ? promptSnapshot(null, null)
          : pageSnapshot(targetRef.current, null),
    navigate: setTab,
    setStatus: setMcpStatus,
  });

  const statusLabel =
    mcpStatus === "registered"
      ? `${webMcpTools.length} WebMCP tools live`
      : mcpStatus === "checking"
        ? "Registering tools"
        : mcpStatus === "error"
          ? "Tool registration retry"
          : "WebMCP unavailable in this browser";
  const empty = <EvidenceEmpty mode={mode} />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="flex items-center gap-3">
          <span className="logo-mark">
            <Network className="size-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-slate-950">
                TRUE <span className="text-blue-600">GEO ENGINE</span>
              </span>
              <span className="hidden rounded border border-blue-300/10 bg-blue-300/[.045] px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-blue-700 sm:inline">
                WEBMCP
              </span>
            </div>
            <p className="hidden text-[9px] text-slate-600 sm:block">
              Page visibility and URL-independent prompt intelligence
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="status-pill">
            <span
              className={`status-dot ${mcpStatus === "registered" ? "live" : ""}`}
            />
            {statusLabel}
          </div>
          <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-bold text-white ring-2 ring-blue-100">
            TG
          </span>
        </div>
      </header>
      <div className="workspace-bar">
        <div className="flex min-w-0 items-center gap-2 text-[10px] text-slate-600">
          {mode === "prompt" ? (
            <>
              <Bot className="size-3.5 text-blue-600" />
              <span className="truncate">
                {promptRun
                  ? `Prompt benchmark · ${promptRun.brand} · no page URL`
                  : "Prompt benchmark · curated dataset · no page URL"}
              </span>
            </>
          ) : (
            <>
              <Link2 className="size-3.5 text-blue-600" />
              <span className="truncate">
                {pageUrl
                  ? `Synthetic URL demo · ${pageUrl}`
                  : "Enter one page URL for a synthetic demo"}
              </span>
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Button
            onClick={() => setToolsOpen(true)}
            variant="outline"
            className="h-8 border-blue-100 bg-white text-[10px] text-blue-600"
          >
            <Wrench /> WebMCP tools
          </Button>
          <span className="hidden items-center gap-2 text-[9px] text-slate-600 sm:flex">
            <Radio
              className={`size-3 ${data ? "text-emerald-600" : "text-slate-400"}`}
            />
            {data?.modeLabel ?? "Ready to run"}
          </span>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1680px] px-3 py-3 sm:px-5 sm:py-5">
        <PromptBar
          mode={mode}
          pageUrl={pageUrl}
          prompt={prompt}
          promptOptions={demoPromptOptions}
          targetError={targetError}
          scanning={scanning}
          progress={progress}
          onModeChange={(next) => {
            setMode(next);
            setTab("pulse");
            setTargetError("");
          }}
          onPageChange={changePage}
          onPromptChange={changePrompt}
          onRun={() => {
            if (mode === "prompt") void performPrompt();
            else void performVisibility();
          }}
        />
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as TabId)}
              className="min-w-0 gap-4"
            >
              <TabsList
                variant="line"
                className="scrollbar-none h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-blue-100 bg-transparent p-0"
              >
                {tabs.map(({ id, label, icon: Icon }) => {
                  const count =
                    id === "gaps"
                      ? (data?.gaps.length ?? 0)
                      : id === "fixes" &&
                          (mode === "prompt" ? promptData : artifact)
                        ? 1
                        : 0;
                  const visibleLabel =
                    id === "gaps" && mode === "prompt" ? "Answer gaps" : label;
                  return (
                    <TabsTrigger
                      key={id}
                      value={id}
                      className="h-10 flex-none rounded-none px-3 text-[11px] text-slate-500 after:bottom-[-1px] after:bg-cyan-300 data-[state=active]:text-slate-950"
                    >
                      <Icon className="size-3.5" />
                      {visibleLabel}
                      {count ? (
                        <span className="rounded-full bg-blue-100/60 px-1.5 py-0.5 text-[8px] text-slate-500">
                          {count}
                        </span>
                      ) : null}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {data ? (
                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/65 px-3 py-2 text-[10px] text-slate-600">
                  {mode === "prompt" ? (
                    <Bot className="size-3.5 shrink-0 text-blue-600" />
                  ) : (
                    <Link2 className="size-3.5 shrink-0 text-blue-600" />
                  )}
                  <b className="shrink-0 text-blue-700">
                    {mode === "prompt"
                      ? `Prompt analysis · ${promptRun?.brand}`
                      : "Synthetic URL analysis"}
                  </b>
                  <span className="truncate">
                    {mode === "prompt"
                      ? promptRun?.prompt
                      : pageTarget?.pageUrl}
                  </span>
                  <code className="ml-auto hidden shrink-0 text-[9px] text-slate-500 md:block">
                    {data.scanId}
                  </code>
                </div>
              ) : null}
              <TabsContent value="pulse">
                {data ? (
                  <Overview
                    targetLabel={targetLabel}
                    pageUrl={overviewTarget?.pageUrl}
                    domainUrl={overviewTarget?.domainUrl}
                    prompt={
                      mode === "prompt"
                        ? (promptRun?.prompt ?? prompt)
                        : undefined
                    }
                    data={data}
                    onInvestigate={() => explainGap(data.gaps[0]?.id ?? "")}
                  />
                ) : mode === "visibility" && scanning ? (
                  <PageAuditLoading />
                ) : (
                  empty
                )}
              </TabsContent>
              <TabsContent value="answers">
                {data ? (
                  <AnswerMap targetLabel={targetLabel} data={data} />
                ) : (
                  empty
                )}
              </TabsContent>
              <TabsContent value="gaps">
                {data ? (
                  <GapsPanel
                    runKind={data.runKind}
                    gaps={data.gaps}
                    selected={selectedGap}
                    onSelect={selectGap}
                    onStage={stageFix}
                  />
                ) : (
                  empty
                )}
              </TabsContent>
              <TabsContent value="fixes">
                {mode === "prompt" ? (
                  promptData && promptRun ? (
                    <PromptNextSteps
                      subject={targetLabel}
                      data={promptData}
                      target={promptRun.target}
                      onDownload={downloadPackage}
                    />
                  ) : (
                    empty
                  )
                ) : pageData && activeGap ? (
                  <FixPanel
                    targetLabel={targetLabel}
                    gap={activeGap}
                    data={pageData}
                    artifact={activeArtifact}
                    onGenerate={() => stageFix(activeGap.id)}
                    onDownload={downloadPackage}
                  />
                ) : (
                  empty
                )}
              </TabsContent>
              <TabsContent value="activity">
                <ActivityPanel
                  activity={activity}
                  contextLabel={
                    mode === "prompt"
                      ? `${promptRun?.brand ?? "Brand-specific prompt"}: ${(promptRun?.prompt ?? prompt) || "not run"}`
                      : (pageTarget?.pageUrl ?? pageUrl) || "URL not entered"
                  }
                />
              </TabsContent>
            </Tabs>
          </div>
          <AgentRail
            mode={mode}
            signal={
              data
                ? `${targetLabel}: ${data.summarySignal}`
                : mode === "prompt"
                  ? "Benchmark ready: select a prompt and replay its four-engine evidence set."
                  : pageUrl
                    ? `Synthetic page scenario ready: ${pageUrl}`
                    : "Enter one page URL to generate a synthetic scenario."
            }
            messages={messages}
            scanning={scanning}
            onCommand={handleCommand}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-blue-100 py-4 text-[9px] text-slate-600">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3 text-blue-600/60" />{" "}
            {data
              ? data.runKind === "prompt"
                ? "Scores come from the selected curated benchmark and never call an external model."
                : "The page audit compares deterministic simulated raw HTML with simulated post-hydration HTML; the target page is not fetched."
              : "No uploads, API keys, or evidence JSON required."}
          </span>
          <div className="flex items-center gap-4">
            <a
              href="/TRUE-GEO-ENGINE-WebMCP-source.zip"
              download
              className="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700"
            >
              <Code2 className="size-3" /> Source code
            </a>
            <a
              href="/workflows.html"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700"
            >
              <BookOpenText className="size-3" /> Animated workflow guide
            </a>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3" /> Download only · no publishing
            </span>
          </div>
        </div>
      </div>
      <ToolsDialog open={toolsOpen} onOpenChange={setToolsOpen} />
    </main>
  );
}
