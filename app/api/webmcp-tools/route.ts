import { toolsMarkdown, webMcpTools } from "@/components/true-geo/tool-manifest";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format");
  if (format === "markdown" || format === "md") return new Response(toolsMarkdown(), { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": "attachment; filename=true-geo-webmcp-tools.md" } });
  return Response.json({ name: "true-geo-engine", version: "4.3", transport: "browser-webmcp", tools: webMcpTools }, { headers: { "content-disposition": "attachment; filename=true-geo-webmcp-tools.json" } });
}
