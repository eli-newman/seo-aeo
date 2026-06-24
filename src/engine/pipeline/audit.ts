/**
 * Stage 7: deterministic audit. Pure-TS SEO + AEO heuristics, no LLM, no
 * network. Both scores start at 100 and drop per finding; `passed`
 * requires both scores meet thresholds AND zero error-level findings.
 */
import {
  ArticleFrontmatter,
  type Article,
  type AuditFinding,
  type AuditResult,
  type ProjectConfig,
} from "../types.js";

type Penalty = [seo: number, aeo: number];

const PENALTIES: Record<string, Penalty> = {
  word_count_out_of_range: [15, 0],
  title_too_long: [8, 0],
  title_empty: [40, 20],
  description_too_long: [10, 0],
  description_empty: [15, 5],
  missing_target_keyword_in_title: [15, 0],
  low_keyword_density: [10, 0],
  no_internal_links: [10, 0],
  frontmatter_invalid: [25, 15],
  multiple_h1: [12, 5],
  h2_no_content: [5, 5],
  mdx_curly_hazard: [20, 10],
  missing_tldr: [0, 25],
  tldr_too_long: [0, 10],
  missing_faq: [5, 25],
  too_few_faq: [0, 15],
  faq_malformed: [0, 10],
  missing_date: [5, 5],
};

const TITLE_MAX_CHARS = 70;
const TLDR_MAX_WORDS = 80;

function countWords(text: string): number {
  let c = text.replace(/```[\s\S]*?```/g, " ");
  c = c.replace(/`[^`]*`/g, " ");
  c = c.replace(/[#>*_\-[\]()!]/g, " ");
  return c.split(/\s+/).filter((w) => w.trim()).length;
}

function findHeadings(body: string, level: number): string[] {
  const re = new RegExp(`^${"#".repeat(level)}\\s+(.+?)\\s*$`, "gm");
  return [...body.matchAll(re)].map((m) => m[1]!);
}

function h2Blocks(body: string): Array<[string, string]> {
  const parts = body.split(/^##\s+(.+?)\s*$/m);
  const out: Array<[string, string]> = [];
  for (let i = 1; i < parts.length - 1; i += 2) {
    out.push([parts[i]!.trim(), parts[i + 1] ?? ""]);
  }
  return out;
}

function hasInternalLink(body: string, project: ProjectConfig): boolean {
  if (/\[[^\]]+\]\((\/[^)]*)\)/.test(body)) return true;
  let host = "";
  try {
    host = new URL(project.siteUrl).host;
  } catch {
    host = "";
  }
  if (host && new RegExp(`\\[[^\\]]+\\]\\(https?://${host.replace(/\./g, "\\.")}`).test(body))
    return true;
  return project.article.internalLinkTargets.some((t) => body.includes(t.url));
}

function tldrSection(body: string): string | null {
  const m = body.match(
    /^##\s+(?:TL;?DR|Quick\s+answer|Summary)\s*$([\s\S]*?)(?=^##\s+|$(?![\s\S]))/im,
  );
  return m ? (m[1] ?? "").trim() : null;
}

function curlyHazards(body: string): string[] {
  const noCode = body.replace(/```[\s\S]*?```/g, "");
  return [...noCode.matchAll(/\{[^{}\n]{1,80}\}/g)].map((m) => m[0]);
}

