/**
 * Shared system-prompt assembly. Every LLM stage shares a stable,
 * cacheable prefix made of the project's brand voice + the AEO checklist.
 * Keeping assembly in one place means the same bytes are sent across
 * stages, which is what the prompt cache keys on.
 */
import type { ProjectConfig } from "./types.js";

const VOICE_FALLBACK = `Voice: warm, direct, no marketing fluff. Concrete examples over abstractions. Short sentences win. Talk to a single real person doing the job, not "businesses".`;

/**
 * The AEO checklist, inlined so it ships in the bundle (no runtime file
 * reads). Ported from the Python engine's projects/_shared/aeo_checklist.md.
 */
export const AEO_CHECKLIST = `# AEO Checklist

Structural rules every article must satisfy to maximize the chance of
being cited by an LLM (ChatGPT, Claude, Perplexity, Google AI Overviews).
The audit stage scores against this list.

1. LEAD WITH A "QUICK ANSWER" TL;DR. The first H2 must be \`## Quick answer\`
   (or \`## TL;DR\`). One short paragraph (40-90 words) or a 3-5 item list
   that directly answers the title's question and stands alone.
2. SELF-CONTAINED SECTIONS. Each section's first paragraph summarizes the
   section's point in one sentence. No "as discussed above" / "see the
   previous section". Pronouns need local antecedents.
3. CLEAN H2/H3 HIERARCHY. One H1 (from frontmatter, never the body).
   H2 = sections, H3 = sub-sections. No skipped levels. Headings are
   questions or claims, not labels ("## Why X fails", not "## Background").
4. COMPARISON TABLE for "X vs Y" / "best" / "alternatives" topics — a real
   markdown table near the top: 3+ columns, 4+ rows, short cells.
5. HOW-TO ARTICLES USE NUMBERED STEPS. Steps start with an action verb and
   fit on two lines. Emit a HowTo JSON-LD block when present.
6. FAQ SECTION at the end: \`## FAQ\` with 3-5 entries. Each question an H3,
   each answer 2-4 sentences, quotable in isolation, repeating key nouns
   instead of pronouns. Mirror the frontmatter \`faqs\` array.
7. CITATION DRIVERS (these measurably raise AI-citation rates — use them).
   Include real STATISTICS with their numbers; cite credible SOURCES inline
   for facts/stats (with a link); use short attributable QUOTATIONS where they
   fit. Don't fabricate — mark estimates as estimates ("in our testing").
   Keyword stuffing is counterproductive — never repeat a phrase unnaturally.
8. PASSAGE SHAPE FOR EXTRACTION. LLMs quote the strongest self-contained
   passage, not the page. Lead each key question with a ~40-75 word
   direct-answer block. Keep paragraphs short. One screenshot-worthy claim
   per section.
9. JSON-LD READINESS. Support Article (always), FAQPage, HowTo (when steps
   exist). Never emit JSON-LD that contradicts the rendered content.
10. INTERNAL LINKS: deliberate, not decorative. 1-3 total, anchor text
    matches the destination. Never "click here".
11. EXTERNAL LINKS: cite, don't pad. Link out only for a fact/stat/tool.
12. LENGTH & DENSITY. Stay inside the configured word-count window. No
    filler paragraphs added just to hit the count.
13. FORBIDDEN PATTERNS: AI/ChatGPT disclaimers; "In conclusion" / "To
    summarize" / "Did you know that…" as section openers; lorem ipsum or
    unresolved TODOs; more than one H1; repeated headings.`;

/** The long, stable system prefix that should hit the prompt cache. */
export function sharedSystemPrefix(
  project: ProjectConfig,
  voice: string,
): string {
  const voiceBlock = voice.trim() || VOICE_FALLBACK;

  const icpLines = [
    `- Primary roles: ${project.icp.primaryRoles.join(", ") || "(unspecified)"}`,
    `- Company size: ${project.icp.companySize || "(unspecified)"}`,
    `- Core pain: ${project.icp.pain || "(unspecified)"}`,
  ];

  const linkLines = project.article.internalLinkTargets.map(
    (t) => `- ${t.anchor} -> ${t.url}`,
  );
  const linksBlock = linkLines.length ? linkLines.join("\n") : "- (none configured)";

  return [
    `You are the content engine for the '${project.name}' site (${project.siteUrl}). You write articles for this audience (ICP):`,
    icpLines.join("\n"),
    "",
    "# Brand voice",
    voiceBlock,
    "",
    "# AEO checklist",
    AEO_CHECKLIST,
    "",
    "# Internal link targets (use when contextually relevant)",
    linksBlock,
  ].join("\n");
}
