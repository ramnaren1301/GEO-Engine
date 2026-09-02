"use client";

import { CheckCircle2, Clock3, Code2, LockKeyhole, ShieldCheck } from "lucide-react";
import { type ActivityItem } from "./data";
import { webMcpTools } from "./tool-manifest";

export function ActivityPanel({ activity, contextLabel }: { activity: ActivityItem[]; contextLabel: string }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[.92fr_1.08fr]">
      <section className="panel overflow-hidden">
        <div className="border-b border-blue-100 px-5 py-4"><p className="eyebrow"><Code2 /> WebMCP surface</p><h2 className="mt-2 text-base font-semibold text-slate-950">{webMcpTools.length} structured tools, one shared workspace</h2><p className="mt-1 text-[11px] text-slate-500">Registered with document.modelContext</p></div>
        <div className="divide-y divide-blue-100">{webMcpTools.map((tool) => <div key={tool.name} className="flex items-start gap-3 px-5 py-3.5"><span className={`mt-0.5 rounded-md px-1.5 py-1 text-[9px] font-semibold uppercase ${tool.mode === 'read' ? 'bg-blue-400/10 text-blue-700' : tool.mode === 'download' ? 'bg-indigo-400/10 text-indigo-700' : 'bg-amber-300/10 text-amber-700'}`}>{tool.mode}</span><div className="min-w-0"><code className="text-[11px] font-semibold text-blue-700">{tool.name}</code><p className="mt-1 text-[10px] leading-4 text-slate-500">{tool.description}</p></div></div>)}</div>
      </section>
      <div className="space-y-4">
        <section className="panel overflow-hidden"><div className="border-b border-blue-100 px-5 py-4"><p className="eyebrow"><Clock3 /> Invocation log</p><h2 className="mt-2 text-base font-semibold text-slate-950">Current-run audit trail</h2><p className="mt-1 truncate text-[10px] text-slate-500">{contextLabel}</p></div><div className="divide-y divide-blue-100">{activity.map((item) => <div key={item.id} className="flex gap-3 px-5 py-4"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.status === 'running' ? 'animate-pulse bg-cyan-300' : 'bg-emerald-300'}`} /><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><code className="truncate text-[11px] text-slate-700">{item.tool}</code><time className="text-[9px] text-slate-600">{item.time}</time></div><p className="mt-1 text-[10px] leading-4 text-slate-500">{item.detail}</p></div></div>)}</div></section>
        <section className="panel p-4"><div className="flex items-start gap-3"><div className="rounded-lg bg-emerald-300/10 p-2 text-emerald-600"><LockKeyhole className="size-4" /></div><div><div className="flex items-center gap-2"><p className="text-xs font-semibold text-slate-800">Safe action boundary</p><span className="rounded bg-emerald-300/10 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-600">ENFORCED</span></div><p className="mt-1.5 text-[10px] leading-5 text-slate-500">Agents can analyze, generate, and download implementation files. This workspace never publishes to the target site.</p></div></div><div className="mt-3 flex gap-2 text-[9px] text-slate-500"><span className="flex items-center gap-1"><ShieldCheck className="size-3" /> bounded schemas</span><span className="flex items-center gap-1"><CheckCircle2 className="size-3" /> no site writes</span></div></section>
      </div>
    </div>
  );
}
