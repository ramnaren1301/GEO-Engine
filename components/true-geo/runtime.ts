import type { HtmlVisibilityAudit } from "./html-visibility";
import type { BlockAudit } from "./page-audit";

export type EngineMetric = {
  name: string;
  mark: string;
  score: number;
  coverage: number;
  citations: string;
  sentiment: number;
  delta: number | null;
};
export type TrendPoint = {
  day: string;
  score: number | null;
  target: number;
  leader: number;
};
export type CompetitorMetric = { name: string; value: number; color: string };
export type AnswerPrompt = {
  query: string;
  sentimentTopic: string;
  sentiment: number;
  target: number;
  cited: boolean;
  leader: string;
};
export type Gap = {
  id: string;
  rank: string;
  title: string;
  query: string;
  impact: string;
  impactValue: number;
  confidence: number;
  cause: string;
  fix: string;
  evidence: string[];
  sourceUrls: string[];
};
export type AnswerObservation = {
  engine: string;
  query: string;
  sentimentTopic?: string;
  mentioned: boolean;
  cited: boolean;
  sentiment: number;
  leader: string;
  sourceUrls?: string[];
  sourceKind?: "live_url" | "answer_engine";
};
export type PageEvidence = {
  title: string;
  description?: string;
  excerpt: string;
  sourceUrl?: string;
  provenance?: "live" | "synthetic";
};
export type ModelAnswerEvidence = {
  model: string;
  answer: string;
  sources: { title: string; url: string }[];
};

export type VisibilityData = {
  runKind: "page" | "prompt";
  scanId: string;
  scannedAt: string;
  modeLabel: string;
  goal: string;
  promptCount: number;
  answerCount: number;
  sourcePages: number;
  answerClusters: number;
  modelCount: number;
  htmlAudit: HtmlVisibilityAudit | null;
  pageAudit: BlockAudit | null;
  metrics: {
    aiVisibilityScore: number | null;
    scoreDelta: number | null;
    shareOfAnswer: number;
    citationRate: number;
    positiveSentiment: number;
    agentReadiness: number;
    shareDelta: number | null;
    citationDelta: number | null;
    sentimentDelta: number | null;
    readinessDelta: number | null;
  };
  trend: TrendPoint[];
  models: EngineMetric[];
  competitors: CompetitorMetric[];
  gaps: Gap[];
  answerPrompts: AnswerPrompt[];
  modelAnswers: ModelAnswerEvidence[];
  summarySignal: string;
};

const engineMarks: Record<string, string> = {
  ChatGPT: "◎",
  Gemini: "✦",
  Perplexity: "P",
  Claude: "C",
};
const competitorColors = ["#94a3b8", "#718096", "#53657b", "#8b7bb8"];
const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));
const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
const hash = (value: string) => {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1)
    result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return result >>> 0;
};
const modeOf = (values: string[], fallback: string) => {
  const counts = new Map<string, number>();
  values
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
};
const difference = (current: number, previous?: number | null) =>
  previous === undefined || previous === null ? null : current - previous;
const sameTarget = (left: string, right: string) =>
  left.trim().toLowerCase() === right.trim().toLowerCase() ||
  left.trim().toLowerCase() === "target site";
const scanLabel = () =>
  new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    new Date(),
  );

function cleanObservations(input: AnswerObservation[]): AnswerObservation[] {
  return input
    .slice(0, 600)
    .map((item) => ({
      engine: String(item.engine ?? "")
        .trim()
        .slice(0, 50),
      query: String(item.query ?? "")
        .trim()
        .slice(0, 300),
      sentimentTopic: String(item.sentimentTopic ?? "General perception")
        .trim()
        .slice(0, 80),
      mentioned: Boolean(item.mentioned),
      cited: Boolean(item.cited),
      sentiment: clamp(Number(item.sentiment) || 0),
      leader: String(item.leader ?? "Unknown")
        .trim()
        .slice(0, 80),
      sourceUrls: (item.sourceUrls ?? [])
        .map(String)
        .filter(Boolean)
        .slice(0, 12),
      sourceKind:
        item.sourceKind === "live_url"
          ? ("live_url" as const)
          : ("answer_engine" as const),
    }))
    .filter((item) => item.engine && item.query);
}

