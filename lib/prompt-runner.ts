import { createDemoPromptRun } from "../components/true-geo/demo-prompts";

export {
  buildPromptObservations,
  createPromptRunPayload,
  extractBrandFromPrompt,
  subjectFromPrompt,
  validateBrandPrompt,
} from "../components/true-geo/prompt-analysis";
export type { PromptModelAnswer, PromptRunPayload, PromptSource } from "../components/true-geo/prompt-analysis";

export const hasServerPromptRuntime = () => false;
export const getServerPromptModel = () => "Curated benchmark · 4 engines";
export async function runPrompt(promptInput: string) { return createDemoPromptRun(promptInput); }
