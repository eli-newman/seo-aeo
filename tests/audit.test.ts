import { describe, it, expect } from "vitest";

import { audit } from "../src/engine/pipeline/audit.js";
import { renderMdx } from "../src/engine/mdx.js";
import { ProjectConfig, type Article } from "../src/engine/types.js";

const project = ProjectConfig.parse({
  name: "Example",
  siteUrl: "https://example.com",
  article: {
    minWordCount: 30,
    maxWordCount: 4000,
    internalLinkTargets: [{ url: "/", anchor: "Example" }],
  },
  audit: { seoMinScore: 60, aeoMinScore: 60 },
});

function makeArticle(body: string, overrides: Partial<Article["frontmatter"]> = {}): Article {
  return {
    slug: "2026-06-23-test",
    frontmatter: {
      title: "Best analytics tool for founders",
      description: "A concrete guide to the best analytics tool for solo founders.",
      date: "2026-06-23",
      author: "Eli",
      keywords: ["best analytics tool"],
      faqs: [
        { q: "Is it free?", a: "There is a free tier for the best analytics tool." },
        { q: "How fast?", a: "Setup takes five minutes for the best analytics tool." },
      ],
      draft: false,
      ...overrides,
    },
    body,
    jsonLdBlocks: [],
    images: [],
    wordCount: 0,
    stagesCompleted: [],
  };
}

const goodBody = `## Quick answer

The best analytics tool for founders is the one you actually check daily. Pick something simple, cheap, and fast to set up. [Example](/) fits that.

## Why simple beats powerful

Most founders never use 90% of a heavy analytics suite. The best analytics tool is the one that surfaces three numbers you act on. Keep it lean and review weekly.

## How to choose the best analytics tool

Start with your one key metric, then shortlist tools that show it without setup pain. The best analytics tool earns a daily open. Try one for a week before committing.

## FAQ

### Is it free?

There is a free tier for the best analytics tool.

### How fast?

Setup takes five minutes for the best analytics tool.`;

describe("audit", () => {
  it("passes a well-formed article", () => {
    const result = audit(makeArticle(goodBody), project);
    expect(result.findings.filter((f) => f.level === "error")).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it("flags a missing quick-answer section as an error", () => {
    const body = goodBody.replace("## Quick answer", "## Intro");
    const result = audit(makeArticle(body), project);
    expect(result.passed).toBe(false);
    expect(result.findings.some((f) => f.rule === "missing_tldr")).toBe(true);
  });

  it("flags a raw curly-brace MDX hazard", () => {
    const body = goodBody + "\n\nHello {first_name}, welcome.";
    const result = audit(makeArticle(body), project);
    expect(result.findings.some((f) => f.rule === "mdx_curly_hazard")).toBe(true);
  });

  it("flags an H1 in the body", () => {
    const result = audit(makeArticle("# Title\n\n" + goodBody), project);
    expect(result.findings.some((f) => f.rule === "multiple_h1")).toBe(true);
  });
});

describe("renderMdx", () => {
  it("renders frontmatter + body round-trippable", () => {
    const mdx = renderMdx(makeArticle(goodBody, { image: "/blog/test/hero.png" }));
    expect(mdx).toMatch(/^---\n/);
    expect(mdx).toContain("title: Best analytics tool for founders");
    expect(mdx).toContain("image: /blog/test/hero.png");
    expect(mdx).toContain("## Quick answer");
  });
});