function buildGaps(
  targetLabel: string,
  observations: AnswerObservation[],
  prompts: AnswerPrompt[],
  engineCount: number,
  syntheticUrl = false,
): Gap[] {
  const liveUrl = observations.every((item) => item.sourceKind === "live_url");
  return prompts
    .map((prompt) => {
      const rows = observations.filter((item) => item.query === prompt.query);
      const mentions = rows.filter((item) => item.mentioned).length;
      const citations = rows.filter((item) => item.cited).length;
      const sourceUrls = [
        ...new Set(rows.flatMap((item) => item.sourceUrls ?? [])),
      ];
      const opportunity = 100 - prompt.target;
      const engineCoverage =
        (new Set(rows.map((item) => item.engine)).size /
          Math.max(1, engineCount)) *
        100;
      const confidence = clamp(
        engineCoverage * 0.8 + Math.min(20, rows.length * 4),
      );
      const leadingEntity = modeOf(
        rows.map((item) => item.leader),
        "Unknown",
      );
      return {
        id: `gap-${hash(prompt.query).toString(16)}`,
        rank: "",
        title:
          prompt.query.length > 62
            ? `${prompt.query.slice(0, 59)}…`
            : prompt.query,
        query: prompt.query,
        impactValue: opportunity,
        impact: `${opportunity} visibility pts`,
        confidence,
        cause: liveUrl
          ? `${targetLabel} matched ${mentions} of ${rows.length} ${syntheticUrl ? "simulated " : ""}crawler-and-prompt checks for the ${prompt.sentimentTopic} topic. ${citations} checks met the citation-readiness threshold.${syntheticUrl ? " This is synthetic demonstration evidence; the target page was not fetched." : ""}`
          : `${targetLabel} appeared in ${mentions} of ${rows.length} submitted answers for the ${prompt.sentimentTopic} topic and earned ${citations} citations. ${leadingEntity} led this prompt set.`,
        fix: liveUrl
          ? `${syntheticUrl ? "Verify this gap against the real page first. If confirmed, add" : "Add"} a sourced answer for “${prompt.query}” to the selected page and make that content visible in source HTML.`
          : `Strengthen how ${targetLabel} is represented for “${prompt.query}” with verifiable evidence, explicit trade-offs, and a clear recommendation, then rerun the exact prompt.`,
        evidence: [
          liveUrl
            ? `${rows.length} ${syntheticUrl ? "simulated crawler perspectives" : "crawler checks"}`
            : `${rows.length} observations`,
          `${new Set(rows.map((item) => item.engine)).size} engines`,
          `${sourceUrls.length} source URLs`,
          prompt.sentimentTopic,
        ],
        sourceUrls,
      };
    })
    .filter((gap) => gap.impactValue > 0)
    .sort((a, b) => b.impactValue - a.impactValue)
    .map((gap, index) => ({
      ...gap,
      rank: String(index + 1).padStart(2, "0"),
    }));
}

