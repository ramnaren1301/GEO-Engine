import { scanSyntheticPage } from "@/lib/synthetic-page-scan";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pageUrl?: string };
    if (!body.pageUrl?.trim())
      return Response.json(
        { status: "rejected", message: "Enter the page URL to analyze." },
        { status: 400 },
      );
    return Response.json(await scanSyntheticPage(body.pageUrl));
  } catch (error) {
    return Response.json(
      {
        status: "rejected",
        message:
          error instanceof Error
            ? error.message
            : "The page could not be analyzed.",
      },
      { status: 422 },
    );
  }
}
