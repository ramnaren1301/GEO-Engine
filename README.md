# TRUE GEO ENGINE

TRUE GEO ENGINE is a brand- and industry-agnostic GEO/AEO workspace with two independent workflows:

- **AI Visibility** uses one public page URL as the deterministic seed for a synthetic raw-HTML versus post-hydration comparison, then calculates URL-scoped simulated crawler, prompt, gap, and next-step evidence without fetching the target page.
- **Run a Prompt** replays a selected prompt from a bundled, fictional benchmark. It uses no paid LLM, API key, browser AI feature, page URL, or external request.

Both workflows populate the same five evidence views: **AI visibility**, **Answer engine scores**, **Content/Answer gaps**, **Next steps**, and **Agent activity**. Results remain isolated by workflow, so URL evidence is never relabeled as prompt evidence.

## Curated prompt benchmark

`components/true-geo/demo-prompts.json` is the source of truth for prompt simulation. It contains eight fictional scenarios spanning automotive, B2B technology, financial services, healthcare, travel, telecommunications, consumer products, and education.

Each scenario contains:

- one selectable high-intent prompt and measured brand;
- a benchmark answer and summary;
- three competitors;
- four evidence sources;
- four answer-engine interpretations;
- six sentiment topics with coverage, citation, sentiment, leader, and source mappings.

At runtime the catalog expands into **192 deterministic evidence rows**:

```text
8 prompts × 4 answer engines × 6 sentiment dimensions = 192 observations
```

The four engines are ChatGPT, Gemini, Perplexity, and Claude. These are clearly presented as simulated benchmark perspectives, not live model calls. The same prompt always produces the same evidence, while the scoring pipeline calculates visibility, citations, sentiment, competitors, gaps, and next steps from those rows.

The prompt benchmark needs no `.env`, API key, model account, or paid inference.

## Page AI visibility

Select **AI Visibility**, enter one public page URL, and click **Run AI visibility**. The workflow deterministically generates two synthetic states from that URL:

1. **AI view:** simulated source HTML containing content available before JavaScript.
2. **Human view:** simulated post-hydration HTML containing the complete ordered page.

The synthetic post-hydration page supplies one ordered master list of `h1–h6`, `p`, `li`, `figcaption`, `blockquote`, and `td` blocks. Both columns display that identical list in identical order. The AI column marks each block **Fully extractable** when its normalized signature exists in the synthetic raw HTML, otherwise **Not visible to AI**. Simulated metadata, Schema.org JSON-LD types, and FAQ schema remain in a separate machine-readable-signals section.

The same canonical URL always produces the same content and scores; different URLs produce distinct scenarios. Four deterministic crawler perspectives vary the evidence used for answer-engine scores. Private-network URLs are rejected. Every page result and download is visibly labeled **synthetic demo** and requires verification before publishing.

## Prompt workflow

Select **Run a Prompt**, choose any bundled benchmark prompt, and click **Run prompt**. The selected prompt appears in a large, read-only prompt area with the run button beside it. The workflow calculates:

- overall AI visibility;
- one score for each of four answer engines;
- coverage and citation rate;
- sentiment and recommendation quality;
- six prompt-specific answer dimensions;
- competitor leaders;
- ranked answer gaps;
- recommended next steps;
- a downloadable prompt-analysis ZIP.

The prompt workflow never displays or sends a page URL.

## Browser WebMCP tools

The interface registers eight tools through the imperative browser WebMCP contract:

```ts
document.modelContext.registerTool({
  name: entry.name,
  title: entry.title,
  description: entry.description,
  inputSchema: entry.inputSchema,
  execute: async (input) => JSON.stringify(await execute(entry.name, input)),
});
```

| Tool                      | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| `geo_ai_visibility_audit` | Generate the synthetic URL-scoped page analysis    |
| `geo_analyze_prompt`      | Replay one exact prompt from the curated benchmark |
| `geo_visibility_overview` | Read the active score and evidence components      |
| `geo_list_tools`          | Export the browser WebMCP catalog                  |
| `geo_content_gaps`        | Explain one ranked gap from active evidence        |
| `geo_generate_next_steps` | Open page- or prompt-specific next steps           |
| `geo_download_package`    | Download the active evidence package               |
| `geo_export_action_plan`  | Export the active action plan                      |

`geo_analyze_prompt` accepts only `prompt`; its schema contains no URL or model field. Its prompt field is constrained to the eight bundled catalog values.

## Downloads

Page runs produce a 16-file synthetic draft ZIP containing a disclosure, consolidated `llms.txt`, FAQs, JSON-LD, schema, preview HTML, the Human-vs-AI block audit, answer-engine scores, high-intent prompts, action plan, and WebMCP manifests. Every file must be verified against the real page before use.

Prompt runs produce a separate 16-file target-specific implementation and evidence ZIP containing `llms.txt`, FAQs, JSON-LD/schema, preview HTML, the selected prompt, four distinct benchmark answers, citations, scores, dimensions, gaps, next steps, action plan, and WebMCP manifests.

## Source layout

- `components/true-geo/demo-prompts.json` — complete curated benchmark data
- `components/true-geo/demo-prompts.ts` — deterministic evidence expansion
- `components/true-geo/PromptBar.tsx` — mode pills, prompt selector, URL input
- `components/true-geo/PageVisibilityAudit.tsx` — aligned Human vs AI block interface
- `components/true-geo/page-audit.ts` — exact audit data model and client normalization
- `components/true-geo/TrueGeoApp.tsx` — isolated workflow state and all tab wiring
- `components/true-geo/webmcp.ts` — direct browser WebMCP registration
- `components/true-geo/tool-manifest.ts` — portable eight-tool catalog
- `lib/synthetic-page-scan.ts` — deterministic URL-derived raw/hydrated fixtures and simulated crawler perspectives
- `lib/page-audit.ts` — ordered block classifier and structural-signal extractor shared with optional live-audit development
- `lib/visibility-scanner.ts` — URL-scoped prompt and score analysis fed by the synthetic fixtures in the challenge build
- `services/page-renderer/` — optional local Playwright reference, not used by the hosted challenge demo
- `app/api/page-audit/route.ts` — `POST /api/page-audit { url }`
- `app/api/prompt/route.ts` — benchmark catalog and deterministic prompt endpoint
- `app/api/visibility/route.ts` — deterministic synthetic page visibility endpoint
- `public/workflows.html` — animated use-case and workflow guide

## Run locally

Requires Node.js 22.13 or later. Install the app:

```bash
npm run install:ci
```

Start the web app:

```bash
npm run dev
```

No `.env` file, API key, browser renderer, external service, network request, or quota is required for either challenge workflow. `services/page-renderer/` remains only as an optional reference for future local live-audit development and is not called by the public routes.

## Validate

```bash
npm test
```

## License

MIT — see [LICENSE](LICENSE).