export function analyzeObservations(
  targetLabel: string,
  market: string,
  goal: string,
  input: AnswerObservation[],
  previous: VisibilityData | null = null,
  htmlAudit: HtmlVisibilityAudit | null = null,
  modelAnswers: ModelAnswerEvidence[] = [],
): VisibilityData {
  const observations = cleanObservations(input);
  if (!observations.length)
    throw new Error("At least one valid answer observation is required.");
  const engineNames = [...new Set(observations.map((item) => item.engine))];
  const liveUrl = observations.every((item) => item.sourceKind === "live_url");
  const syntheticUrl = liveUrl && htmlAudit?.method === "synthetic";
  const queries = [...new Set(observations.map((item) => item.query))];
  const models = engineNames.map((name) => {
    const rows = observations.filter((item) => item.engine === name);
    const coverage = clamp(
      (rows.filter((item) => item.mentioned).length / rows.length) * 100,
    );
    const citationRate = clamp(
      (rows.filter((item) => item.cited).length / rows.length) * 100,
    );
    const sentiment = clamp(average(rows.map((item) => item.sentiment)));
    const score = clamp(
      coverage * 0.4 + citationRate * 0.35 + sentiment * 0.25,
    );
    const prior = previous?.models.find((item) => item.name === name)?.score;
    return {
      name,
      mark: engineMarks[name] ?? name.slice(0, 1).toUpperCase(),
      score,
      coverage,
      citations: `${rows.filter((item) => item.cited).length} / ${rows.length}`,
      sentiment,
      delta: difference(score, prior),
    };
  });
  const prompts = queries.map((query) => {
    const rows = observations.filter((item) => item.query === query);
    return {
      query,
      sentimentTopic: modeOf(
        rows.map((item) => item.sentimentTopic ?? ""),
        "General perception",
      ),
      sentiment: clamp(average(rows.map((item) => item.sentiment))),
      target: clamp(
        (rows.filter((item) => item.mentioned).length / rows.length) * 100,
      ),
      cited: rows.some((item) => item.cited),
      leader: modeOf(
        rows.map((item) => item.leader),
        targetLabel,
      ),
    };
  });
  const sourcePages = new Set(
    observations.flatMap((item) => item.sourceUrls ?? []),
  ).size;
  const shareOfAnswer = clamp(
    (observations.filter((item) => item.mentioned).length /
      observations.length) *
      100,
  );
  const citationRate = clamp(
    (observations.filter((item) => item.cited).length / observations.length) *
      100,
  );
  const positiveSentiment = clamp(
    average(
      observations
        .filter((item) => item.mentioned)
        .map((item) => item.sentiment),
    ),
  );
  const sourceCoverage = clamp(
    (observations.filter((item) => (item.sourceUrls ?? []).length > 0).length /
      observations.length) *
      100,
  );
  const agentReadiness = clamp(
    shareOfAnswer * 0.25 +
      citationRate * 0.35 +
      positiveSentiment * 0.2 +
      sourceCoverage * 0.2,
  );
  const aiVisibilityScore = liveUrl
    ? htmlAudit
      ? clamp(
          shareOfAnswer * 0.3 +
            citationRate * 0.25 +
            positiveSentiment * 0.2 +
            htmlAudit.sourceVisibility * 0.25,
        )
      : null
    : clamp(
        shareOfAnswer * 0.35 +
          citationRate * 0.25 +
          positiveSentiment * 0.15 +
          agentReadiness * 0.25,
      );
  const leaderCounts = new Map<string, number>();
  observations.forEach((item) => {
    if (!sameTarget(item.leader, targetLabel))
      leaderCounts.set(item.leader, (leaderCounts.get(item.leader) ?? 0) + 1);
  });
  const competitors = [...leaderCounts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count], index) => ({
      name,
      value: clamp((count / observations.length) * 100),
      color: competitorColors[index],
    }));
  competitors.push({
    name: liveUrl ? "Target page" : targetLabel,
    value: shareOfAnswer,
    color: "#2563eb",
  });
  competitors.sort((a, b) => b.value - a.value);
  const gaps = buildGaps(
    targetLabel,
    observations,
    prompts,
    models.length,
    syntheticUrl,
  );
  const leader = competitors[0]?.value ?? shareOfAnswer;
  const trend = [
    ...(previous?.trend ?? []),
    {
      day: scanLabel(),
      score: aiVisibilityScore,
      target: shareOfAnswer,
      leader,
    },
  ].slice(-7);
  const metrics = {
    aiVisibilityScore,
    scoreDelta:
      aiVisibilityScore === null
        ? null
        : difference(aiVisibilityScore, previous?.metrics.aiVisibilityScore),
    shareOfAnswer,
    citationRate,
    positiveSentiment,
    agentReadiness,
    shareDelta: difference(shareOfAnswer, previous?.metrics.shareOfAnswer),
    citationDelta: difference(citationRate, previous?.metrics.citationRate),
    sentimentDelta: difference(
      positiveSentiment,
      previous?.metrics.positiveSentiment,
    ),
    readinessDelta: difference(
      agentReadiness,
      previous?.metrics.agentReadiness,
    ),
  };
  const scanId = `GEO-${hash(
    `${targetLabel}|${market}|${goal}|${JSON.stringify(observations)}|${htmlAudit?.source.contentHash ?? "no-html-audit"}`,
  )
    .toString(16)
    .slice(0, 8)
    .toUpperCase()}`;
  const summarySignal = liveUrl
    ? aiVisibilityScore === null
      ? `Page evidence is loaded, but the final AI visibility score is waiting for the raw-HTML versus rendered-DOM audit.`
      : `${syntheticUrl ? "Synthetic demo" : "AI visibility"} score is ${aiVisibilityScore}/100; ${htmlAudit?.sourceVisibility ?? 0}% of the ${syntheticUrl ? "simulated " : ""}post-hydration page text is present in the ${syntheticUrl ? "simulated " : ""}raw HTML.`
    : `${targetLabel} prompt visibility is ${aiVisibilityScore}/100 for the exact submitted prompt across ${engineNames.length} answer engine${engineNames.length === 1 ? "" : "s"}; ${citationRate}% of scored brand dimensions include cited web evidence.`;
  return {
    runKind: liveUrl ? "page" : "prompt",
    scanId,
    scannedAt: new Date().toISOString(),
    modeLabel: liveUrl
      ? `${syntheticUrl ? "Synthetic URL demo" : "Live URL scan"} · ${engineNames.length} ${syntheticUrl ? "simulated crawler perspectives" : "crawler checks"} · ${queries.length} prompts`
      : `Prompt run · ${engineNames.length} model${engineNames.length === 1 ? "" : "s"} · ${queries.length} answer dimensions`,
    goal,
    promptCount: queries.length,
    answerCount: observations.length,
    sourcePages,
    answerClusters: queries.length,
    modelCount: models.length,
    htmlAudit,
    pageAudit: null,
    metrics,
    trend,
    models,
    competitors,
    gaps,
    answerPrompts: prompts,
    modelAnswers,
    summarySignal,
  };
}
