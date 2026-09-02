import type { AnswerObservation } from "./runtime";

export type PromptSource = { title: string; url: string };
export type PromptModelAnswer = { model: string; answer: string; sources: PromptSource[] };
export type PromptImplementationTarget = { title: string; pageUrl: string; domainUrl: string; scope: "site-root" | "specific-page"; derivation: "curated_prompt_target" };
export type PromptRunPayload = {
  status: "ready";
  runType: "prompt";
  prompt: string;
  brand: string;
  subject: string;
  model: string;
  runtime: "openai_responses" | "browser_language_model" | "curated_demo";
  ranAt: string;
  target: PromptImplementationTarget;
  answers: PromptModelAnswer[];
  observations: AnswerObservation[];
};

const stopWords = new Set("a about after all an and are as assess at be before best brand brands by can company compare could describe do does evaluate explain for from give how i in is it me model most of on option options or our recommend should show tell that the their this to using versus vs what when where which who why with would you your".split(" "));
const nonBrandWords = new Set("answer buyer buyers choice choices comparison customer customers first intent market product products recommendation reliability risk strongest topic tradeoffs value".split(" "));
const positiveTerms = ["advantage", "benefit", "best", "clear", "effective", "good", "helpful", "positive", "recommend", "reliable", "strong", "trusted", "useful"];
const negativeTerms = ["concern", "drawback", "failure", "issue", "limit", "negative", "problem", "risk", "weak"];

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const words = (value: string): string[] => value.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
const countMatches = (value: string, terms: string[]) => terms.filter((term) => value.includes(term)).length;
const usableBrand = (value: string) => {
  const normalized = value.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\s+/g, " ").trim();
  const first = normalized.split(" ")[0]?.toLowerCase() ?? "";
  return normalized.length >= 2 && !stopWords.has(first) && !nonBrandWords.has(first) ? normalized : "";
};
const displayBrand = (value: string) => value === value.toLowerCase()
  ? value.split(/\s+/).map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part).join(" ")
  : value;

/**
 * The prompt is the only user input in this workflow, so the brand must come
 * from that prompt. The first explicit brand/entity is the measured subject;
 * comparison entities remain competitors.
 */
