/**
 * Text generation provider. Thin wrapper around the Anthropic Messages
 * API used by every LLM stage (rank/outline/write/seo/aeo/alt-text).
 *
 * - Reads ANTHROPIC_API_KEY from the environment.
 * - Sends the (long, stable) system prompt as a cacheable block so the
 *   voice + AEO-checklist prefix hits Anthropic's prompt cache across the
 *   stages of a single article.
 * - Retries transient errors (connection, timeout, 429, 5xx) with
 *   exponential backoff. Does NOT retry 4xx (those are prompt bugs).
 * - Returns the assistant text as a single string. JSON parsing /
 *   validation is the caller's job.
 */
import Anthropic from "@anthropic-ai/sdk";

import { sleep } from "../util.js";

export interface TextCallOptions {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export interface TextProvider {
  call(opts: TextCallOptions): Promise<string>;
}

const MAX_ATTEMPTS = 4;

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (err instanceof Anthropic.APIConnectionTimeoutError) return true;
  if (err instanceof Anthropic.RateLimitError) return true;
  if (err instanceof Anthropic.APIError) {
    const status = (err as { status?: number }).status;
    return status !== undefined && (status >= 500 || status === 408);
  }
  return false;
}

/** Newer Claude models (e.g. Opus 4.8) reject the `temperature` param. */
function isTemperatureDeprecation(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    const status = (err as { status?: number }).status;
    const msg = String((err as { message?: string }).message ?? "");
    return status === 400 && /temperature/i.test(msg);
  }
  return false;
}

export class AnthropicProvider implements TextProvider {
  private client: Anthropic;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Export it before running the engine.",
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async call(opts: TextCallOptions): Promise<string> {
    const { model, system, user, maxTokens = 8000, temperature = 0.7 } = opts;

    // Some models (Opus 4.8+) have deprecated `temperature`. Send it by
    // default; drop it and retry if the API rejects it.
    let sendTemperature = true;
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const resp = await this.client.messages.create({
          model,
          max_tokens: maxTokens,
          ...(sendTemperature ? { temperature } : {}),
          system: [
            {
              type: "text",
              text: system,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: user }],
        });

        return resp.content
          .map((block) => (block.type === "text" ? block.text : ""))
          .join("")
          .trim();
      } catch (err) {
        lastErr = err;
        if (sendTemperature && isTemperatureDeprecation(err)) {
          sendTemperature = false; // retry immediately without it
          continue;
        }
        if (!isRetryable(err) || attempt === MAX_ATTEMPTS - 1) throw err;
        const backoff = Math.min(20_000, 2_000 * 2 ** attempt);
        await sleep(backoff);
      }
    }
    throw lastErr;
  }
}
