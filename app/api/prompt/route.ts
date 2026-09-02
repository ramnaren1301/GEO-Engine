import { createDemoPromptRun, demoPromptCatalog } from "../../../components/true-geo/demo-prompts";

export async function GET() {
  return Response.json(demoPromptCatalog());
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { prompt?: string };
    return Response.json(createDemoPromptRun(body.prompt ?? ""));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The prompt could not be run.";
    return Response.json({ status: "rejected", message }, { status: 422 });
  }
}
