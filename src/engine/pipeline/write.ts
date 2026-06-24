/**
 * Stage 3: write. Ask the most capable model for a full MDX body that
 * matches the outline, then assemble an Article.
 */
import {
  type Article,
  type Outline,
  type ProjectConfig,
} from "../types.js";
import type { EngineContext } from "../context.js";
import { sharedSystemPrefix } from "../prompts.js";
import { firstSentence, isoToday, slugify } from "../util.js";

// `{thing}` in MDX is a JSX expression. Convert obvious literal
// placeholders to `[thing]` so the MDX build doesn't choke.
const PLACEHOLDER_RE = /\{([a-zA-Z_][a-zA-Z0-9_ ,.'"-]{0,80})\}/g;

export function sanitizeMdxBraces(body: string): string {
  const out: string[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    out.push(inFence ? line : line.replace(PLACEHOLDER_RE, "[$1]"));
  }
  return out.join("\n");
}

export function countWords(body: string): number {
  let cleaned = body.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " ");
  cleaned = cleaned.replace(/[#>*`_[\]\-|]/g, " ");
  return cleaned.split(/\s+/).filter((w) => w.trim()).length;
}

function seedKeywords(outline: Outline): string[] {
  const seeds = [outline.targetKeyword];
  const seen = new Set([outline.targetKeyword.toLowerCase()]);
  for (const sec of outline.sections) {
    const kw = sec.heading.replace(/[^\w\s-]/g, "").trim().toLowerCase();
    const words = kw.split(/\s+/).length;
    if (words >= 3 && words <= 8 && !seen.has(kw)) {
      seeds.push(kw);
      seen.add(kw);
    }
    if (seeds.length >= 5) break;
  }
  return seeds;
}

function buildUserPrompt(outline: Outline, project: ProjectConfig): string {
  const art = project.article;
  const internalLinks =
    art.internalLinkTargets.map((t) => `  - ${t.anchor} -> ${t.url}`).join("\n") ||
    "  - (none configured)";

  const sections = outline.sections
    .map((sec, i) => {
      const flags: string[] = [];
      if (sec.includeTable) flags.push("INCLUDE_TABLE");
      if (sec.includeHowTo) flags.push("INCLUDE_HOWTO (numbered steps)");
      const flagStr = flags.length ? ` [${flags.join(" | ")}]` : "";
      const bullets = sec.bullets.map((b) => `     - ${b}`).join("\n");
      return `  ${i + 1}. ## ${sec.heading}${flagStr}\n${bullets}`;
    })
    .join("\n");

  const faqs = outline.faqs
    .map((f, i) => `  ${i + 1}. Q: ${f.q}\n     A: ${f.a}`)
    .join("\n");

  return `Write the full MDX body for this article. Match the brand voice from the system prompt. Aim for ~${outline.targetWordCount} words (range: ${art.minWordCount}-${art.maxWordCount}).

Working title: ${outline.workingTitle}
Target keyword: ${outline.targetKeyword}

TL;DR (becomes the '## Quick answer' section, kept citable, <=80 words):
${outline.tldr}

Sections to write, in order:
${sections}

FAQ pairs (final '## FAQ' section — questions as H3s, answers as 1-3 sentence paragraphs):
${faqs}

Internal links you may use (1-3 total, especially in the closing section):
${internalLinks}

HARD RULES:
- Output ONLY the MDX body. No frontmatter (\`---\`), no H1 (\`#\`). The H1 is rendered from frontmatter by the site.
- Start with \`## Quick answer\` (the TL;DR section).
- End with \`## FAQ\` containing the Q&A pairs as \`### Question\` then a paragraph answer.
- MDX gotcha: curly braces are JSX. For literal placeholders (first name, URL, etc.) use SQUARE brackets like \`[first_name]\`. Never \`{first_name}\`.
- Use real H2 (\`##\`) and H3 (\`###\`). No bold-as-heading.
- Short paragraphs (<=3 sentences). Concrete examples over abstractions.
- Where flagged INCLUDE_TABLE, render a real Markdown table. Where flagged INCLUDE_HOWTO, render numbered steps.
- Don't invent statistics. Frame estimates as observational ("in our testing") unless given a real number.
- No marketing-speak ("leverage", "unlock", "game-changer", "in today's market").`;
}

export async function draftArticle(
  outline: Outline,
  ctx: EngineContext,
): Promise<Article> {
  const system = sharedSystemPrefix(ctx.project, ctx.voice);
  const user = buildUserPrompt(outline, ctx.project);

  let body = await ctx.text.call({
    model: ctx.project.llm.draftModel,
    system,
    user,
    maxTokens: ctx.project.llm.maxTokens,
    temperature: ctx.project.llm.temperature,
  });

  body = body.trim();
  // Strip an accidental frontmatter block.
  if (body.startsWith("---")) {
    const end = body.indexOf("\n---", 3);
    if (end !== -1) body = body.slice(end + 4).replace(/^\s+/, "");
  }
  // Strip an accidental leading H1.
  body = body.replace(/^# [^\n]+\n+/, "");
  body = sanitizeMdxBraces(body);

  const today = isoToday();
  const slug = `${today}-${slugify(outline.workingTitle)}`;

  return {
    slug,
    frontmatter: {
      title: outline.workingTitle,
      description: firstSentence(outline.tldr, 180),
      date: today,
      author: ctx.project.author,
      keywords: seedKeywords(outline),
      faqs: [...outline.faqs],
      draft: false,
    },
    body,
    jsonLdBlocks: [],
    images: [],
    wordCount: countWords(body),
    stagesCompleted: ["outline", "write"],
  };
}
