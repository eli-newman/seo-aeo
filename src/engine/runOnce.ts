/**
 * Orchestrates one full article generation:
 *   ingest → rank → outline → write → seoPass → aeoPass → images
 *          → audit (+1 self-repair) → publish
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import {
  type Article,
  type AuditResult,
  type Topic,
} from "./types.js";
import { loadProject } from "./config.js";
import type { EngineContext } from "./context.js";
import { AnthropicProvider } from "./providers/text.js";
import {
  GeminiProvider,
  NullImageProvider,
  type ImageProvider,
} from "./providers/image.js";
import { fetchFeeds } from "./pipeline/ingest.js";
import { rankTopics, topicFromKeyword } from "./pipeline/rank.js";
import { draftOutline } from "./pipeline/outline.js";
import { draftArticle, countWords } from "./pipeline/write.js";
import { applySeo } from "./pipeline/seoPass.js";
import { applyAeo } from "./pipeline/aeoPass.js";
import { applyImages } from "./pipeline/images.js";
import { audit } from "./pipeline/audit.js";
import { writeDraft, openDraftPr, type PublishResult } from "./pipeline/publish.js";
import { renderMdx } from "./mdx.js";
import { sharedSystemPrefix } from "./prompts.js";
import { extractJson } from "./util.js";
import { log } from "./log.js";

export interface RunOptions {
  /** Write a local preview instead of opening a PR. */
  dryRun?: boolean;
  /** Override the config's images setting for this run (false = off). */
  images?: boolean;
  /** Target a specific keyword instead of auto-ranking (e.g. a "vs" page). */
  keyword?: string;
}

export interface RunResult {
  topic: Topic;
  article: Article;
  audit: AuditResult;
  previewPath?: string;
  publish?: PublishResult;
}

/** Build an EngineContext from a repo root, wiring up providers. */
export async function createContext(
  root: string,
  options: RunOptions = {},
): Promise<EngineContext> {
  const { config, keywords, feeds, voice } = await loadProject(root);

  const imagesEnabled =
    options.images === false ? false : config.images.enabled;
  const image: ImageProvider = imagesEnabled
    ? new GeminiProvider(config.images.model)
    : new NullImageProvider();

  return {
    root,
    project: config,
    voice,
    keywords,
    feeds,
    text: new AnthropicProvider(),
    image,
  };
}

// Tolerate length overshoot (truncated where applied) so a few extra chars
// don't reject the repair and leave the article unfixed.
const RepairPatch = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  body: z.string().min(1),
});

/** One targeted repair pass driven by the audit findings. */
async function repair(
  article: Article,
  result: AuditResult,
  ctx: EngineContext,
): Promise<Article> {
  const findings = result.findings
    .filter((f) => f.level !== "info")
    .map((f) => `- [${f.level}] ${f.rule}: ${f.message}`)
    .join("\n");

  const user = `This article failed the SEO/AEO audit. Fix ONLY the issues below and return corrected content. Keep the voice and the good parts intact.

Audit findings:
${findings}

Word-count window: ${ctx.project.article.minWordCount}-${ctx.project.article.maxWordCount}. If under, expand the thinnest sections with concrete, specific content (no filler).

Return ONLY JSON — no prose, no fences:
{ "title": "...", "description": "...", "body": "..." }

Current frontmatter:
- title: ${article.frontmatter.title}
- description: ${article.frontmatter.description}

Current body (MDX):
---
${article.body}
---`;

  try {
    const raw = await ctx.text.call({
      model: ctx.project.llm.draftModel,
      system: sharedSystemPrefix(ctx.project, ctx.voice),
      user,
      maxTokens: ctx.project.llm.maxTokens,
      temperature: 0.4,
    });
    const patch = RepairPatch.parse(extractJson(raw));
    const fm = article.frontmatter;
    return {
      ...article,
      frontmatter: {
        ...fm,
        title: patch.title?.slice(0, 70) ?? fm.title,
        description: patch.description?.slice(0, 180) ?? fm.description,
      },
      body: patch.body,
      stagesCompleted: [...article.stagesCompleted, "repair"],
    };
  } catch (err) {
    log.warn(
      `repair: failed (${err instanceof Error ? err.message : String(err)}) — keeping pre-repair article`,
    );
    return article;
  }
}

function reportAudit(result: AuditResult): void {
  const verb = result.passed ? log.ok : log.warn;
  verb(`audit: SEO ${result.seoScore}/100 · AEO ${result.aeoScore}/100 · ${result.passed ? "PASS" : "FAIL"}`);
  for (const f of result.findings) {
    if (f.level === "error") log.error(`  ${f.rule}: ${f.message}`);
    else if (f.level === "warning") log.dim(`  ⚠ ${f.rule}: ${f.message}`);
  }
}

export async function runOnce(
  ctx: EngineContext,
  options: RunOptions = {},
): Promise<RunResult> {
  let topic: Topic;
  if (options.keyword) {
    // Targeted run — skip ranking, write about this exact keyword. Used for
    // comparison/"vs" pages and on-demand topics.
    topic = topicFromKeyword(options.keyword, ctx.keywords);
    log.step(`targeted topic: "${topic.keyword.keyword}" (${topic.keyword.intent})`);
  } else {
    log.step(`ingest — ${ctx.feeds.length} feed(s)`);
    const items = await fetchFeeds(ctx.feeds);

    log.step(`rank — ${items.length} items × ${ctx.keywords.length} keywords`);
    const topics = rankTopics(items, ctx.keywords, ctx.root, ctx.project);
    if (topics.length === 0) {
      throw new Error(
        "No topics to write. Add keywords to .seo-aeo/keywords.json (or all are already covered).",
      );
    }
    topic = topics[0]!;
    log.info(`topic: "${topic.keyword.keyword}" (score ${topic.score})`);
  }

  log.step("outline");
  const outline = await draftOutline(topic, ctx);

  log.step("write");
  let article = await draftArticle(outline, ctx);

  log.step("seo pass");
  article = await applySeo(article, ctx);

  log.step("aeo pass");
  article = await applyAeo(article, ctx);

  if (ctx.image.enabled) {
    log.step(`images (${ctx.project.images.inlineCount + 1})`);
    article = await applyImages(article, ctx);
  }

  article = { ...article, wordCount: countWords(article.body) };

  log.step("audit");
  let result = audit(article, ctx.project);
  reportAudit(result);

  if (!result.passed) {
    log.step("self-repair");
    article = await repair(article, result, ctx);
    article = { ...article, wordCount: countWords(article.body) };
    result = audit(article, ctx.project);
    reportAudit(result);
  }

  // Publish.
  if (options.dryRun) {
    const dir = path.join(ctx.root, ".seo-aeo", "preview");
    await mkdir(dir, { recursive: true });
    const previewPath = path.join(dir, `${article.slug}.mdx`);
    await writeFile(previewPath, renderMdx(article), "utf8");
    log.ok(`dry run — preview written to ${path.relative(ctx.root, previewPath)}`);
    return { topic, article, audit: result, previewPath };
  }

  const draftPath = await writeDraft(ctx.root, article, ctx.project);
  const publish = await openDraftPr(ctx.root, article, draftPath, ctx.project);
  return { topic, article, audit: result, publish };
}
