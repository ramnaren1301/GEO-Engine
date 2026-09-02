"use client";

import {
  Bot,
  Braces,
  Check,
  Code2,
  FileText,
  LoaderCircle,
  Monitor,
  X,
} from "lucide-react";
import {
  auditPageTitle,
  contentBlocks,
  structuralBlocks,
  type BlockAudit,
  type PageBlock,
} from "./page-audit";

const structuralIcon = (tag: string) =>
  tag === "metadata" ? FileText : tag === "json-ld" ? Braces : Code2;

function StatusPill({ readable }: { readable: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${readable ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
    >
      {readable ? <Check className="size-3.5" /> : <X className="size-3.5" />}
      {readable ? "Fully extractable" : "Not visible to AI"}
    </span>
  );
}

function HumanBlock({ block, index }: { block: PageBlock; index: number }) {
  return (
    <div className="h-full rounded-2xl border border-blue-100 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-blue-600">
            Block {String(index + 1).padStart(2, "0")} · {block.tag}
          </p>
          <h3 className="mt-2 text-base font-semibold leading-6 text-slate-950">
            {block.label}
          </h3>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-slate-500">
          {block.chars.toLocaleString()} chars
        </span>
      </div>
      <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-slate-700">
        {block.text}
      </p>
    </div>
  );
}

function AiBlock({ block, index }: { block: PageBlock; index: number }) {
  const readable = block.status === "extractable";
  return (
    <div
      className={`h-full rounded-2xl border p-4 transition sm:p-5 ${readable ? "border-emerald-200 bg-emerald-50/55" : "border-slate-200 bg-slate-100/85"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-[.12em] ${readable ? "text-emerald-700" : "text-slate-400"}`}
          >
            Block {String(index + 1).padStart(2, "0")} · {block.tag}
          </p>
          <h3
            className={`mt-2 text-base font-semibold leading-6 ${readable ? "text-slate-950" : "text-slate-400 line-through decoration-slate-400"}`}
          >
            {block.label}
          </h3>
        </div>
        <StatusPill readable={readable} />
      </div>
      <p
        className={`mt-3 whitespace-pre-line text-[15px] leading-7 ${readable ? "text-slate-700" : "text-slate-400 line-through decoration-slate-300"}`}
      >
        {block.text}
      </p>
      {!readable ? (
        <p className="mt-3 text-xs font-medium leading-5 text-rose-600">
          In this synthetic scenario, this block appears after hydration but is
          absent from the simulated raw page source.
        </p>
      ) : null}
    </div>
  );
}

export function PageAuditLoading() {
  return (
    <section className="panel flex min-h-[420px] items-center justify-center p-8 text-center">
      <div className="max-w-xl">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <LoaderCircle className="size-6 animate-spin" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-slate-950">
          Generating a synthetic Human vs AI comparison…
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          The entered URL deterministically produces simulated raw HTML and a
          simulated post-hydration page. No website or browser service is called.
        </p>
      </div>
    </section>
  );
}

export function PageVisibilityAudit({ audit }: { audit: BlockAudit }) {
  const signals = structuralBlocks(audit);
  const blocks = contentBlocks(audit);
  const title = auditPageTitle(audit);
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-blue-100 bg-gradient-to-r from-white via-blue-50/55 to-cyan-50/55 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">
              <Code2 /> Synthetic demo · Human vs AI
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Page Visibility Audit — {title}
            </h1>
            <a
              href={audit.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block max-w-3xl truncate text-sm text-blue-600 hover:text-blue-700"
            >
              {audit.url}
            </a>
            <p className="mt-3 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
              {audit.disclosure ?? "Synthetic demonstration only. The target page was not fetched or rendered."}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <strong className="text-2xl text-emerald-700">
              {audit.stats.visible}
            </strong>
            <p className="mt-1 text-sm font-semibold text-emerald-800">
              AI can read
            </p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <strong className="text-2xl text-rose-700">
              {audit.stats.notExtractable}
            </strong>
            <p className="mt-1 text-sm font-semibold text-rose-800">
              AI cannot read
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-4">
            <strong className="text-2xl text-slate-950">
              {audit.stats.totalChars.toLocaleString()}
            </strong>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              chars of on-page text
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-blue-100 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Braces className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Behind the page — Machine-Readable Signals
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Simulated code signals from the synthetic source HTML. They show
              how metadata and schema would be read, but are not claims about the target page.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {signals.map((signal) => {
            const Icon = structuralIcon(signal.tag);
            return (
              <article
                key={signal.tag}
                className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-white text-blue-600">
                  <Icon className="size-4" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">
                  {signal.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {signal.text}
                </p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="sticky top-0 z-10 grid gap-3 rounded-2xl border border-blue-100 bg-white/95 p-3 shadow-sm backdrop-blur md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-3">
            <Monitor className="size-5 text-blue-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Simulated Human View — Full Page
              </h2>
              <p className="text-xs text-slate-500">
                Every visible block, in page order
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50/70 p-3">
            <Bot className="size-5 text-emerald-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Simulated AI Extraction
              </h2>
              <p className="text-xs text-slate-500">
                The same blocks, with missing content marked
              </p>
            </div>
          </div>
        </div>
        {blocks.length ? (
          <div className="mt-4 space-y-3">
            {blocks.map((block, index) => (
              <article
                key={`${block.order}-${block.tag}-${block.label}`}
                className="grid items-stretch gap-3 md:grid-cols-2"
              >
                <HumanBlock block={block} index={index} />
                <AiBlock block={block} index={index} />
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <h3 className="text-base font-semibold text-slate-800">
              No readable page blocks were found.
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              The rendered page did not expose headings, paragraphs, lists,
              captions, quotes, or table cells with enough text to compare.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
