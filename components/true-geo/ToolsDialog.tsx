"use client";

import { Braces, Code2, Download, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadToolManifest, webMcpTools } from "./tool-manifest";

export function ToolsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden border-blue-200 bg-white sm:max-w-4xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Wrench className="size-5 text-blue-600" /> Exportable WebMCP tools</DialogTitle><DialogDescription>Every tool is registered in the page, uses a bounded schema, and is available to AI agents through <code>document.modelContext</code>.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap gap-2"><Button onClick={() => downloadToolManifest("json")} className="bg-blue-600 text-white hover:bg-blue-700"><Braces /> Export JSON</Button><Button onClick={() => downloadToolManifest("markdown")} variant="outline" className="border-blue-100 text-blue-700"><Download /> Export Markdown</Button><span className="ml-auto self-center text-[10px] text-slate-500">{webMcpTools.length} tools</span></div>
        <div className="scrollbar-thin grid max-h-[58vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {webMcpTools.map((tool) => <article key={tool.name} className="rounded-2xl border border-blue-100 bg-blue-50/45 p-4"><div className="flex items-start justify-between gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Code2 className="size-4" /></span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase ${tool.mode === "read" ? "bg-cyan-50 text-cyan-700" : tool.mode === "download" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"}`}>{tool.mode}</span></div><code className="mt-3 block text-xs font-semibold text-blue-700">{tool.name}</code><h3 className="mt-1 text-sm font-semibold text-slate-900">{tool.title}</h3><p className="mt-2 text-[11px] leading-5 text-slate-600">{tool.description}</p><p className="mt-3 border-t border-blue-100 pt-3 text-[10px] leading-4 text-slate-500"><b className="text-slate-700">Returns:</b> {tool.result}</p></article>)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
