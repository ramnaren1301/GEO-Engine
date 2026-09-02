"use client";

import {
  ArrowRight,
  Bot,
  FileCode2,
  Link2,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreInfo } from "./ScoreInfo";
import { PageVisibilityAudit } from "./PageVisibilityAudit";
import type { VisibilityData } from "./runtime";

type OverviewProps = {
  targetLabel: string;
  pageUrl?: string;
  domainUrl?: string;
  prompt?: string;
  data: VisibilityData;
  onInvestigate: () => void;
};

const scoreLabel = (score: number | null) =>
  score === null
    ? "HTML comparison required"
    : score >= 80
      ? "Strong visibility"
      : score >= 60
        ? "Moderate visibility"
        : score >= 40
          ? "Limited visibility"
          : "Low visibility";

export function Overview({
  targetLabel,
  pageUrl,
  domainUrl,
  prompt,
  data,
  onInvestigate,
}: OverviewProps) {
  const { metrics, htmlAudit, gaps, promptCount, answerCount } = data;
  const isPrompt = data.runKind === "prompt";
  if (!isPrompt && data.pageAudit)
    return <PageVisibilityAudit audit={data.pageAudit} />;
  const score = metrics.aiVisibilityScore;
  const topGap = gaps[0];
  const breakdown = isPrompt
    ? [
        {
          label: "Answer coverage",
          value: metrics.shareOfAnswer,
          note: "Scored dimensions covered across four distinct answers",
          icon: Bot,
          meaning:
            "How often the brand received enough support to pass a scored dimension for this exact prompt.",
          calculation: `${metrics.shareOfAnswer}% of the ${answerCount} engine-by-dimension checks met the coverage threshold.`,
        },
        {
          label: "Citation rate",
          value: metrics.citationRate,
          note: "Dimensions supported by benchmark citations",
          icon: Link2,
          meaning:
            "How often an answer supported its brand claim with an attached source.",
          calculation: `${metrics.citationRate}% of the ${answerCount} scored checks contained citation support.`,
        },
        {
          label: "Sentiment signals",
          value: metrics.positiveSentiment,
          note: "Tone across four distinct benchmark answers",
          icon: MessageCircleHeart,
          meaning:
            "How positive and confident the answers are when they discuss the measured brand.",
          calculation: `Average sentiment across the checks where ${targetLabel} was present, rounded to ${metrics.positiveSentiment}%.`,
        },
        {
          label: "Answer readiness",
          value: metrics.agentReadiness,
          note: "Coverage, evidence, tone, and source availability",
          icon: ShieldCheck,
          meaning:
            "Whether the answer set has enough coverage, proof, balanced tone, and usable sources to support a recommendation.",
          calculation: `25% coverage + 35% citations + 20% sentiment + 20% source availability = ${metrics.agentReadiness}%.`,
        },
      ]
    : [
        {
          label: "Prompt coverage",
          value: metrics.shareOfAnswer,
          note: "High-intent questions the page can answer",
          icon: Bot,
          meaning:
            "How many page-specific questions can be answered from the synthetic URL scenario.",
          calculation: `${metrics.shareOfAnswer}% of the ${answerCount} crawler-and-prompt checks found enough relevant page content.`,
        },
        {
          label: "Citation readiness",
          value: metrics.citationRate,
          note: "Crawler checks with citable support",
          icon: Link2,
          meaning:
            "How often the page exposed a usable source that an answer engine could cite.",
          calculation: `${metrics.citationRate}% of the ${answerCount} checks met the citation-readiness rule.`,
        },
        {
          label: "Sentiment signals",
          value: metrics.positiveSentiment,
          note: "Topic-specific confidence signals",
          icon: MessageCircleHeart,
          meaning:
            "How strongly the page communicates positive, trustworthy signals for the tested topics.",
          calculation: `Average sentiment of the page checks that found a relevant answer: ${metrics.positiveSentiment}%.`,
        },
        {
          label: "Source HTML",
          value: htmlAudit?.sourceVisibility ?? null,
          note: "Rendered text visible before JavaScript",
          icon: FileCode2,
          meaning:
            "How much of the human-visible page text is already present in original HTML before browser JavaScript runs.",
          calculation: htmlAudit
            ? `${htmlAudit.source.textChars.toLocaleString()} extractable characters divided by ${htmlAudit.hydrated.textChars.toLocaleString()} post-hydration characters, capped at 100%.`
            : "Calculated after source and rendered page text are both available.",
        },
      ];
  return (
    <div className="space-y-4">
      <section className="panel overflow-hidden">
        <div className="grid lg:grid-cols-[330px_1fr]">
          <div className="flex flex-col justify-between border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 lg:border-r lg:border-b-0">
            <div>
              <p className="eyebrow">
                <Sparkles />{" "}
                {isPrompt
                  ? "How the brand appears in this answer"
                  : "How LLMs see this page"}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-950">
                  AI visibility score
                </h1>
                <ScoreInfo
                  title="AI visibility score"
                  meaning={
                    isPrompt
                      ? `How strongly ${targetLabel} appears, is supported, and can be recommended in the selected prompt's four distinct answers.`
                      : "How easily an answer engine could read, understand, support, and cite this URL-specific synthetic page scenario."
                  }
                  calculation={
                    isPrompt
                      ? `35% answer coverage + 25% citation rate + 15% sentiment + 25% answer readiness = ${score ?? "pending"}/100.`
                      : `30% prompt coverage + 25% citation readiness + 20% sentiment + 25% source-HTML visibility = ${score ?? "pending"}/100.`
                  }
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">{targetLabel}</p>
              <div className="mt-4 space-y-2 rounded-xl border border-blue-100 bg-white/75 p-3 text-[10px] text-slate-600">
                {isPrompt ? (
                  <>
                    <div className="flex gap-2">
                      <span className="w-12 shrink-0 font-semibold text-blue-700">
                        Brand
                      </span>
                      <span className="font-medium text-slate-800">
                        {targetLabel}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-12 shrink-0 font-semibold text-blue-700">
                        Prompt
                      </span>
                      <span className="line-clamp-3">{prompt}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <span className="w-12 shrink-0 font-semibold text-blue-700">
                        Page
                      </span>
                      <a
                        href={pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={pageUrl}
                        className="truncate hover:text-blue-700"
                      >
                        {pageUrl}
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-12 shrink-0 font-semibold text-blue-700">
                        Domain
                      </span>
                      <a
                        href={domainUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={domainUrl}
                        className="truncate hover:text-blue-700"
                      >
                        {domainUrl}
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="my-7">
              <div
                className="relative flex size-44 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#2563eb ${(score ?? 0) * 3.6}deg, #dbeafe 0deg)`,
                }}
              >
                <div className="flex size-36 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                  <strong className="text-5xl font-semibold tracking-[-.06em] text-slate-950">
                    {score ?? "—"}
                  </strong>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {score === null ? "Pending" : "out of 100"}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-blue-700">
                {scoreLabel(score)}
              </p>
            </div>
            <p className="text-[11px] leading-5 text-slate-500">
              {isPrompt
                ? `The score combines ${targetLabel} presence, citations, sentiment, and recommendation quality across the curated four-engine benchmark.`
                : "The score combines simulated answer presence, citations, sentiment, and content visible in synthetic source HTML."}
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Complete score breakdown
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {answerCount} scored checks · {promptCount}{" "}
                  {isPrompt ? "answer dimensions" : "domain-specific prompts"} ·{" "}
                  {data.modelCount} {isPrompt ? "model" : "engines"}
                </p>
              </div>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] text-slate-600">
                {data.scanId}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {breakdown.map(
                ({ label, value, note, icon: Icon, meaning, calculation }) => (
                  <article
                    key={label}
                    className="rounded-2xl border border-blue-100 bg-white p-4"
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Icon className="size-4" />
                      </span>
                      <strong className="text-2xl tracking-tight text-slate-950">
                        {value === null ? "—" : `${value}%`}
                      </strong>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-800">
                        {label}
                      </p>
                      <ScoreInfo
                        title={label}
                        meaning={meaning}
                        calculation={calculation}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">{note}</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-300"
                        style={{ width: `${value ?? 0}%` }}
                      />
                    </div>
                  </article>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <div
        className={
          isPrompt ? "grid gap-4 xl:grid-cols-[1.05fr_.95fr]" : "space-y-4"
        }
      >
        <section className="panel p-5">
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">
                  <Bot /> Returned model evidence
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-950">
                    Distinct answer used for each model score
                  </h2>
                  <ScoreInfo
                    title="Model answer evidence"
                    meaning="Each engine score is tied to that engine's own visible answer, not one shared answer copied across all models."
                    calculation="The answer is split into six prompt-specific dimensions. Coverage, citations, and topic sentiment from those dimensions produce that model's score."
                  />
                </div>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                {data.modelAnswers.reduce(
                  (sum, item) => sum + item.sources.length,
                  0,
                )}{" "}
                cited sources
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {data.modelAnswers.map((item) => (
                <article
                  key={item.model}
                  className="rounded-xl border border-blue-100 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-slate-900">
                      {item.model}
                    </strong>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-700">
                      Distinct model answer · {item.sources.length} sources
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                    {item.answer}
                  </p>
                  {item.sources.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.sources.slice(0, 4).map((source) => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="max-w-full truncate rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
                        >
                          {source.title}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        </section>

        <section className="opportunity-card p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-amber-700/80">
              <Sparkles /> Most important next step
            </p>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] font-semibold text-emerald-600">
              {topGap ? topGap.impact : "No measured gap"}
            </span>
          </div>
          <h2 className="mt-4 text-xl font-semibold leading-7 tracking-tight text-slate-950">
            {topGap
              ? topGap.title
              : isPrompt
                ? "The answer covered every brand dimension"
                : "The page covers the tested prompts"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {topGap
              ? topGap.cause
              : isPrompt
                ? `No material ${targetLabel} gap was found in this answer. Refine the prompt to test another buyer intent.`
                : "No material prompt-coverage gap was found in the synthetic URL scenario."}
          </p>
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-blue-100 bg-white/70 p-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-800">
                {isPrompt
                  ? "Prompt-and-brand recommendation"
                  : "Synthetic demo recommendation"}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                {isPrompt
                  ? `Every score and next step comes from the submitted prompt and how the answer represents ${targetLabel}.`
                  : "Every score and next step comes from deterministic synthetic evidence scoped to the entered URL; verify it against the real page before use."}
              </p>
            </div>
          </div>
          <Button
            onClick={onInvestigate}
            disabled={!topGap}
            className="mt-5 h-10 w-full justify-between rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            View next steps <ArrowRight />
          </Button>
        </section>
      </div>
    </div>
  );
}
