"use client";

import { Bot, Check, Gauge, MessageCircleHeart, Quote, X } from "lucide-react";
import { useState } from "react";
import { ScoreInfo } from "./ScoreInfo";
import type { AnswerPrompt, VisibilityData } from "./runtime";

function promptSuggestion(prompt: AnswerPrompt, brand: string) {
  const citation = prompt.cited
    ? "Keep the existing cited proof"
    : "Add a verifiable citation";
  const comparison =
    prompt.leader === brand
      ? "protect the current lead"
      : `answer the comparison against ${prompt.leader}`;
  const tone =
    prompt.sentiment < 70
      ? "use clearer positive proof while acknowledging the trade-off"
      : "keep the balanced tone";
  return `${citation} for “${prompt.query}”; ${comparison}, and ${tone}.`;
}

export function AnswerMap({
  targetLabel,
  data,
}: {
  targetLabel: string;
  data: VisibilityData;
}) {
  const isPrompt = data.runKind === "prompt";
  const [topic, setTopic] = useState("All");
  const topics = [
    "All",
    ...new Set(data.answerPrompts.map((prompt) => prompt.sentimentTopic)),
  ];
  const prompts =
    topic === "All"
      ? data.answerPrompts
      : data.answerPrompts.filter((prompt) => prompt.sentimentTopic === topic);

  return (
    <div className="space-y-4">
      <section className="panel overflow-hidden">
        <div className="border-b border-blue-100 px-5 py-4">
          <p className="eyebrow">
            <Gauge /> Answer engine scores
          </p>
          <div className="mt-2 flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-950">
              {isPrompt
                ? `${targetLabel} score for the selected benchmark prompt`
                : `How each simulated answer engine scores ${targetLabel}`}
            </h2>
            <ScoreInfo
              title="Answer engine score"
              meaning="How complete and trustworthy this engine's answer is for the exact synthetic page scenario or benchmark prompt being tested."
              calculation="40% answer coverage + 35% citation coverage + 25% topic signal. The result is rounded to a score out of 100."
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isPrompt
              ? `Each engine uses its own distinct ${targetLabel} answer. The cards show the exact answer evidence that produced its score.`
              : "Each score combines one deterministic simulated crawler perspective, prompt coverage, citation readiness, and topic signals for this URL scenario."}
          </p>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-4">
          {data.models.map((engine) => {
            const evidence = data.modelAnswers.find(
              (item) => item.model === engine.name,
            );
            return (
              <article
                key={engine.name}
                className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/70 p-4"
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white">
                    {engine.mark}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-semibold ${engine.delta === null ? "bg-blue-100 text-slate-500" : engine.delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                  >
                    {engine.delta === null
                      ? isPrompt
                        ? "Distinct answer"
                        : "Synthetic perspective"
                      : `${engine.delta >= 0 ? "+" : ""}${engine.delta}`}
                  </span>
                </div>
                <div className="mt-5 flex items-end gap-2">
                  <strong className="text-4xl font-semibold tracking-[-.05em] text-slate-950">
                    {engine.score}
                  </strong>
                  <span className="mb-1 text-xs text-slate-500">/100</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {engine.name}
                  </h3>
                  <ScoreInfo
                    title={`${engine.name} score`}
                    meaning={`How well ${engine.name}'s own answer covers and supports ${targetLabel} for this exact analysis.`}
                    calculation={`40% of ${engine.coverage}% coverage + 35% of ${engine.citations} cited checks + 25% of ${engine.sentiment}% topic signal.`}
                  />
                </div>
                <div className="mt-4 space-y-2 text-[10px] text-slate-500">
                  <div className="flex justify-between">
                    <span>
                      {isPrompt ? "Answer coverage" : "Prompt coverage"}
                    </span>
                    <b className="text-slate-700">{engine.coverage}%</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Citation ready</span>
                    <b className="text-slate-700">{engine.citations}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Topic signals</span>
                    <b className="text-slate-700">{engine.sentiment}%</b>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-300"
                    style={{ width: `${engine.score}%` }}
                  />
                </div>
                {isPrompt && evidence ? (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-white/90 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                      Answer used for this score
                    </p>
                    <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
                      {evidence.answer}
                    </p>
                    <p className="mt-2 text-[10px] text-slate-500">
                      {evidence.sources.length} benchmark sources attached
                    </p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-blue-100 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">
                <MessageCircleHeart />{" "}
                {isPrompt
                  ? `${targetLabel} answer dimensions`
                  : "Domain-specific sentiment prompts"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-950">
                  {isPrompt
                    ? "Brand-specific scored answer set"
                    : "High-intent answer set"}
                </h2>
                <ScoreInfo
                  title="Scored answer set"
                  meaning={
                    isPrompt
                      ? "Six different questions that reveal whether the brand is merely mentioned or is supported, trusted, balanced, and recommended for this exact prompt."
                      : "Questions generated specifically from the analyzed page and grouped by the customer signal they test."
                  }
                  calculation={
                    isPrompt
                      ? `Each dimension compares ${data.modelCount} distinct engine answers. Coverage is the share that met the dimension threshold; topic signal is their average sentiment score.`
                      : "Each page-specific question is checked against crawler access, visible page text, citations, and topic language."
                  }
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {isPrompt
                  ? "Every row explains what its scores mean, how they were produced, and the exact improvement to make for this prompt."
                  : "Prompts generated for the selected page, grouped by the sentiment topic they measure."}
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] text-blue-700">
              {data.answerPrompts.length}{" "}
              {isPrompt ? "dimensions" : "tested prompts"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {topics.map((item) => (
              <button
                key={item}
                onClick={() => setTopic(item)}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-medium transition ${topic === item ? "border-blue-600 bg-blue-600 text-white" : "border-blue-100 bg-white text-slate-600 hover:border-blue-300"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-blue-100">
          {prompts.map((prompt, index) => {
            const answerCount = Math.round(
              (prompt.target / 100) * data.modelCount,
            );
            return (
              <article
                key={prompt.query}
                className="px-5 py-4 transition hover:bg-blue-50/50"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-[10px] font-semibold text-blue-700">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-cyan-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-cyan-700">
                          {prompt.sentimentTopic}
                        </span>
                        <h3 className="mt-2 text-sm font-medium leading-6 text-slate-800">
                          {prompt.query}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${prompt.cited ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {prompt.cited ? (
                          <Check className="size-3" />
                        ) : (
                          <X className="size-3" />
                        )}
                        {prompt.cited ? "Citation ready" : "Needs support"}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg bg-blue-50 p-2.5">
                        <span className="flex items-center gap-1.5 text-[9px] text-slate-500">
                          Answer coverage{" "}
                          <ScoreInfo
                            title="Answer coverage"
                            meaning={`${answerCount} of ${data.modelCount} distinct model answers gave ${targetLabel} enough support for this exact dimension.`}
                            calculation={`The number of answers meeting the dimension threshold divided by ${data.modelCount}, shown as ${prompt.target}%.`}
                          />
                        </span>
                        <b className="mt-1 block text-sm text-slate-800">
                          {prompt.target}%
                        </b>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2.5">
                        <span className="flex items-center gap-1.5 text-[9px] text-slate-500">
                          Topic signal{" "}
                          <ScoreInfo
                            title="Topic signal"
                            meaning={`How positive, confident, and recommendation-ready the model answers are for ${prompt.sentimentTopic.toLowerCase()}.`}
                            calculation={`Average sentiment score across the ${data.modelCount} answers for this exact dimension: ${prompt.sentiment}%.`}
                          />
                        </span>
                        <b className="mt-1 block text-sm text-slate-800">
                          {prompt.sentiment}%
                        </b>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2.5">
                        <span className="text-[9px] text-slate-500">
                          Best-supported brand
                        </span>
                        <b className="mt-1 block truncate text-sm text-slate-800">
                          {prompt.leader === "Target page"
                            ? targetLabel
                            : prompt.leader}
                        </b>
                      </div>
                    </div>
                    {isPrompt ? (
                      <div className="mt-3 grid gap-3 rounded-xl border border-blue-100 bg-white p-3 md:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                            What this says about the prompt
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {answerCount} of {data.modelCount} model answers
                            supported {targetLabel} on{" "}
                            {prompt.sentimentTopic.toLowerCase()}.{" "}
                            {prompt.leader === targetLabel
                              ? `${targetLabel} leads this dimension.`
                              : `${prompt.leader} currently has the strongest support.`}{" "}
                            {prompt.cited
                              ? "At least one answer supplied supporting evidence."
                              : "No answer supplied enough citation support."}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                            Specific suggestion
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {promptSuggestion(prompt, targetLabel)}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {!prompts.length ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <Bot className="mx-auto mb-3 size-5 text-blue-500" />
            No synthetic prompt checks are available for this sentiment topic.
          </div>
        ) : null}
        <div className="border-t border-blue-100 bg-blue-50/60 px-5 py-3 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Quote className="size-3" />{" "}
            {isPrompt
              ? "No page URL is used; every score is recalculated from four distinct benchmark answers for the selected prompt."
              : "Prompts and scores come from deterministic synthetic evidence scoped to the entered URL; the target page is not fetched."}
          </span>
        </div>
      </section>
    </div>
  );
}
