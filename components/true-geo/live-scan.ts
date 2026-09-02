import type { DomainPrompt } from "./prompt-generator";
import type { AnswerObservation, PageEvidence } from "./runtime";
import type { HtmlVisibilityAudit } from "./html-visibility";
import type { BlockAudit } from "./page-audit";

export type CrawlerCheck = {
  engine: string;
  crawler: string;
  accessible: boolean;
  robotsAllowed: boolean;
  status: number;
  score: number;
  textChars: number;
};

export type LiveScanResult = {
  status: "ready";
  runtime?: "live" | "synthetic_demo";
  isSynthetic?: boolean;
  disclosure?: string;
  pageUrl: string;
  domainUrl: string;
  scannedAt: string;
  evidence: PageEvidence;
  pageAudit: BlockAudit;
  htmlAudit: HtmlVisibilityAudit;
  prompts: DomainPrompt[];
  observations: AnswerObservation[];
  crawlers: CrawlerCheck[];
};

export async function requestPageScan(
  pageUrl: string,
): Promise<LiveScanResult> {
  const response = await fetch("/api/visibility", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pageUrl }),
  });
  const body = (await response.json()) as LiveScanResult | { message?: string };
  if (!response.ok || !("status" in body) || body.status !== "ready")
    throw new Error(
      "message" in body && body.message
        ? body.message
        : "The page could not be analyzed.",
    );
  return body as LiveScanResult;
}
