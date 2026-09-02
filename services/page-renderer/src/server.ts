import express from "express";
import { chromium, type Browser } from "playwright";

const app = express();
const port = Number(process.env.PAGE_AUDIT_RENDERER_PORT || 8790);
const expectedToken = process.env.PAGE_AUDIT_RENDERER_TOKEN?.trim() || "";
let browserPromise: Promise<Browser> | null = null;

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

function publicUrl(input: unknown) {
  const url = new URL(String(input || "").trim());
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Enter a public http:// or https:// page URL.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Private URLs cannot be rendered.");
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) throw new Error("Private URLs cannot be rendered.");
  if (host === "::1" || /^(fc|fd|fe80)/.test(host)) throw new Error("Private URLs cannot be rendered.");
  url.hash = "";
  return url.href;
}

async function browser() {
  browserPromise ??= chromium.launch({ headless: true });
  return browserPromise;
}

app.get("/health", (_request, response) => response.json({ status: "ready", renderer: "playwright-chromium" }));

app.post("/render", async (request, response) => {
  try {
    if (expectedToken && request.header("authorization") !== `Bearer ${expectedToken}`) return response.status(401).json({ error: "Unauthorized renderer request." });
    const url = publicUrl(request.body?.url);
    const activeBrowser = await browser();
    const context = await activeBrowser.newContext({ javaScriptEnabled: true, serviceWorkers: "block", userAgent: "Mozilla/5.0 (compatible; TRUE-GEO-Human-View/1.0)" });
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForTimeout(500);
      const html = await page.content();
      response.type("html").send(html);
    } finally {
      await context.close();
    }
  } catch (error) {
    response.status(422).json({ error: error instanceof Error ? error.message : "The browser could not render this page." });
  }
});

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`TRUE GEO Playwright renderer ready at http://127.0.0.1:${port}`);
});

async function close() {
  server.close();
  if (browserPromise) await (await browserPromise).close();
}

process.once("SIGINT", () => void close().finally(() => process.exit(0)));
process.once("SIGTERM", () => void close().finally(() => process.exit(0)));
