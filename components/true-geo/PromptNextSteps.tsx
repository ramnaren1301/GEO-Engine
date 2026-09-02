"use client";

import { Archive, CheckCircle2, Download, Lightbulb, ListChecks, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PromptImplementationTarget } from "./prompt-analysis";
import type { VisibilityData } from "./runtime";

const packageFiles = ["llms.txt", "llms-full.txt", "faqs.json", "faq-content.md", "structured-data.jsonld", "schema.json", "content-preview.html", "prompt + model evidence"];

export function PromptNextSteps({ subject, data, target, onDownload }: { subject: string; data: VisibilityData; target: PromptImplementationTarget; onDownload: () => void }) {
  const gaps = data.gaps;
  return (
    <div className="grid gap-4 2xl:grid-cols-[1.12fr_.88fr]">
      <section className="panel overflow-hidden">
        <div className="border-b border-blue-100 px-5 py-4"><p className="eyebrow"><ListChecks /> Prompt-led next steps</p><h2 className="mt-2 text-base font-semibold text-slate-950">Improve how the answer represents {subject}</h2><p className="mt-1 text-[11px] text-slate-500">Brand: {subject} · derived from the selected prompt and its four-engine benchmark evidence</p></div>
        {gaps.length ? <div className="divide-y divide-blue-100">{gaps.map((gap) => <article key={gap.id} className="p-5"><div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white">{gap.rank}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">{gap.title}</h3><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">{gap.impact}</span></div><p className="mt-2 text-xs leading-5 text-slate-600">{gap.cause}</p><div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3"><p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700"><Lightbulb className="size-3" /> Recommended action</p><p className="mt-2 text-xs leading-5 text-slate-700">{gap.fix}</p></div></div></div></article>)}</div> : <div className="flex min-h-[360px] items-center justify-center p-6 text-center"><div><CheckCircle2 className="mx-auto size-8 text-emerald-600" /><h3 className="mt-4 text-lg font-semibold text-slate-950">No material answer gap was detected.</h3><p className="mt-2 text-xs text-slate-500">Refine the prompt to test another buyer intent for {subject}.</p></div></div>}
      </section>
      <div className="space-y-4">
        <section className="panel p-5"><span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Archive className="size-5" /></span><p className="eyebrow mt-4">Download consolidated GEO package</p><h2 className="mt-2 text-lg font-semibold text-slate-950">Get the suggested implementation files—not only the analysis.</h2><div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Automatically selected target</p><p className="mt-2 text-xs font-semibold text-slate-800">{target.title}</p><p className="mt-1 break-all text-[10px] text-slate-500">{target.pageUrl}</p></div><p className="mt-4 text-xs leading-6 text-slate-600">The ZIP contains suggested llms.txt, FAQs, FAQPage JSON-LD/schema, visible-content preview, ranked page recommendations, plus the exact prompt, four distinct model answers, citations, and scores.</p><div className="mt-4 grid grid-cols-2 gap-2">{packageFiles.map((file) => <div key={file} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-700"><CheckCircle2 className="mr-1.5 inline size-3" />{file}</div>)}</div><Button onClick={onDownload} className="mt-5 h-12 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"><Download /> Download all suggested GEO files (.zip) — 16 files</Button></section>
        <section className="panel p-4"><div className="flex items-center gap-3"><ShieldCheck className="size-5 text-amber-600" /><div><p className="text-xs font-medium text-slate-800">No URL input required</p><p className="mt-1 text-[10px] leading-5 text-slate-500">The prompt remains the only input. Its curated benchmark automatically supplies the recommended page target. Generated content is marked review-required until verified on that page.</p></div></div></section>
      </div>
    </div>
  );
}
