import { createDemoPromptRun } from "./demo-prompts";
import type { PromptRunPayload } from "./prompt-analysis";

export async function requestPromptRun(prompt: string): Promise<PromptRunPayload> {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 780));
  return createDemoPromptRun(prompt);
}
