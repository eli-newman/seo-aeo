/** Render an Article into a complete MDX file (frontmatter + body). */
import matter from "gray-matter";

import type { Article } from "./types.js";

/** Build the ordered frontmatter object written to the MDX file. */
function frontmatterObject(article: Article): Record<string, unknown> {
  const fm = article.frontmatter;
  const out: Record<string, unknown> = {
    title: fm.title,
    description: fm.description,
    date: fm.date,
    author: fm.author,
    keywords: fm.keywords,
  };
  if (fm.faqs.length) out.faqs = fm.faqs;
  if (fm.image) out.image = fm.image;
  out.draft = fm.draft;
  return out;
}

/** Render frontmatter + body as a complete MDX file string. */
export function renderMdx(article: Article): string {
  const body = article.body.trim();
  // gray-matter.stringify emits `---\n<yaml>---\n<body>`.
  const file = matter.stringify(`\n${body}\n`, frontmatterObject(article));
  return file.endsWith("\n") ? file : file + "\n";
}
