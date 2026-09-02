import benchmark from "./demo-prompts.json";
import type { AnswerObservation } from "./runtime";
import type { PromptRunPayload, PromptSource } from "./prompt-analysis";

type DemoDimension = {
  topic: string;
  query: string;
  coverage: number;
  citation: number;
  sentiment: number;
  leader: string;
  sourceIndexes: number[];
};

export type DemoPromptScenario = {
  id: string;
  category: string;
  label: string;
  prompt: string;
  brand: string;
  target: { title: string; pageUrl: string };
  summary: string;
  answer: string;
  competitors: string[];
  sources: PromptSource[];
  engineNotes: Record<string, string>;
  dimensions: DemoDimension[];
};

export type DemoPromptOption = Pick<DemoPromptScenario, "id" | "category" | "label" | "prompt" | "brand" | "summary">;

const scenarios = benchmark.scenarios as DemoPromptScenario[];
const engineBias: Record<string, { coverage: number; citation: number; sentiment: number }> = {
  ChatGPT: { coverage: 0, citation: -3, sentiment: 1 },
  Gemini: { coverage: 3, citation: 2, sentiment: 2 },
  Perplexity: { coverage: -4, citation: 11, sentiment: -1 },
  Claude: { coverage: -1, citation: -6, sentiment: 3 },
};
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const demoPromptOptions: DemoPromptOption[] = scenarios.map(({ id, category, label, prompt, brand, summary }) => ({ id, category, label, prompt, brand, summary }));

export function findDemoScenario(value: string): DemoPromptScenario | undefined {
  const normalized = value.trim().toLowerCase();
  return scenarios.find((scenario) => scenario.id.toLowerCase() === normalized || scenario.prompt.toLowerCase() === normalized);
}

function buildObservations(scenario: DemoPromptScenario): AnswerObservation[] {
  return (benchmark.engines as string[]).flatMap((engine) => {
    const bias = engineBias[engine] ?? { coverage: 0, citation: 0, sentiment: 0 };
    return scenario.dimensions.map((dimension) => {
      const coverage = clamp(dimension.coverage + bias.coverage);
      const citation = clamp(dimension.citation + bias.citation);
      const mentioned = coverage >= 50;
      const cited = citation >= 55;
      return {
        engine,
        query: dimension.query,
        sentimentTopic: dimension.topic,
        mentioned,
        cited,
        sentiment: clamp(dimension.sentiment + bias.sentiment),
        leader: mentioned && coverage >= 75 ? scenario.brand : dimension.leader,
        sourceUrls: cited ? dimension.sourceIndexes.map((index) => scenario.sources[index]?.url).filter(Boolean) : [],
        sourceKind: "answer_engine" as const,
      };
    });
  });
}

function modelAnswer(scenario: DemoPromptScenario, engine: string): string {
  const strongest = [...scenario.dimensions].sort((a, b) => b.coverage - a.coverage).slice(0, 2);
  const weakest = [...scenario.dimensions].sort((a, b) => a.coverage - b.coverage).slice(0, 2);
  const strengthText = strongest.map((item) => `${item.topic.toLowerCase()} (${item.coverage}/100 coverage)`).join(" and ");
  const gapText = weakest.map((item) => `${item.topic.toLowerCase()} (${item.coverage}/100 coverage)`).join(" and ");
  const sourceText = scenario.sources.slice(0, 3).map((source) => source.title).join(", ");
  const alternative = weakest[0]?.leader ?? scenario.competitors[0] ?? "the leading alternative";
  const note = scenario.engineNotes[engine] ?? scenario.summary;

  if (engine === "ChatGPT") {
    return [
      `Short answer: ${scenario.brand} is a credible option for this need, but the recommendation is conditional rather than automatic. ${scenario.answer}`,
      `The strongest parts of the answer are ${strengthText}. The clearest weaknesses are ${gapText}; this is where ${alternative} currently has the stronger story.`,
      `${note} For this exact prompt, the practical next step is to verify the weakest claims, compare the named alternatives on the same criteria, and then decide whether ${scenario.brand} still earns the shortlist.`,
    ].join("\n\n");
  }
  if (engine === "Gemini") {
    return [
      `Criteria-led comparison for ${scenario.brand}: the benchmark gives the brand its best marks for ${strongest.map((item) => item.topic).join(" and ")}. ${scenario.summary}`,
      `The decision changes when the buyer weighs ${weakest.map((item) => item.topic).join(" and ")}. Those areas score lower because the answer provides less complete proof than it does for the strengths. Relevant comparison evidence in this simulation includes ${sourceText}.`,
      `${note} Suggested decision rule: shortlist ${scenario.brand} only if its evidence for ${weakest[0]?.topic.toLowerCase() ?? "the weakest criterion"} is as specific and verifiable as the evidence supplied by ${alternative}.`,
    ].join("\n\n");
  }
  if (engine === "Perplexity") {
    return [
      `Evidence view: ${scenario.brand} is visible in the answer and performs most strongly on ${strengthText}. The benchmark sources used for this conclusion are ${sourceText}.`,
      `The main evidence gap is ${gapText}. On the weakest measured dimension, ${alternative} leads because the available answer set contains clearer or more frequently cited support. This does not prove that the alternative is universally better; it shows which claim is better supported in this exact benchmark.`,
      `${note} Recommendation: add a directly citable fact for each weak dimension, disclose the important trade-off, and rerun the same prompt to see whether coverage and citation scores improve.`,
    ].join("\n\n");
  }
  return [
    `Decision framing: a buyer should choose ${scenario.brand} only when its demonstrated strengths match the buyer's priorities. Here, those strengths are ${strongest.map((item) => item.topic.toLowerCase()).join(" and ")}.`,
    `${scenario.summary} The weak dimensions—${weakest.map((item) => item.topic.toLowerCase()).join(" and ")}—matter because they affect confidence in the final recommendation, not merely whether the brand is mentioned. ${alternative} is the comparison leader on the weakest point.`,
    `${note} A balanced answer should state who ${scenario.brand} fits, who may be better served by an alternative, what proof supports the choice, and what the buyer must verify before acting.`,
  ].join("\n\n");
}

export function createDemoPromptRun(promptOrId: string): PromptRunPayload {
  const scenario = findDemoScenario(promptOrId);
  if (!scenario) throw new Error("Choose one of the curated benchmark prompts before running the analysis.");
  const answers = (benchmark.engines as string[]).map((engine) => ({
    model: engine,
    answer: modelAnswer(scenario, engine),
    sources: [{ title: scenario.target.title, url: scenario.target.pageUrl }, ...scenario.sources.filter((_, index) => (index + engine.length) % 3 !== 0)],
  }));
  return {
    status: "ready",
    runType: "prompt",
    prompt: scenario.prompt,
    brand: scenario.brand,
    subject: scenario.brand,
    model: "Curated benchmark · 4 engines",
    runtime: "curated_demo",
    ranAt: new Date().toISOString(),
    target: {
      title: scenario.target.title,
      pageUrl: scenario.target.pageUrl,
      domainUrl: new URL(scenario.target.pageUrl).origin,
      scope: new URL(scenario.target.pageUrl).pathname === "/" ? "site-root" : "specific-page",
      derivation: "curated_prompt_target",
    },
    answers,
    observations: buildObservations(scenario),
  };
}

export function demoPromptCatalog() {
  return {
    version: benchmark.version,
    description: benchmark.description,
    engines: benchmark.engines,
    scenarioCount: scenarios.length,
    expandedObservationCount: scenarios.reduce((total, scenario) => total + scenario.dimensions.length * benchmark.engines.length, 0),
    prompts: demoPromptOptions,
  };
}