export function extractBrandFromPrompt(prompt: string): string {
  const quoted = [...prompt.matchAll(/["“']([^"”']{2,60})["”']/g)]
    .map((match) => usableBrand(match[1]))
    .find(Boolean);
  if (quoted) return displayBrand(quoted);

  const properNames = prompt.match(/\b[A-Z][A-Za-z0-9&.'-]*(?:\s+(?:[A-Z][A-Za-z0-9&.'-]*|of|and)){0,3}\b/g) ?? [];
  const proper = properNames.map((name) => {
    const parts = name.split(/\s+/);
    while (parts.length && (stopWords.has(parts[0].toLowerCase()) || nonBrandWords.has(parts[0].toLowerCase()))) parts.shift();
    const separator = parts.findIndex((part, index) => index > 0 && ["and", "versus", "vs"].includes(part.toLowerCase()));
    return usableBrand((separator > 0 ? parts.slice(0, separator) : parts).join(" "));
  }).find(Boolean);
  if (proper) return displayBrand(proper);

  const lowerPatterns = [
    /\b(?:about|is|does|can|should|would|will|for)\s+(?:the\s+)?([a-z][a-z0-9&.'-]{1,40})\b/i,
    /\b([a-z][a-z0-9&.'-]{1,40})\s+(?:vs\.?|versus|compared\s+(?:with|to))\b/i,
    /^\s*([a-z][a-z0-9&.'-]{1,40})\b/i,
  ];
  for (const pattern of lowerPatterns) {
    const candidate = usableBrand(prompt.match(pattern)?.[1] ?? "");
    if (candidate) return displayBrand(candidate);
  }
  return "";
}

export function subjectFromPrompt(prompt: string) {
  const brand = extractBrandFromPrompt(prompt);
  if (brand) return brand;
  const cleaned = prompt.replace(/[^a-zA-Z0-9&' -]+/g, " ").replace(/\s+/g, " ").trim();
  const subjectWords = cleaned.split(" ").filter((item) => !stopWords.has(item.toLowerCase())).slice(0, 9);
  return (subjectWords.join(" ") || cleaned || "Prompt topic").slice(0, 80);
}

export function validateBrandPrompt(promptInput: string) {
  const prompt = promptInput.trim();
  if (prompt.length < 3) throw new Error("Enter a prompt with at least 3 characters.");
  if (prompt.length > 2000) throw new Error("Keep the prompt under 2,000 characters.");
  const brand = extractBrandFromPrompt(prompt);
  if (!brand) throw new Error("Include the brand you want measured in the prompt.");
  return { prompt, brand };
}

export function buildPromptObservations(prompt: string, brand: string, model: string, answer: string, sources: PromptSource[]): AnswerObservation[] {
  const lower = answer.toLowerCase();
  const brandTerms = words(brand);
  const brandMentioned = brandTerms.some((term) => lower.includes(term));
  const promptTerms = [...new Set(words(prompt).filter((term) => !stopWords.has(term) && !brandTerms.includes(term)))].slice(0, 24);
  const matched = promptTerms.filter((term) => lower.includes(term)).length;
  const overlap = promptTerms.length ? matched / promptTerms.length : 1;
  const sourceCount = sources.length;
  const hasNumbers = /\b\d+(?:[.,]\d+)?(?:%|\b)/.test(answer);
  const evidenceTerms = countMatches(lower, ["according", "evidence", "research", "source", "study", "report"]);
  const tradeoffTerms = countMatches(lower, ["but", "however", "limit", "risk", "trade-off", "depends", "consider", "drawback"]);
  const recommendationTerms = countMatches(lower, ["recommend", "best", "choose", "should", "option", "suitable", "consider"]);
  const positive = countMatches(lower, positiveTerms);
  const negative = countMatches(lower, negativeTerms);
  const sentiment = clamp(55 + positive * 6 - negative * 5);
  const sourceUrls = sources.map((source) => source.url);
  const dimensions = [
    { sentimentTopic: "Brand presence", score: brandMentioned ? 100 : 0, cited: sourceCount > 0 },
    { sentimentTopic: "Prompt alignment", score: brandMentioned ? 35 + overlap * 65 : overlap * 25, cited: false },
    { sentimentTopic: "Evidence & trust", score: brandMentioned ? sourceCount * 24 + (hasNumbers ? 18 : 0) + evidenceTerms * 8 : 0, cited: sourceCount > 0 },
    { sentimentTopic: "Sentiment & trade-offs", score: brandMentioned ? 32 + tradeoffTerms * 13 + Math.min(22, positive * 4 + negative * 4) : 0, cited: sourceCount > 0 && tradeoffTerms > 0 },
    { sentimentTopic: "Recommendation", score: brandMentioned ? 28 + recommendationTerms * 14 : 0, cited: sourceCount > 0 && recommendationTerms > 0 },
  ];

  return dimensions.map(({ sentimentTopic, score, cited }) => ({
    engine: model,
    query: `${prompt} — ${sentimentTopic}`,
    sentimentTopic,
    mentioned: clamp(score) >= 50,
    cited,
    sentiment: sentimentTopic === "Sentiment & trade-offs" ? clamp((sentiment + score) / 2) : sentiment,
    leader: brandMentioned ? brand : "Other options",
    sourceUrls,
    sourceKind: "answer_engine",
  }));
}

export function createPromptRunPayload(input: {
  prompt: string;
  brand: string;
  model: string;
  runtime: PromptRunPayload["runtime"];
  answer: string;
  sources?: PromptSource[];
  target?: PromptImplementationTarget;
}): PromptRunPayload {
  const sources = input.sources ?? [];
  const answers = [{ model: input.model, answer: input.answer, sources }];
  return {
    status: "ready",
    runType: "prompt",
    prompt: input.prompt,
    brand: input.brand,
    subject: input.brand,
    model: input.model,
    runtime: input.runtime,
    ranAt: new Date().toISOString(),
    target: input.target ?? { title: `${input.brand} site`, pageUrl: "https://example.com/", domainUrl: "https://example.com", scope: "site-root", derivation: "curated_prompt_target" },
    answers,
    observations: buildPromptObservations(input.prompt, input.brand, input.model, input.answer, sources),
  };
}
