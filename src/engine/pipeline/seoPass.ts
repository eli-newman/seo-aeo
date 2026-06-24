/**
 * Stage 4: SEO pass. Refines title/description/keywords, normalizes
 * heading hierarchy, inserts internal links — via a JSON patch the LLM
 * returns, applied to the Article. Falls back to in-place fixes if the
 * patch is invalid.
 */
import { z } from "zod";

import type { Article } from "../types.js";
import type { EngineContext } from "../context.js";
import { sharedSystemPrefix } from "../prompts.js";
import { extractJson } from "../util.js";
import { log } from "../log.js";

const SeoPatch = z.object({
  title: z.string().min(1).max(70),
  description: z.string().min(1).max(160),
  keywords: z.array(z.string()).default([]),
  body: z.string().min(1),
});

function buildUserPrompt(article: Article, ctx: EngineContext): string {
  const fm = article.frontmatter;
  const targetKeyword = fm.keywords[0] ?? "";
  const links =
    ctx.project.article.internalLinkTargets
      .map((t) => `  - [${t.anchor}](${t.url})`)
      .join("\n") || "  - (none configured)";

  return `Apply an SEO pass to this article. Return ONLY a JSON object — no prose, no fences:

{
  "title": "...",       // <=60 chars, target keyword once, near the front
  "description": "...", // <=155 chars, includes target keyword + concrete benefit
  "keywords": ["...","..."], // 5-8 items, lowercase, target keyword first
  "body": "..."         // full MDX body with the edits below applied
}

Target keyword: "${targetKeyword}"

Edits:
1. TITLE — <=60 chars, target keyword once near the front, a real headline.
2. DESCRIPTION — <=155 chars, target keyword + a concrete benefit, one sentence.
3. KEYWORDS — 5-8 lowercase keywords, target keyword at index 0, long-tail variants from the H2s.
4. BODY — same MDX with: no H1 (demote any to H2); clean H2/H3 hierarchy (no skipped levels); 1-3 of these internal links placed naturally, especially in the closing section:
${links}
   Use \`[anchor](/path)\` syntax; skip ones that don't fit. Literal placeholders use SQUARE brackets. Do NOT rewrite prose or restructure — surgical edits only.

Current frontmatter:
- title: ${fm.title}
- description: ${fm.description}
- keywords: ${JSON.stringify(fm.keywords)}

Current body (MDX):
---
${article.body}
---`;
}

function normalizeHeadings(body: string): string {
  let inFence = false;
  return body
    .split("\n")
    .map((line) => {
      if (line.trimStart().startsWith("```")) {
        inFence = !inFence;
        return line;
      }
      if (!inFence && /^# [^#]/.test(line)) return "#" + line; // H1 -> H2
      return line;
    })
    .join("\n");
}

function ensureInternalLink(body: string, ctx: EngineContext): string {
  const targets = ctx.project.article.internalLinkTargets;
  if (targets.length === 0) return body;
  if (targets.some((t) => body.includes(t.url))) return body;
  const primary = targets[0]!;
  return (
    body.trimEnd() +
    `\n\nWant this handled for you? See [${primary.anchor}](${primary.url}).\n`
  );
}

/** Looks like a real keyword, not a leaked sentence/heading. */
function isKeywordLike(k: string): boolean {
  return k.length <= 60 && k.split(/\s+/).length <= 7;
}

function mergeKeywords(existing: string[], incoming: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  // Incoming (the SEO pass's curated set) first; existing is just the seed.
  for (const kw of [...incoming, ...existing]) {
    const k = kw.trim().toLowerCase();
    if (!k || seen.has(k) || !isKeywordLike(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out.slice(0, 8); // cap — 5-8 is the sweet spot
}

export async function applySeo(
  article: Article,
  ctx: EngineContext,
): Promise<Article> {
  const system = sharedSystemPrefix(ctx.project, ctx.voice);
  const raw = await ctx.text.call({
    model: ctx.project.llm.seoPassModel,
    system,
    user: buildUserPrompt(article, ctx),
    maxTokens: ctx.project.llm.maxTokens,
    temperature: 0.4,
  });

  const fm = article.frontmatter;
  let title = fm.title;
  let description = fm.description;
  let body = article.body;
  let keywords = fm.keywords;

  try {
    const patch = SeoPatch.parse(extractJson(raw));
    title = patch.title.trim().slice(0, 70);
    description = patch.description.trim().slice(0, 180);
    body = patch.body;
    keywords = mergeKeywords(fm.keywords, patch.keywords);
  } catch (err) {
    log.warn(
      `seoPass: invalid LLM patch (${err instanceof Error ? err.message : String(err)}) — in-place fixes only`,
    );
  }

  body = normalizeHeadings(body);
  body = ensureInternalLink(body, ctx);

  const stages = article.stagesCompleted.includes("seoPass")
    ? article.stagesCompleted
    : [...article.stagesCompleted, "seoPass"];

  return {
    ...article,
    frontmatter: { ...fm, title, description, keywords },
    body,
    stagesCompleted: stages,
  };
}
