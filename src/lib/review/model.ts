import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { env } from "@/lib/env";
import { batchResultSchema, overallSummarySchema, SYSTEM_PROMPT, type BatchResult } from "./prompt";

export type Usage = { inputTokens: number; outputTokens: number };

export interface ReviewModel {
  readonly name: string;
  reviewBatch(prompt: string): Promise<{ result: BatchResult; usage: Usage }>;
  summarize(prompt: string): Promise<{ summary: string; usage: Usage }>;
}

export class ModelRefusalError extends Error {}

function usageOf(message: Anthropic.Beta.BetaMessage): Usage {
  const u = message.usage;
  return {
    inputTokens: u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0),
    outputTokens: u.output_tokens,
  };
}

export class ClaudeReviewModel implements ReviewModel {
  readonly name: string;
  private readonly client: Anthropic;
  private readonly effort: "low" | "medium" | "high" | "xhigh" | "max";

  constructor(options: { apiKey?: string; model?: string; effort?: ClaudeReviewModel["effort"] } = {}) {
    this.client = new Anthropic({ apiKey: options.apiKey ?? env().ANTHROPIC_API_KEY, maxRetries: 3 });
    this.name = options.model ?? env().ANTHROPIC_MODEL;
    this.effort = options.effort ?? env().ANTHROPIC_EFFORT;
  }

  private async parse<T extends z.ZodType>(prompt: string, schema: T, effort: ClaudeReviewModel["effort"]) {
    const message = await this.client.beta.messages.parse({
      model: this.name,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort, format: betaZodOutputFormat(schema) },
      // On a policy decline, retry server-side on Anthropic's recommended model for that category.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
    });

    if (message.stop_reason === "refusal") {
      throw new ModelRefusalError(
        `The model declined to review this part${message.stop_details?.category ? ` (${message.stop_details.category})` : ""}.`,
      );
    }
    if (message.stop_reason === "max_tokens" || !message.parsed_output) {
      throw new Error(`The model returned an incomplete response (stop reason: ${message.stop_reason}).`);
    }
    return { output: message.parsed_output as z.infer<T>, usage: usageOf(message) };
  }

  async reviewBatch(prompt: string) {
    const { output, usage } = await this.parse(prompt, batchResultSchema, this.effort);
    return { result: output, usage };
  }

  async summarize(prompt: string) {
    const { output, usage } = await this.parse(prompt, overallSummarySchema, "low");
    return { summary: output.summary, usage };
  }
}
