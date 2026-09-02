import { auditSyntheticPage } from "@/lib/synthetic-page-scan";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; refresh?: boolean };
    if (!body.url?.trim())
      return Response.json(
        { error: "Enter the page URL to audit." },
        { status: 400 },
      );
    return Response.json(await auditSyntheticPage(body.url));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The page could not be audited.";
    return Response.json(
      {
        url: "",
        blocks: [],
        stats: {
          visible: 0,
          notExtractable: 0,
          structural: 0,
          totalChars: 0,
          humanBlocks: 0,
        },
        error: message,
      },
      { status: 422 },
    );
  }
}
