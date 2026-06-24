/**
 * Shared zod schemas + types that flow between pipeline stages.
 *
 * Pipeline (mirrors the Python engine):
 *
 *   FeedItem[]  ─ ingest
 *      ▼
 *   Topic[]     ─ rank
 *      ▼
 *   Outline     ─ outline
 *      ▼
 *   Article (draft) ─ write
 *      ▼  seoPass → aeoPass → images
 *   Article (final)
 *      ▼
 *   AuditResult ─ audit
 *      ▼
 *   publish.writeDraft(article) → PR
 */

import { z } from "zod";

// ---------- Project configuration ----------------------------------------

export const InternalLinkTarget = z.object({
  url: z.string(),
  anchor: z.string(),
});
export type InternalLinkTarget = z.infer<typeof InternalLinkTarget>;

export const ArticleSettings = z.object({
  targetWordCount: z.number().int().default(1500),
  minWordCount: z.number().int().default(1100),
  maxWordCount: z.number().int().default(2000),
  includeFaq: z.boolean().default(true),
  includeHowToWhenRelevant: z.boolean().default(true),
  includeComparisonTableWhenRelevant: z.boolean().default(true),
  internalLinkTargets: z.array(InternalLinkTarget).default([]),
});
export type ArticleSettings = z.infer<typeof ArticleSettings>;

export const Icp = z.object({
  primaryRoles: z.array(z.string()).default([]),
  companySize: z.string().default(""),
  pain: z.string().default(""),
});
export type Icp = z.infer<typeof Icp>;

export const LlmSettings = z.object({
  provider: z.literal("anthropic").default("anthropic"),
  outlineModel: z.string().default("claude-sonnet-4-6"),
  draftModel: z.string().default("claude-opus-4-8"),
  seoPassModel: z.string().default("claude-sonnet-4-6"),
  aeoPassModel: z.string().default("claude-sonnet-4-6"),
  rankModel: z.string().default("claude-sonnet-4-6"),
  maxTokens: z.number().int().default(8000),
  temperature: z.number().default(0.7),
});
export type LlmSettings = z.infer<typeof LlmSettings>;

export const ImageSettings = z.object({
  enabled: z.boolean().default(false),
  provider: z.literal("gemini").default("gemini"),
  model: z.string().default("gemini-2.0-flash-exp-image-generation"),
  /** How many inline images (in addition to the hero) to generate. */
  inlineCount: z.number().int().min(0).max(4).default(1),
  /** Free-text art-direction hint applied to every prompt. */
  style: z
    .string()
    .default("clean, modern, editorial illustration; no text in the image"),
});
export type ImageSettings = z.infer<typeof ImageSettings>;

export const AuditThresholds = z.object({
  seoMinScore: z.number().int().default(80),
  aeoMinScore: z.number().int().default(75),
});
export type AuditThresholds = z.infer<typeof AuditThresholds>;

export const Cadence = z.object({
  /** "weekly" | "biweekly" — drives the GitHub Actions schedule. */
  frequency: z.enum(["weekly", "biweekly"]).default("biweekly"),
  /** Cron expression actually written to the workflow. */
  cron: z.string().default("0 14 * * 1"),
});
export type Cadence = z.infer<typeof Cadence>;

/** Detected/declared facts about the consumer repo's content layout. */
export const RepoLayout = z.object({
  framework: z
    .enum(["next", "astro", "remix", "static", "unknown"])
    .default("unknown"),
  /** Path (relative to repo root) where draft MDX is written. */
  draftsPath: z.string().default("content/drafts"),
  /** Path where approved MDX lives. */
  postsPath: z.string().default("content/posts"),
  /** Public dir for images (relative to repo root). */
  publicPath: z.string().default("public"),
  /** URL path prefix where images are served from. */
  publicUrlBase: z.string().default("/blog"),
});
export type RepoLayout = z.infer<typeof RepoLayout>;

export const ProjectConfig = z.object({
  name: z.string(),
  siteUrl: z.string().url(),
  layout: RepoLayout.default({}),
  article: ArticleSettings.default({}),
  icp: Icp.default({}),
  llm: LlmSettings.default({}),
  images: ImageSettings.default({}),
  audit: AuditThresholds.default({}),
  cadence: Cadence.default({}),
  author: z.string().default("Editorial Team"),
});
export type ProjectConfig = z.infer<typeof ProjectConfig>;

