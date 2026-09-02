"use client";

import { Bot, Link2, ScanSearch, ShieldCheck } from "lucide-react";
import type { RunMode } from "./PromptBar";

export function EvidenceEmpty({ mode }: { mode: RunMode }) {
  const isPrompt = mode === "prompt";
  return (
    <section className="panel flex min-h-[520px] items-center justify-center p-6 text-center">
      <div className="max-w-lg">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          {isPrompt ? (
            <Bot className="size-6" />
          ) : (
            <ScanSearch className="size-6" />
          )}
        </span>
        <p className="eyebrow mt-5 justify-center">
          {isPrompt ? "One brand-specific prompt" : "One URL · synthetic demo"}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {isPrompt
            ? "Run a prompt without any page dependency."
            : "Generate a URL-specific AI visibility scenario."}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {isPrompt ? (
            <>
              Choose a curated benchmark prompt and click <b>Run prompt</b>.
              Four answer engines and six sentiment dimensions produce
              brand-specific visibility, scores, gaps, and next steps without an
              API key.
            </>
          ) : (
            <>
              Paste a public page URL above and click <b>Run AI visibility</b>.
              The app creates deterministic synthetic source and hydrated
              content, simulated crawler perspectives, high-intent prompts, and
              calculated scores without fetching the target page.
            </>
          )}
        </p>
        <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
          <span className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600">
            {isPrompt ? (
              <>
                <Bot className="mb-2 size-4 text-blue-600" /> No page or domain
                URL
              </>
            ) : (
              <>
                <Link2 className="mb-2 size-4 text-blue-600" /> No domain or
                market fields
              </>
            )}
          </span>
          <span className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600">
            <ShieldCheck className="mb-2 size-4 text-emerald-600" /> No JSON or
            evidence upload
          </span>
        </div>
      </div>
    </section>
  );
}
