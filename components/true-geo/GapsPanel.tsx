"use client";

import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Lightbulb,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Gap } from "./runtime";

type GapsPanelProps = {
  runKind: "page" | "prompt";
  gaps: Gap[];
  selected: string;
  onSelect: (id: string) => void;
  onStage: (id: string) => void;
};

export function GapsPanel({
  runKind,
  gaps,
  selected,
  onSelect,
  onStage,
}: GapsPanelProps) {
  const isPrompt = runKind === "prompt";
  if (!gaps.length)
    return (
      <section className="panel flex min-h-[500px] items-center justify-center p-6 text-center">
        <div>
          <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">
            No missed-answer gap in this evidence set.
          </h2>
          <p className="mt-2 text-xs text-slate-500">
            {isPrompt
              ? "Refine this brand-specific prompt to test another buyer intent."
              : "Run another page URL to test a different owned-content surface."}
          </p>
        </div>
      </section>
    );
  const gap = gaps.find((item) => item.id === selected) ?? gaps[0];
  return (
    <div className="grid gap-4 xl:grid-cols-[.86fr_1.14fr]">
      <section className="panel overflow-hidden">
        <div className="border-b border-blue-100 px-5 py-4">
          <p className="eyebrow">
            <FileSearch /> {isPrompt ? "Observed" : "Synthetic"} gaps
          </p>
          <h2 className="mt-2 text-base font-semibold text-slate-950">
            {gaps.length} {isPrompt ? "evidence-derived" : "synthetic demo"} opportunities
          </h2>
        </div>
        <div className="divide-y divide-blue-100">
          {gaps.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`block w-full p-4 text-left transition ${selected === item.id ? "bg-blue-50/80" : "hover:bg-blue-50/80"}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${selected === item.id ? "bg-blue-600 text-white" : "border border-blue-100 bg-blue-50/80 text-slate-500"}`}
                >
                  {item.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-medium text-slate-800">
                      {item.title}
                    </h3>
                    <span className="shrink-0 text-[11px] font-semibold text-emerald-600">
                      {item.impact}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-slate-500">
                    {item.query}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {item.evidence.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-blue-50/80 px-1.5 py-1 text-[9px] text-slate-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex w-full items-center justify-center gap-1 border-t border-blue-100 p-3 text-[10px] text-slate-500">
          Ranked by {isPrompt ? "observed" : "synthetic"} answer-presence gap{" "}
          <ArrowRight className="size-3" />
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-amber-700/80">
              <Sparkles /> Agent diagnosis
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              {gap.title}
            </h2>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600">
            {gap.confidence}% confidence
          </span>
        </div>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/80 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            Customer asks
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-800">“{gap.query}”</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-rose-300/10 bg-rose-300/[.035] p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-rose-700">
              <Lightbulb className="size-3.5" />{" "}
              {isPrompt
                ? "Why this answer dimension is weak"
                : "Why the target page disappears"}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{gap.cause}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-700">
              <CheckCircle2 className="size-3.5" />{" "}
              {isPrompt ? "Recommended next step" : "Safest recovery"}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{gap.fix}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-blue-100 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">
              Evidence chain
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-600">
              <ShieldCheck className="size-3" /> {isPrompt ? "Benchmark" : "Synthetic demo"} calculated
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
            {gap.evidence.map((item) => (
              <span key={item} className="evidence-node">
                {item}
              </span>
            ))}
            <ArrowRight className="size-3 text-slate-700" />
            <span className="evidence-node active">1 root cause</span>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => onStage(gap.id)}
            className="h-10 flex-1 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            <Sparkles />{" "}
            {isPrompt ? "View next steps" : "Build next-step package"}
          </Button>
          {gap.sourceUrls[0] ? (
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-xl border-blue-100 bg-blue-50/80 text-slate-700 hover:bg-blue-100/60 hover:text-slate-950"
            >
              <a href={gap.sourceUrls[0]} target="_blank" rel="noreferrer">
                {isPrompt ? "Open source" : "Open target URL"}
              </a>
            </Button>
          ) : (
            <Button
              disabled
              variant="outline"
              className="h-10 rounded-xl border-blue-100"
            >
              No source URL
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