// ---------- Keyword bank --------------------------------------------------

export const KeywordIntent = z.enum([
  "informational",
  "commercial",
  "transactional",
  "navigational",
]);
export type KeywordIntent = z.infer<typeof KeywordIntent>;

export const KeywordTarget = z.object({
  keyword: z.string(),
  intent: KeywordIntent.default("informational"),
  volume: z.number().int().nullable().default(null),
  difficulty: z.number().int().nullable().default(null),
  notes: z.string().default(""),
});
export type KeywordTarget = z.infer<typeof KeywordTarget>;

export const KeywordBank = z.object({
  keywords: z.array(KeywordTarget).default([]),
});
export type KeywordBank = z.infer<typeof KeywordBank>;

// ---------- Ingest / ranking ---------------------------------------------

export const FeedItem = z.object({
  title: z.string(),
  link: z.string(),
  summary: z.string().default(""),
  published: z.string().nullable().default(null),
  source: z.string(),
});
export type FeedItem = z.infer<typeof FeedItem>;

export const Topic = z.object({
  feedItem: FeedItem.nullable().default(null),
  keyword: KeywordTarget,
  /** One-sentence framing of the article we'd write. */
  angle: z.string(),
  /** 0-100; higher = better candidate. */
  score: z.number(),
  reason: z.string().default(""),
});
export type Topic = z.infer<typeof Topic>;

// ---------- Article representation ----------------------------------------

export const FaqEntry = z.object({ q: z.string(), a: z.string() });
export type FaqEntry = z.infer<typeof FaqEntry>;

export const OutlineSection = z.object({
  heading: z.string(),
  bullets: z.array(z.string()).default([]),
  includeTable: z.boolean().default(false),
  includeHowTo: z.boolean().default(false),
});
export type OutlineSection = z.infer<typeof OutlineSection>;

export const Outline = z.object({
  workingTitle: z.string(),
  targetKeyword: z.string(),
  targetWordCount: z.number().int(),
  tldr: z.string(),
  sections: z.array(OutlineSection),
  faqs: z.array(FaqEntry).default([]),
});
export type Outline = z.infer<typeof Outline>;

export const ArticleImage = z.object({
  /** Path served by the site, e.g. /blog/<slug>/hero.png */
  src: z.string(),
  alt: z.string(),
  /** "hero" | "inline" */
  role: z.enum(["hero", "inline"]).default("inline"),
  /** Absolute path on disk where the bytes were written. */
  diskPath: z.string().optional(),
});
export type ArticleImage = z.infer<typeof ArticleImage>;

export const ArticleFrontmatter = z.object({
  title: z.string(),
  description: z.string().min(1).max(180),
  date: z.string(), // ISO yyyy-mm-dd
  author: z.string().default("Editorial Team"),
  keywords: z.array(z.string()).default([]),
  faqs: z.array(FaqEntry).default([]),
  image: z.string().optional(),
  draft: z.boolean().default(false),
});
export type ArticleFrontmatter = z.infer<typeof ArticleFrontmatter>;

export const Article = z.object({
  slug: z.string(),
  frontmatter: ArticleFrontmatter,
  body: z.string(),
  jsonLdBlocks: z.array(z.record(z.any())).default([]),
  images: z.array(ArticleImage).default([]),
  wordCount: z.number().int().default(0),
  stagesCompleted: z.array(z.string()).default([]),
});
export type Article = z.infer<typeof Article>;

// ---------- Audit ---------------------------------------------------------

export const AuditFinding = z.object({
  level: z.enum(["error", "warning", "info"]),
  rule: z.string(),
  message: z.string(),
});
export type AuditFinding = z.infer<typeof AuditFinding>;

export const AuditResult = z.object({
  seoScore: z.number().int(),
  aeoScore: z.number().int(),
  findings: z.array(AuditFinding).default([]),
  passed: z.boolean(),
});
export type AuditResult = z.infer<typeof AuditResult>;
