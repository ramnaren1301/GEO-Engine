"use client";

import {
  Archive,
  Check,
  Code2,
  Download,
  Eye,
  FileText,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FixArtifact } from "./fix-artifact";
import type { Gap, VisibilityData } from "./runtime";

type FixPanelProps = {
  targetLabel: string;
  gap: Gap;
  data: VisibilityData;
  artifact: FixArtifact | null;
  onGenerate: () => void;
  onDownload: () => void;
};

const packageFiles = [
  "DEMO-DISCLOSURE.txt",
  "llms.txt",
  "llms-full.txt",
  "faqs.json",
  "faq-content.md",
  "structured-data.jsonld",
  "schema.json",
  "content-preview.html",
  "page-visibility-audit.json",
  "html-visibility-audit.json",
  "answer-engine-scores.json",
  "high-intent-prompts.json",
  "next-steps.md",
  "action-plan.json",
  "webmcp-tools.json",
  "webmcp-tools.md",
];

export function FixPanel({
  targetLabel,
  gap,
  data,
  artifact,
  onGenerate,
  onDownload,
}: FixPanelProps) {
  const verified = artifact?.evidenceMode === "verified_page";
  const synthetic = artifact?.evidenceMode === "synthetic_demo";
  return (
    <div className="grid gap-4 2xl:grid-cols-[1.12fr_.88fr]">
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-blue-100 px-5 py-4">
          <div>
            <p className="eyebrow">
              <ListChecks /> Recommended next step
            </p>
            <h2 className="mt-2 text-base font-semibold text-slate-950">
              {gap.title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Target: {targetLabel}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
          >
            {verified
              ? "Verified page package ready"
              : synthetic
                ? "Synthetic demo package · review required"
                : artifact
                  ? "URL-specific draft package ready"
                  : "Preparing package"}
          </span>
        </div>
        {artifact ? (
          <Tabs defaultValue="content" className="gap-0">
            <TabsList className="h-auto w-full justify-start rounded-none border-b border-blue-100 bg-blue-50/60 p-2">
              <TabsTrigger value="content">
                <FileText /> Content
              </TabsTrigger>
              <TabsTrigger value="schema">
                <Code2 /> JSON-LD
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye /> Preview
              </TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="p-5">
              <p className="eyebrow">
                {verified
                  ? "Answer-ready content"
                  : synthetic
                    ? "Synthetic demo content · verify every fact"
                  : "Suggested content · verify before publishing"}
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                {artifact.content.headline}
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-700">
                {artifact.content.answer}
              </p>
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Implementation recommendation
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {artifact.content.recommendation}
                </p>
              </div>
            </TabsContent>
            <TabsContent value="schema" className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="eyebrow">
                  <Code2 /> JSON-LD
                </p>
                <span
                  className={`text-xs ${verified ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {verified
                    ? "FAQPage · matches visible content"
                    : "FAQPage draft · review required"}
                </span>
              </div>
              <pre className="max-h-[420px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-cyan-100">
                <code>{JSON.stringify(artifact.jsonLd, null, 2)}</code>
              </pre>
            </TabsContent>
            <TabsContent value="preview" className="p-5">
              <p className="eyebrow">
                <Eye /> Content preview
              </p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_18px_50px_rgba(37,99,235,.1)]">
                <div className="border-b border-blue-100 bg-blue-50/70 px-4 py-2 text-xs text-slate-500">
                  {artifact.pageUrl}
                </div>
                <article className="p-6">
                  <span className="text-xs font-semibold uppercase tracking-[.18em] text-blue-600">
                    Frequently asked question{verified ? "" : " · draft"}
                  </span>
                  <h3 className="mt-3 text-2xl font-semibold leading-8 tracking-tight text-slate-950">
                    {artifact.content.headline}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-slate-700">
                    {artifact.content.answer}
                  </p>
                  <a
                    href={artifact.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex text-sm font-semibold text-blue-600"
                  >
                    {verified ? "Source" : "Target page"}:{" "}
                    {artifact.sourceTitle}
                  </a>
                </article>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex min-h-[410px] items-center justify-center p-6 text-center">
            <div className="max-w-md">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <FileText className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                Prepare the URL-specific package.
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The package uses this exact page, its Human vs AI block audit,
                and its measured content gaps.
              </p>
              <Button
                onClick={onGenerate}
                className="mt-5 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Sparkles /> Prepare package
              </Button>
            </div>
          </div>
        )}
        <div className="border-t border-blue-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Check className="size-3 text-emerald-600" /> Block audit included
            </span>
            <span className="flex items-center gap-1">
              <Check
                className={`size-3 ${verified ? "text-emerald-600" : "text-amber-600"}`}
              />{" "}
              {verified
                ? "Verified page evidence included"
                : "Drafts clearly labeled for review"}
            </span>
            <span className="flex items-center gap-1">
              <Check
                className={`size-3 ${artifact ? "text-emerald-600" : "text-slate-400"}`}
              />{" "}
              {artifact ? "ZIP package ready" : "Package preparing"}
            </span>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <section className="panel p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Archive className="size-5" />
            </span>
            <div>
              <p className="eyebrow">Download all page recommendations</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">
                One synthetic draft ZIP scoped to this URL.
              </h2>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Package scope
            </p>
            <p className="mt-2 break-all text-sm font-medium text-slate-800">
              {artifact?.pageUrl ?? targetLabel}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white p-3">
                <strong className="block text-xl text-slate-950">
                  {Math.max(1, data.gaps.length)}
                </strong>
                <span className="text-xs text-slate-500">suggested FAQs</span>
              </div>
              <div className="rounded-lg bg-white p-3">
                <strong className="block text-xl text-slate-950">
                  {packageFiles.length}
                </strong>
                <span className="text-xs text-slate-500">files in one ZIP</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Includes consolidated llms.txt, FAQs, FAQPage JSON-LD and schema,
            content preview, the synthetic Human vs AI audit, scores, prompts,
            actions, WebMCP manifests, and a disclosure file. Verify every draft
            against the real page before publishing.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {packageFiles.map((file) => (
              <div
                key={file}
                className={`rounded-lg border px-3 py-2 text-xs ${artifact ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-100 bg-blue-50 text-slate-500"}`}
              >
                <Check className="mr-1.5 inline size-3" />
                {file}
              </div>
            ))}
          </div>
          <Button
            onClick={artifact ? onDownload : onGenerate}
            className="mt-5 h-12 w-full rounded-xl bg-blue-600 text-base font-semibold text-white hover:bg-blue-700"
          >
            {artifact ? (
              <>
                <Download /> Download all (.zip) — {packageFiles.length} files
              </>
            ) : (
              <>
                <Sparkles /> Prepare download package
              </>
            )}
          </Button>
        </section>
        <section className="panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">
                Synthetic visibility gap
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Recoverable visibility for this page
              </p>
            </div>
            <strong className="text-2xl tracking-tight text-amber-600">
              {gap.impactValue}
            </strong>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-300 to-amber-300"
              style={{ width: `${gap.impactValue}%` }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
