/**
 * Stage 2: outline. Turn a ranked Topic into a structured Outline by
 * asking the LLM for strict JSON, validated with zod. One self-repair
 * retry on validation failure.
 */
import { Outline, type ProjectConfig, type Topic } from "../types.js";
import type { EngineContext } from "../context.js";
import { sharedSystemPrefix } from "../prompts.js";
import { extractJson } from "../util.js";
import { log } from "../log.js";

function buildUserPrompt(
  topic: Topic,
  project: ProjectConfig,
  retryError?: string,
): string {
  const art = project.article;
  const feedSnippet = topic.feedItem
    ? `\nFeed item that surfaced this topic:\n- Title: ${topic.feedItem.title}\n- Source: ${topic.feedItem.source}\n- Summary: ${topic.feedItem.summary.slice(0, 500)}\n`
    : "";

  const retryBlock = retryError
    ? `\n\nIMPORTANT — your previous response failed schema validation:\n${retryError}\nReturn ONLY valid JSON matching the schema exactly. No prose, no code fences, no trailing commas.\n`
    : "";

  return `Draft a JSON outline for the next article.

Topic:
- Target keyword: "${topic.keyword.keyword}" (intent: ${topic.keyword.intent})
- Angle: ${topic.angle}
- Why it scored well: ${topic.reason}
${feedSnippet}
Constraints:
- workingTitle: <=60 characters, includes the target keyword verbatim once, a real headline (not stuffed).
- targetKeyword: copy the target keyword above verbatim.
- targetWordCount: ${art.targetWordCount} (the article aims for ${art.minWordCount}-${art.maxWordCount} words).
- tldr: ONE paragraph, <=80 words, written so an LLM can quote it as the answer to the keyword's underlying question. Lead with the actual answer. No marketing language.
- sections: 4-7 sections. Each: heading (H2 text, phrased as a question or imperative), bullets (3-6 short strings), includeTable (true when comparing options/plans/templates), includeHowTo (true for a numbered how-to with discrete steps).
- faqs: 3-5 {q,a} pairs. Questions match real search queries; answers 1-3 sentences, citable verbatim, concretely useful.

Return ONLY this JSON shape — no prose, no code fences:

{
  "workingTitle": "...",
  "targetKeyword": "...",
  "targetWordCount": ${art.targetWordCount},
  "tldr": "...",
  "sections": [
    { "heading": "...", "bullets": ["...","..."], "includeTable": false, "includeHowTo": false }
  ],
  "faqs": [ { "q": "...", "a": "..." } ]
}${retryBlock}`;
}

export async function draftOutline(
  topic: Topic,
  ctx: EngineContext,
): Promise<Outline> {
  const system = sharedSystemPrefix(ctx.project, ctx.voice);
  let lastError: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const user = buildUserPrompt(topic, ctx.project, lastError);
    const raw = await ctx.text.call({
      model: ctx.project.llm.outlineModel,
      system,
      user,
      maxTokens: ctx.project.llm.maxTokens,
      temperature: 0.5,
    });

    let data: unknown;
    try {
      data = extractJson(raw);
    } catch (err) {
      lastError = `Could not parse JSON: ${err instanceof Error ? err.message : String(err)}`;
      log.warn(`outline: JSON parse failed (attempt ${attempt + 1})`);
      continue;
    }

    const result = Outline.safeParse(data);
    if (result.success) return result.data;
    lastError = JSON.stringify(result.error.issues);
    log.warn(`outline: schema validation failed (attempt ${attempt + 1})`);
  }

  throw new Error(`Outline LLM returned invalid output after retry: ${lastError}`);
}
