"use client";

import {
  ArrowUp,
  Bot,
  Braces,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RunMode } from "./PromptBar";

export type ChatMessage = { id: number; role: "agent" | "user"; text: string };

type AgentRailProps = {
  mode: RunMode;
  signal: string;
  messages: ChatMessage[];
  scanning: boolean;
  onCommand: (text: string) => void;
};

export function AgentRail({
  mode,
  signal,
  messages,
  scanning,
  onCommand,
}: AgentRailProps) {
  const starters =
    mode === "prompt"
      ? ["Run prompt", "Open WebMCP tools", "Download all files"]
      : ["Run AI visibility", "Open WebMCP tools", "Download all files"];
  const [input, setInput] = useState("");
  const submit = () => {
    if (!input.trim()) return;
    onCommand(input.trim());
    setInput("");
  };
  return (
    <aside className="agent-rail">
      <header className="flex items-center justify-between border-b border-blue-100 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-300 text-white">
            <Bot className="size-4" />
            <i className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-300" />
          </span>
          <div>
            <h2 className="text-xs font-semibold text-slate-950">
              TRUE GEO agent
            </h2>
            <p className="text-[9px] text-slate-500">
              Shared context · human controlled
            </p>
          </div>
        </div>
        <span className="rounded-md border border-blue-200 bg-blue-50/80 p-1.5 text-blue-600">
          <Braces className="size-3.5" />
        </span>
      </header>

      <div className="scrollbar-thin flex max-h-[560px] min-h-[360px] flex-col gap-4 overflow-y-auto px-4 py-4">
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-cyan-300/[.055] to-transparent p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-700">
            <Sparkles className="size-3" />{" "}
            {mode === "prompt" ? "Current prompt" : "Synthetic URL scenario"}
          </p>
          <p className="mt-1.5 text-[11px] leading-5 text-slate-600">
            {signal}
          </p>
        </div>

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2.5 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${message.role === "agent" ? "bg-blue-50 text-blue-600" : "bg-blue-100 text-slate-700"}`}
            >
              {message.role === "agent" ? (
                <Bot className="size-3.5" />
              ) : (
                <UserRound className="size-3.5" />
              )}
            </span>
            <div
              className={`max-w-[86%] rounded-xl px-3 py-2.5 text-[11px] leading-5 ${message.role === "agent" ? "rounded-tl-sm border border-blue-100 bg-blue-50/80 text-slate-700" : "rounded-tr-sm bg-blue-500/20 text-blue-900"}`}
            >
              {message.text}
            </div>
          </div>
        ))}

        {scanning && (
          <div className="flex gap-2.5" role="status">
            <span className="flex size-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Bot className="size-3.5" />
            </span>
            <div className="rounded-xl rounded-tl-sm border border-blue-100 bg-blue-50/80 px-3 py-3">
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </div>
          </div>
        )}

        <div className="mt-auto border-t border-blue-100 pt-3">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
            Try asking
          </p>
          <div className="space-y-1">
            {starters.map((starter) => (
              <button
                key={starter}
                onClick={() => onCommand(starter)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[10px] text-slate-500 transition hover:bg-blue-50/80 hover:text-slate-700"
              >
                {starter}
                <ChevronRight className="size-3" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-blue-100 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/80 p-1.5 focus-within:border-blue-200">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="Ask or direct the agent…"
            className="h-8 border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
            aria-label="Chat with TRUE GEO agent"
          />
          <Button
            onClick={submit}
            disabled={!input.trim()}
            size="icon-sm"
            className="rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <ArrowUp />
          </Button>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1 text-[8px] text-slate-600">
          <CheckCircle2 className="size-2.5" /> Agent actions appear instantly
          in this workspace
        </p>
      </footer>
    </aside>
  );
}
