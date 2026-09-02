import { demoPromptOptions } from "./demo-prompts";

export type WebMcpToolEntry = {
  name: string;
  title: string;
  mode: "read" | "write" | "download";
  description: string;
  inputSchema: Record<string, unknown>;
  result: string;
};

const objectSchema = (
  properties: Record<string, unknown>,
  required: string[] = [],
) => ({ type: "object", additionalProperties: false, properties, required });
const pageUrl = {
  type: "string",
  format: "uri",
  maxLength: 500,
  description: "Public page URL used only to seed and scope the deterministic synthetic demo.",
};

export const webMcpTools: WebMcpToolEntry[] = [
  {
    name: "geo_ai_visibility_audit",
    title: "Page Visibility Audit — Human vs AI",
    mode: "write",
    description:
      "Generate a deterministic synthetic Human-vs-AI visibility audit scoped to one public page URL. The tool creates simulated raw HTML and post-hydration HTML in memory, then runs the real ordered block-classification and scoring pipeline. It returns extractable and hydration-only blocks, simulated metadata, Schema.org and FAQ signals, calculated engine scores, gaps, and draft next steps. The target page is not fetched and no key or renderer is required.",
    inputSchema: objectSchema({ page_url: pageUrl }, ["page_url"]),
    result:
      "Exact ordered block audit, AI-readable count, hydration-only count, on-page character count, machine-readable signals, URL-scoped answer-engine scores, gaps, and grounded next steps.",
  },
  {
    name: "geo_analyze_prompt",
    title: "Run a benchmark prompt",
    mode: "write",
    description:
      "Replay one curated, brand-specific prompt across four simulated answer engines and calculate AI visibility, engine scores, citation coverage, six sentiment dimensions, answer gaps, and next steps. Each engine returns a distinct answer. Uses the bundled fictional benchmark only: no model, API key, page URL, or network request.",
    inputSchema: objectSchema(
      {
        prompt: {
          type: "string",
          enum: demoPromptOptions.map((option) => option.prompt),
          description: "One exact prompt from the bundled benchmark catalog.",
        },
      },
      ["prompt"],
    ),
    result:
      "Selected brand and prompt context, four distinct answer-engine responses, benchmark citations, transparent score calculations, six scored dimensions, ranked gaps, and prompt-specific next steps.",
  },
  {
    name: "geo_visibility_overview",
    title: "Get visibility overview",
    mode: "read",
    description:
      "Read the latest calculated GEO score and its evidence components for the active workflow. Page runs use a clearly disclosed synthetic URL scenario; prompt runs use the selected bundled benchmark with four engines and six dimensions.",
    inputSchema: objectSchema({}),
    result:
      "Active run type, input context, run ID, overall score, component metrics, answer-engine scores, and highest-priority gap.",
  },
  {
    name: "geo_list_tools",
    title: "List WebMCP tools",
    mode: "read",
    description:
      "Return the complete portable TRUE GEO ENGINE browser WebMCP manifest, including bounded JSON input schemas and human-readable result contracts.",
    inputSchema: objectSchema({}),
    result:
      "Versioned eight-tool catalog ready for JSON or Markdown export and reuse.",
  },
  {
    name: "geo_content_gaps",
    title: "Explain an analysis gap",
    mode: "read",
    description:
      "Trace one calculated gap to the active workflow evidence. URL mode uses deterministic synthetic blocks, simulated crawler perspectives, prompt coverage, and citation readiness scoped to the entered URL; prompt mode uses only the exact prompt, inferred brand, returned answer, and citations.",
    inputSchema: objectSchema(
      {
        gap_id: {
          type: "string",
          maxLength: 80,
          description:
            "Gap identifier returned by the active URL or prompt analysis.",
        },
      },
      ["gap_id"],
    ),
    result:
      "Run type, cause, confidence, recoverable visibility points, evidence chain, and supporting URLs.",
  },
  {
    name: "geo_generate_next_steps",
    title: "Generate grounded next steps",
    mode: "write",
    description:
      "Open the ranked next steps for the active run. Synthetic page runs generate clearly labeled draft content, FAQPage JSON-LD, and a matching preview that must be verified against the real page; prompt runs return benchmark-based model-answer improvements.",
    inputSchema: objectSchema(
      {
        gap_id: {
          type: "string",
          maxLength: 80,
          description: "Gap identifier returned by the active analysis run.",
        },
      },
      ["gap_id"],
    ),
    result:
      "Ranked actions plus the appropriate page implementation or prompt-analysis download state.",
  },
  {
    name: "geo_download_package",
    title: "Download consolidated GEO package",
    mode: "download",
    description:
      "Download the active GEO evidence and suggested implementation as one browser-created ZIP. Synthetic page runs consolidate URL-scoped demo gaps into draft llms.txt, FAQs, FAQPage JSON-LD/schema, previews, audit files, and an explicit synthetic-evidence disclosure. Prompt runs keep prompt-only input and include the same implementation files plus four distinct benchmark answers, citations, scores, gaps, next steps, and manifests.",
    inputSchema: objectSchema({}),
    result:
      "A page/site-specific ZIP of suggested llms.txt, FAQs, JSON-LD/schema, preview, evidence, and actions without publishing or modifying any website.",
  },
  {
    name: "geo_export_action_plan",
    title: "Export action plan",
    mode: "read",
    description:
      "Return the active run scope and calculated action plan. URL runs export the entered URL, synthetic-demo disclosure, generated high-intent prompts, and simulated crawler perspectives; prompt runs export the exact prompt, inferred brand, answer-engine score, citations, and answer gaps.",
    inputSchema: objectSchema({
      format: { type: "string", enum: ["json", "summary"], default: "json" },
    }),
    result:
      "Portable machine-readable action plan derived only from the active run context.",
  },
];

export function toolsMarkdown() {
  return [
    "# TRUE GEO ENGINE — browser WebMCP tools",
    "",
    ...webMcpTools.flatMap((tool) => [
      `## ${tool.name}`,
      "",
      tool.description,
      "",
      `- Mode: ${tool.mode}`,
      `- Result: ${tool.result}`,
      "",
      "```json",
      JSON.stringify(tool.inputSchema, null, 2),
      "```",
      "",
    ]),
  ].join("\n");
}

export function downloadToolManifest(format: "json" | "markdown") {
  const content =
    format === "json"
      ? JSON.stringify(
          {
            name: "true-geo-engine",
            version: "4.3",
            transport: "browser-webmcp",
            tools: webMcpTools,
          },
          null,
          2,
        )
      : toolsMarkdown();
  const blob = new Blob([content], {
    type: format === "json" ? "application/json" : "text/markdown",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download =
    format === "json"
      ? "true-geo-webmcp-tools.json"
      : "true-geo-webmcp-tools.md";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
