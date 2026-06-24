/**
 * Stage 1: deterministic topic ranking. No LLM — pure, fast, testable.
 * Scores every (feedItem × keyword) pair and returns the best Topics.
 * The LLM only ever sees the winning Topic, downstream.
 *
 * Score (0-100):
 *   token-overlap relevance (0-60) + intent weight (0-20)
 *   + difficulty bonus (0-10) + recency bonus (+10) - coverage penalty (-40)
 *
 * On a slow news day it emits "evergreen" Topics (feedItem=null) so the
 * pipeline never starves.
 */
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import type {
  FeedItem,
  KeywordIntent,
  KeywordTarget,
  ProjectConfig,
  Topic,
} from "../types.js";
import { clip, slugify } from "../util.js";

const STOPWORDS = new Set(
  `a an and are as at be been being but by for from has have how i if in into is it its of on or our that the their them they this to was we were what when where which while who why will with you your yours about above after against all am any because before below between both can did do does doing during each few further had having here just like more most no nor not now off once only other own same so some such than then there these those through under until up very via vs versus`.split(
    /\s+/,
  ),
);

const SUFFIXES = ["ings", "ing", "edly", "ies", "ied", "iest", "ier", "ly", "ed", "es", "s"];

function stem(token: string): string {
  const t = token.toLowerCase();
  for (const suf of SUFFIXES) {
    if (t.length > suf.length + 2 && t.endsWith(suf)) {
      return t.slice(0, -suf.length);
    }
  }
  return t;
}

const WORD_RE = /[a-z0-9][a-z0-9'-]*/g;

function tokenSet(text: string): Set<string> {
  const out = new Set<string>();
  if (!text) return out;
  const matches = text.toLowerCase().match(WORD_RE) ?? [];
  for (const m of matches) {
    if (STOPWORDS.has(m)) continue;
    const s = stem(m);
    if (s.length > 1) out.add(s);
  }
  return out;
}

const INTENT_WEIGHT: Record<KeywordIntent, number> = {
  commercial: 20,
  transactional: 16,
  navigational: 8,
  informational: 6,
};

function intersect(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

function relevanceScore(item: FeedItem, keyword: KeywordTarget): number {
  const kw = tokenSet(keyword.keyword);
  if (kw.size === 0) return 0;
  const hay = tokenSet(`${item.title} ${item.summary}`);
  if (hay.size === 0) return 0;
  const overlap = intersect(kw, hay);
  if (overlap === 0) return 0;
  const coverage = overlap / kw.size;
  const titleOverlap = intersect(kw, tokenSet(item.title));
  const titleBonus = 0.5 * (titleOverlap / kw.size);
  return Math.min(60, 60 * (coverage + titleBonus));
}

function intentScore(k: KeywordTarget): number {
  return INTENT_WEIGHT[k.intent] ?? 6;
}

function difficultyScore(k: KeywordTarget): number {
  if (k.difficulty == null) return 5;
  const d = Math.max(0, Math.min(100, k.difficulty));
  return 10 * (1 - d / 100);
}

function recencyBonus(item: FeedItem, now: Date): number {
  if (!item.published) return 0;
  const published = new Date(item.published);
  if (Number.isNaN(published.getTime())) return 0;
  const ageHrs = (now.getTime() - published.getTime()) / 3_600_000;
  return ageHrs >= 0 && ageHrs <= 24 ? 10 : 0;
}

function coveredSlugs(root: string, project: ProjectConfig): Set<string> {
  const dir = path.join(root, project.layout.postsPath);
  if (!existsSync(dir)) return new Set();
  const out = new Set<string>();
  for (const f of readdirSync(dir)) {
    if (f.endsWith(".mdx") || f.endsWith(".md")) {
      out.add(f.replace(/\.mdx?$/, "").toLowerCase());
    }
  }
  return out;
}

function coveragePenalty(k: KeywordTarget, covered: Set<string>): number {
  if (covered.size === 0) return 0;
  const slug = slugify(k.keyword);
  if (!slug) return 0;
  for (const stemName of covered) {
    if (stemName.includes(slug)) return 40;
  }
  return 0;
}

function angleForPair(item: FeedItem, k: KeywordTarget): string {
  return `How "${clip(item.title, 90)}" changes what ${k.keyword.trim()} means right now.`;
}

function evergreenAngle(k: KeywordTarget): string {
  const kw = k.keyword.trim();
  if (k.intent === "commercial") return `The honest buyer's guide to ${kw}.`;
  if (k.intent === "transactional")
    return `A side-by-side breakdown of ${kw} — what actually matters.`;
  return `A practical, no-fluff explainer on ${kw}.`;
}

export interface RankOptions {
  topK?: number;
  now?: Date;
}

/** Score every (item, keyword) pair and return the best Topics. */
export function rankTopics(
  items: FeedItem[],
  keywords: KeywordTarget[],
  root: string,
  project: ProjectConfig,
  options: RankOptions = {},
): Topic[] {
  const topK = options.topK ?? 5;
  const now = options.now ?? new Date();
  if (topK <= 0 || keywords.length === 0) return [];

  const covered = coveredSlugs(root, project);
  const bestByKeyword = new Map<string, Topic>();

  for (const item of items) {
    for (const keyword of keywords) {
      const relevance = relevanceScore(item, keyword);
      if (relevance <= 0) continue;
      const intent = intentScore(keyword);
      const difficulty = difficultyScore(keyword);
      const recency = recencyBonus(item, now);
      const penalty = coveragePenalty(keyword, covered);
      const score = Math.max(
        0,
        Math.min(100, relevance + intent + difficulty + recency - penalty),
      );
      const candidate: Topic = {
        feedItem: item,
        keyword,
        angle: angleForPair(item, keyword),
        score: Math.round(score * 100) / 100,
        reason: `relevance=${relevance.toFixed(1)} intent=${intent} difficulty=${difficulty.toFixed(1)} recency=${recency} penalty=${penalty}`,
      };
      const existing = bestByKeyword.get(keyword.keyword);
      if (!existing || candidate.score > existing.score) {
        bestByKeyword.set(keyword.keyword, candidate);
      }
    }
  }

  const rssTopics = [...bestByKeyword.values()].sort((a, b) => b.score - a.score);
  const strong = rssTopics.filter((t) => t.score >= 25);
  if (strong.length >= topK) return strong.slice(0, topK);

  // Top up with evergreen fallbacks.
  const used = new Set(strong.map((t) => t.keyword.keyword));
  const evergreenCandidates = keywords
    .filter((k) => !used.has(k.keyword))
    .sort((a, b) => {
      const intentDiff = (INTENT_WEIGHT[b.intent] ?? 6) - (INTENT_WEIGHT[a.intent] ?? 6);
      if (intentDiff !== 0) return intentDiff;
      return (a.difficulty ?? 50) - (b.difficulty ?? 50);
    });

  const evergreen: Topic[] = [];
  for (const keyword of evergreenCandidates) {
    if (coveragePenalty(keyword, covered)) continue;
    evergreen.push({
      feedItem: null,
      keyword,
      angle: evergreenAngle(keyword),
      score: Math.round((intentScore(keyword) + difficultyScore(keyword)) * 100) / 100,
      reason: `evergreen fallback: no fresh RSS match — intent=${intentScore(keyword)} difficulty=${difficultyScore(keyword).toFixed(1)}`,
    });
  }

  return [...strong, ...evergreen].sort((a, b) => b.score - a.score).slice(0, topK);
}
