/**
 * Turn the onboarding interview answers into the generated artifacts:
 * a starter keyword bank, a voice & tone guide, and suggested RSS feeds.
 * Uses the TextProvider (Claude). Each artifact is its own call so a
 * failure in one doesn't sink the others.
 */
import { z } from "zod";

import { KeywordTarget } from "../engine/types.js";
import type { TextProvider } from "../engine/providers/text.js";
import { extractJson } from "../engine/util.js";
import { log } from "../engine/log.js";

export interface OnboardingAnswers {
  name: string;
  siteUrl: string;
  whatItDoes: string;
  audienceRoles: string;
  companySize: string;
  pain: string;
  tone: string;
  competitors: string;
}

export interface ExpandedArtifacts {
  keywords: KeywordTarget[];
  voice: string;
  feeds: string[];
}

const KeywordList = z.object({ keywords: z.array(KeywordTarget) });
const FeedList = z.object({ feeds: z.array(z.string()) });

const SYSTEM =
  "You are an expert SEO + AEO content strategist. You produce precise, " +
  "conservative, immediately-usable artifacts. No preamble, no fluff.";

async function genKeywords(
  answers: OnboardingAnswers,
  text: TextProvider,
): Promise<KeywordTarget[]> {
  const user = `Build a starter long-tail keyword bank for this site.

Site: ${answers.name} (${answers.siteUrl})
What it does: ${answers.whatItDoes}
Audience: ${answers.audienceRoles} (${answers.companySize})
Core pain: ${answers.pain}
Competitors: ${answers.competitors || "(none given)"}

Produce 30-40 long-tail keywords this site can realistically rank for —
favor low-competition, high-intent phrases over head terms. Mix intents:
mostly informational (how-to / what-is), some commercial ("best ... for ..."),
a few transactional (brand-vs-brand, pricing, alternatives).

For each: estimate monthly US volume and difficulty (0-100) CONSERVATIVELY
— these are educated guesses to be refined later. Add a one-line note on
why it matters.

Return ONLY JSON:
{ "keywords": [ { "keyword": "...", "intent": "informational|commercial|transactional|navigational", "volume": 210, "difficulty": 18, "notes": "..." } ] }`;

  const raw = await text.call({
    model: "claude-sonnet-4-6",
    system: SYSTEM,
    user,
    maxTokens: 8000,
    temperature: 0.6,
  });
  return KeywordList.parse(extractJson(raw)).keywords;
}

async function genVoice(
  answers: OnboardingAnswers,
  text: TextProvider,
): Promise<string> {
  const user = `Write a "Voice & Tone" guide (Markdown) for the content engine that will write articles for this site. It must be specific enough that every generated article sounds consistent.

Site: ${answers.name} (${answers.siteUrl})
What it does: ${answers.whatItDoes}
Audience: ${answers.audienceRoles} (${answers.companySize})
Core pain: ${answers.pain}
Desired tone: ${answers.tone}
Competitors: ${answers.competitors || "(none given)"}

Include these sections:
1. Who we're writing for (the reader, in concrete terms)
2. Voice in one sentence
3. Tone attributes (priority-ordered, 4-6)
4. Sentence and paragraph rules
5. Structural conventions (quick-answer-first, H2/H3 discipline, FAQ at end)
6. How to mention the product (only after earning it; one natural mention)
7. How to mention competitors (generous + accurate, never sneering)
8. Do-not-say list (cut generic content smells: "in today's market",
   "leverage", "unlock", "game-changer", "dive in", "at the end of the day", etc.)
9. Things to actively prefer (specific numbers, named tradeoffs, concrete examples)

Return ONLY the Markdown. Start with "# ${answers.name} — Voice & Tone Guide".`;

  return text.call({
    model: "claude-sonnet-4-6",
    system: SYSTEM,
    user,
    maxTokens: 4000,
    temperature: 0.7,
  });
}

async function genFeeds(
  answers: OnboardingAnswers,
  text: TextProvider,
): Promise<string[]> {
  const user = `Suggest 3-6 RSS/Atom feed URLs of well-known industry blogs/news sources relevant to this site's topic, so the engine can ride trending stories.

Site: ${answers.name} — ${answers.whatItDoes}
Audience: ${answers.audienceRoles}

Only suggest feeds you are confident actually exist. It's fine to return
fewer (or an empty list) rather than guess. These are SUGGESTIONS the user
will verify.

Return ONLY JSON: { "feeds": ["https://.../feed", "..."] }`;

  try {
    const raw = await text.call({
      model: "claude-sonnet-4-6",
      system: SYSTEM,
      user,
      maxTokens: 1000,
      temperature: 0.3,
    });
    return FeedList.parse(extractJson(raw)).feeds;
  } catch {
    return [];
  }
}

export async function expand(
  answers: OnboardingAnswers,
  text: TextProvider,
): Promise<ExpandedArtifacts> {
  log.step("expanding your answers into a keyword bank + voice guide…");
  const [keywords, voice, feeds] = await Promise.all([
    genKeywords(answers, text),
    genVoice(answers, text),
    genFeeds(answers, text),
  ]);
  log.ok(`generated ${keywords.length} keywords, voice guide, ${feeds.length} feed suggestion(s)`);
  return { keywords, voice, feeds };
}
