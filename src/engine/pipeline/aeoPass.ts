/**
 * Stage 5: AEO pass. Hardens the article for answer engines:
 *  - guarantees a citable `## Quick answer` (<=80 words),
 *  - nudges tables / numbered steps where they fit,
 *  - builds JSON-LD blocks (Article, FAQPage, HowTo).
 */
import { z } from "zod";

import type { Article, ProjectConfig } from "../types.js";
import type { EngineContext } from "../context.js";
import { sharedSystemPrefix } from "../prompts.js";
import { extractJson } from "../util.js";
import { log } from "../log.js";

const AeoPatch = z.object({
  body: z.string().min(1),
  quickAnswer: z.string().max(800).default(""),
});

function buildUserPrompt(article: Article): string {
  const targetKeyword = article.frontmatter.keywords[0] ?? "";
  return `Apply an AEO (Answer-Engine Optimization) pass. Return ONLY a JSON object — no prose, no fences:

{
  "body": "...",        // full updated MDX body
  "quickAnswer": "..."  // text of the '## Quick answer' section (no heading), <=80 words, citable verbatim
}

Target keyword: "${targetKeyword}"

Edits to the body:
1. QUICK ANSWER — ensure the body starts with \`## Quick answer\`. If missing, add it as the first section: <=80 words, leads with the actual answer, self-contained so an LLM can quote it.
2. TABLES — where the article compares options/plans/templates/timeframes, ensure a real Markdown table. Don't invent comparisons; convert existing prose comparisons.
3. NUMBERED STEPS — where a procedure is described, use numbered steps.
4. CITABILITY — tighten question-like headings/openers into clean Q&A. Keep paragraphs <=3 sentences.
5. Literal placeholders use SQUARE brackets. Never curly braces.

Surgical edits only — do NOT rewrite the prose at large.

Current body (MDX):
---
${article.body}
---`;
}

function hasQuickAnswer(body: string): boolean {
  return /^##\s+Quick answer\b/im.test(body);
}

function extractHowToSteps(body: string): Array<Record<string, unknown>> {
  const section = body.match(
    /^##\s+(How to[^\n]*)\n+([\s\S]*?)(?=^##\s+|$(?![\s\S]))/im,
  );
  if (!section) return [];
  const block = section[2] ?? "";
  const steps = [...block.matchAll(/^\s*\d+\.\s+(.+)$/gm)].map((m) => m[1]!.trim());
  if (steps.length < 2) return [];
  return steps.map((line, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: line.length <= 80 ? line : line.slice(0, 79).replace(/\s+\S*$/, "") + "...",
    text: line,
  }));
}

function siteOrigin(project: ProjectConfig): string {
  return project.siteUrl.replace(/\/+$/, "");
}

function buildArticleJsonLd(
  article: Article,
  project: ProjectConfig,
): Record<string, unknown> {
  const fm = article.frontmatter;
  const url = `${siteOrigin(project)}${project.layout.publicUrlBase}/${article.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fm.title,
    description: fm.description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: fm.date,
    dateModified: fm.date,
    author: { "@type": "Person", name: fm.author },
    publisher: {
      "@type": "Organization",
      name: project.name,
      logo: { "@type": "ImageObject", url: `${siteOrigin(project)}/opengraph-image` },
    },
    ...(fm.image ? { image: `${siteOrigin(project)}${fm.image}` } : {}),
  };
}

function buildFaqJsonLd(article: Article): Record<string, unknown> | null {
  const faqs = article.frontmatter.faqs;
  if (faqs.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function buildHowToJsonLd(body: string): Record<string, unknown> | null {
  const steps = extractHowToSteps(body);
  if (steps.length === 0) return null;
  const name = body.match(/^##\s+(How to[^\n]+)$/im)?.[1]?.trim() ?? "How to";
  return { "@context": "https://schema.org", "@type": "HowTo", name, step: steps };
}

export async function applyAeo(
  article: Article,
  ctx: EngineContext,
): Promise<Article> {
  const system = sharedSystemPrefix(ctx.project, ctx.voice);
  const raw = await ctx.text.call({
    model: ctx.project.llm.aeoPassModel,
    system,
    user: buildUserPrompt(article),
    maxTokens: ctx.project.llm.maxTokens,
    temperature: 0.4,
  });

  let body = article.body;
  try {
    body = AeoPatch.parse(extractJson(raw)).body;
  } catch (err) {
    log.warn(
      `aeoPass: invalid LLM patch (${err instanceof Error ? err.message : String(err)}) — keeping current body`,
    );
  }

  // Guarantee a Quick answer section.
  if (!hasQuickAnswer(body)) {
    body = `## Quick answer\n\n${article.frontmatter.description.trim()}\n\n${body.replace(/^\s+/, "")}`;
  }

  const blocks: Array<Record<string, unknown>> = [
    buildArticleJsonLd(article, ctx.project),
  ];
  const faq = buildFaqJsonLd(article);
  if (faq) blocks.push(faq);
  const howto = buildHowToJsonLd(body);
  if (howto) blocks.push(howto);

  const stages = article.stagesCompleted.includes("aeoPass")
    ? article.stagesCompleted
    : [...article.stagesCompleted, "aeoPass"];

  return { ...article, body, jsonLdBlocks: blocks, stagesCompleted: stages };
}
