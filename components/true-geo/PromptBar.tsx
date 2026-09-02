"use client";

import { ArrowUpRight, Bot, Link2, ScanSearch, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DemoPromptOption } from "./demo-prompts";

export type RunMode = "visibility" | "prompt";

type PromptBarProps = {
  mode: RunMode;
  pageUrl: string;
  prompt: string;
  promptOptions: DemoPromptOption[];
  targetError: string;
  scanning: boolean;
  progress: number;
  onModeChange: (mode: RunMode) => void;
  onPageChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onRun: () => void;
};

export function PromptBar(props: PromptBarProps) {
  const isPrompt = props.mode === "prompt";
  const disabled =
    props.scanning || (isPrompt ? !props.prompt.trim() : !props.pageUrl.trim());
  return (
    <section
      className="prompt-shell"
      aria-label="Run page AI visibility or a prompt"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600/80">
          <Sparkles className="size-3.5" />{" "}
          {isPrompt
            ? "Replay curated answer intelligence"
            : "How LLMs see a page"}
        </div>
        <div
          className="inline-flex rounded-full border border-blue-100 bg-blue-50/70 p-1"
          role="tablist"
          aria-label="Analysis mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isPrompt}
            onClick={() => props.onModeChange("visibility")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${!isPrompt ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-blue-700"}`}
          >
            <ScanSearch className="size-3.5" /> AI Visibility
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isPrompt}
            onClick={() => props.onModeChange("prompt")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${isPrompt ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-blue-700"}`}
          >
            <Bot className="size-3.5" /> Run a Prompt
          </button>
        </div>
      </div>

      {isPrompt ? (
        <div className="mt-5 space-y-3">
          <div className="grid gap-2 lg:grid-cols-[280px_1fr] lg:items-end">
            <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Choose a benchmark prompt</span>
              <Select value={props.prompt} onValueChange={props.onPromptChange}>
                <SelectTrigger className="h-12 w-full border-blue-100 bg-white text-sm font-medium normal-case tracking-normal">
                  <SelectValue placeholder="Select a prompt" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(760px,calc(100vw-32px))] border-blue-100 bg-white">
                  {[
                    ...new Set(
                      props.promptOptions.map((option) => option.category),
                    ),
                  ].map((category) => (
                    <SelectGroup key={category}>
                      <SelectLabel>{category}</SelectLabel>
                      {props.promptOptions
                        .filter((option) => option.category === category)
                        .map((option) => (
                          <SelectItem
                            key={option.id}
                            value={option.prompt}
                            className="max-w-[720px] py-2.5"
                          >
                            <span className="truncate">
                              {option.label} · {option.brand}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <p className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-slate-600">
              Eight fictional industries · four answer engines · six sentiment
              dimensions · 192 deterministic evidence rows.
            </p>
          </div>
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Selected prompt</span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Textarea
                value={props.prompt}
                readOnly
                aria-readonly="true"
                className="min-h-[124px] flex-1 resize-none border-blue-100 bg-white px-4 py-4 text-lg font-medium leading-8 normal-case tracking-normal text-slate-800 sm:text-xl"
              />
              <Button
                onClick={props.onRun}
                disabled={disabled}
                className="h-14 shrink-0 rounded-xl bg-blue-600 px-7 text-base text-white hover:bg-blue-700 sm:h-auto sm:min-h-[124px] sm:w-44 sm:flex-col sm:justify-center sm:gap-2"
              >
                {props.scanning ? (
                  <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <ArrowUpRight className="size-5" />
                )}
                Run prompt
              </Button>
            </div>
          </label>
          <p className="text-xs text-slate-500">
            Runs locally against the bundled benchmark dataset. No API key,
            credits, page URL, or external model is used.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm leading-6 text-slate-600">
            Enter any public page URL to generate a deterministic synthetic
            Human-vs-AI audit. The URL scopes the scenario, blocks, prompts,
            scores, and recommendations; the target page is not fetched.
          </div>
          <label className="block space-y-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1.5">
              <Link2 className="size-3" /> Page URL
            </span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={props.pageUrl}
                onChange={(event) => props.onPageChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !disabled) props.onRun();
                }}
                placeholder="https://example.com/page-to-analyze"
                inputMode="url"
                aria-label="Page URL"
                className="h-12 flex-1 border-blue-100 bg-white text-sm font-normal normal-case tracking-normal"
              />
              <Button
                onClick={props.onRun}
                disabled={disabled}
                className="h-12 shrink-0 rounded-xl bg-blue-600 px-6 text-white hover:bg-blue-700"
              >
                {props.scanning ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <ArrowUpRight className="size-4" />
                )}
                Run AI visibility
              </Button>
            </div>
          </label>
        </div>
      )}
      {props.targetError ? (
        <p className="mt-2 text-xs text-rose-600" role="alert">
          {props.targetError}
        </p>
      ) : null}
      {props.scanning ? (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
            <span>
              {isPrompt
                ? "Loading four engines and calculating six answer dimensions…"
                : "Generating a URL-specific synthetic Human vs AI audit…"}
            </span>
            <span>{props.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-300 transition-[width] duration-500"
              style={{ width: `${props.progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
