import type { ReviewModel } from "@/lib/review/model";
import type { BatchResult } from "@/lib/review/prompt";

/** Returns canned batch results and records every prompt it was sent. */
export class FakeModel implements ReviewModel {
  readonly name = "fake-model";
  prompts: string[] = [];
  summaryPrompts: string[] = [];
  constructor(private readonly respond: (prompt: string, call: number) => BatchResult | Error) {}

  async reviewBatch(prompt: string) {
    this.prompts.push(prompt);
    const result = this.respond(prompt, this.prompts.length);
    if (result instanceof Error) throw result;
    return { result, usage: { inputTokens: 1000, outputTokens: 200 } };
  }

  async summarize(prompt: string) {
    this.summaryPrompts.push(prompt);
    return { summary: "Combined summary.", usage: { inputTokens: 100, outputTokens: 50 } };
  }
}