export function audit(article: Article, project: ProjectConfig): AuditResult {
  const findings: AuditFinding[] = [];
  let seo = 100;
  let aeo = 100;

  function deduct(
    rule: string,
    message: string,
    level: AuditFinding["level"] = "warning",
  ): void {
    findings.push({ level, rule, message });
    const [s, a] = PENALTIES[rule] ?? [5, 5];
    seo -= s;
    aeo -= a;
  }

  const fm = article.frontmatter;

  // Frontmatter validation (catch drift).
  const fmCheck = ArticleFrontmatter.safeParse(fm);
  if (!fmCheck.success) {
    deduct(
      "frontmatter_invalid",
      `Frontmatter failed validation: ${JSON.stringify(fmCheck.error.issues)}`,
      "error",
    );
  }

  if (!fm.title.trim()) deduct("title_empty", "Frontmatter title is empty.", "error");
  else if (fm.title.length > TITLE_MAX_CHARS)
    deduct("title_too_long", `Title is ${fm.title.length} chars; aim for <=${TITLE_MAX_CHARS}.`);

  if (!fm.description.trim())
    deduct("description_empty", "Frontmatter description is empty.", "error");
  else if (fm.description.length > 180)
    deduct("description_too_long", `Description is ${fm.description.length} chars; max 180.`, "error");

  if (!fm.date) deduct("missing_date", "Frontmatter is missing a date.", "error");

  // Word count window.
  const wc = article.wordCount || countWords(article.body);
  const a = project.article;
  if (wc < a.minWordCount || wc > a.maxWordCount) {
    deduct(
      "word_count_out_of_range",
      `Word count ${wc} is outside [${a.minWordCount}, ${a.maxWordCount}].`,
      wc < a.minWordCount ? "error" : "warning",
    );
  }

  // Body structure.
  const body = article.body;
  const h1s = findHeadings(body, 1);
  if (h1s.length)
    deduct("multiple_h1", `Body contains H1 heading(s): ${JSON.stringify(h1s)}.`, "error");

  for (const [heading, content] of h2Blocks(body)) {
    if (!content.trim() || countWords(content) < 20)
      deduct("h2_no_content", `H2 '${heading}' has too little content to stand alone.`);
  }

  // Target keyword presence.
  const targetKw = (fm.keywords[0] ?? "").trim().toLowerCase();
  if (targetKw) {
    if (!fm.title.toLowerCase().includes(targetKw))
      deduct("missing_target_keyword_in_title", `Target keyword '${targetKw}' is not in the title.`);
    const hits = (
      body.toLowerCase().match(new RegExp(targetKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []
    ).length;
    if (hits < 3)
      deduct("low_keyword_density", `Target keyword '${targetKw}' appears ${hits} times; aim for >=3.`);
  }

  if (!hasInternalLink(body, project))
    deduct("no_internal_links", "Article has no internal links back to the site.");

  const hazards = curlyHazards(body);
  if (hazards.length)
    deduct(
      "mdx_curly_hazard",
      `Body contains ${hazards.length} raw curly-brace literal(s) that may break MDX (e.g. ${JSON.stringify(hazards[0])}).`,
      "error",
    );

  // TL;DR.
  const tldr = tldrSection(body);
  if (tldr === null)
    deduct("missing_tldr", "No TL;DR / quick-answer section found.", "error");
  else if (countWords(tldr) > TLDR_MAX_WORDS)
    deduct("tldr_too_long", `TL;DR is ${countWords(tldr)} words; keep it <=${TLDR_MAX_WORDS}.`);

  // FAQ.
  if (project.article.includeFaq) {
    if (fm.faqs.length === 0)
      deduct("missing_faq", "Frontmatter has no FAQs and the project requires them.", "error");
    else if (fm.faqs.length < 2)
      deduct("too_few_faq", `Only ${fm.faqs.length} FAQ entry; aim for >=2.`);
    fm.faqs.forEach((f, i) => {
      if (!f.q.trim() || !f.a.trim())
        deduct("faq_malformed", `FAQ entry #${i} has empty q or a.`, "error");
    });
  }

  seo = Math.max(0, Math.min(100, seo));
  aeo = Math.max(0, Math.min(100, aeo));
  const hasErrors = findings.some((f) => f.level === "error");
  const passed =
    !hasErrors && seo >= project.audit.seoMinScore && aeo >= project.audit.aeoMinScore;

  return { seoScore: seo, aeoScore: aeo, findings, passed };
}
