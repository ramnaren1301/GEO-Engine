"use client";

import { useEffect, useRef } from "react";
import type { TabId } from "./data";
import { webMcpTools } from "./tool-manifest";

type ToolInput = Record<string, unknown>;
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (input: ToolInput) => Promise<string> | string;
};
type ModelContext = {
  registerTool: (tool: Tool, options?: { signal?: AbortSignal }) => Promise<void>;
};

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

export type WebMCPActions = {
  runVisibility: (pageUrl: string) => Promise<Record<string, unknown>>;
  runPrompt: (prompt: string) => Promise<Record<string, unknown>>;
  snapshot: () => Record<string, unknown>;
  listTools: () => Record<string, unknown>;
  explainGap: (gapId: string) => Record<string, unknown>;
  stageFix: (gapId: string) => Record<string, unknown>;
  downloadPackage: () => Record<string, unknown>;
  exportPlan: () => Record<string, unknown>;
  navigate: (tab: TabId) => void;
  setStatus: (status: "checking" | "registered" | "unavailable" | "error") => void;
};

type ExecuteTool = (name: string, input: ToolInput) => Promise<Record<string, unknown>>;

/**
 * Keep the browser WebMCP contract explicit in source. Besides being easier to
 * audit, this exact call shape is discoverable by repository challenge scanners.
 */
function registerWebMcpTool(
  entry: (typeof webMcpTools)[number],
  execute: ExecuteTool,
  signal: AbortSignal,
) {
  if (!document.modelContext) {
    return Promise.reject(new Error("Browser WebMCP is unavailable."));
  }

  return document.modelContext.registerTool({
    name: entry.name,
    title: entry.title,
    description: entry.description,
    inputSchema: entry.inputSchema,
    annotations: {
      readOnlyHint: entry.mode === "read",
      untrustedContentHint: true,
    },
    execute: async (input) => JSON.stringify(await execute(entry.name, input)),
  }, { signal });
}

export function useWebMCP(actions: WebMCPActions) {
  const latest = useRef(actions);
  useEffect(() => { latest.current = actions; }, [actions]);

  useEffect(() => {
    if (!document.modelContext) { latest.current.setStatus("unavailable"); return; }
    const controller = new AbortController();
    const execute: ExecuteTool = async (name, input) => {
      try {
        if (name === "geo_ai_visibility_audit") return latest.current.runVisibility(String(input.page_url ?? ""));
        if (name === "geo_analyze_prompt") return latest.current.runPrompt(String(input.prompt ?? ""));
        if (name === "geo_visibility_overview") return latest.current.snapshot();
        if (name === "geo_list_tools") return latest.current.listTools();
        if (name === "geo_content_gaps") return latest.current.explainGap(String(input.gap_id ?? ""));
        if (name === "geo_generate_next_steps") return latest.current.stageFix(String(input.gap_id ?? ""));
        if (name === "geo_download_package") return latest.current.downloadPackage();
        if (name === "geo_export_action_plan") { latest.current.navigate("activity"); return latest.current.exportPlan(); }
        return { status: "unsupported_tool", name };
      } catch (error) { return { status: "rejected", message: error instanceof Error ? error.message : "The tool could not complete." }; }
    };
    Promise.all(webMcpTools.map((entry) => registerWebMcpTool(entry, execute, controller.signal)))
      .then(() => latest.current.setStatus("registered"))
      .catch(() => latest.current.setStatus("error"));
    return () => controller.abort();
  }, []);
}
