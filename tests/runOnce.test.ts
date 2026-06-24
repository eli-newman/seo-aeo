import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { runOnce } from "../src/engine/runOnce.js";
import type { EngineContext } from "../src/engine/context.js";
import type { TextProvider, TextCallOptions } from "../src/engine/providers/text.js";
import { NullImageProvider } from "../src/engine/providers/image.js";
import { ProjectConfig, type KeywordTarget } from "../src/engine/types.js";

const OUTLINE_JSON = JSON.stringify({
  workingTitle: "Best analytics tool for founders",
  targetKeyword: "best analytics tool",
  targetWordCount: 120,
  tldr: "The best analytics tool is the one you actually check daily — simple, cheap, fast to set up.",
  sections: [
    { heading: "Why simple beats powerful", bullets: ["a", "b"], includeTable: false, includeHowTo: false },
    { heading: "How to choose", bullets: ["c", "d"], includeTable: false, includeHowTo: false },
  ],
  faqs: [
    { q: "Is it free?", a: "There is a free tier for the best analytics tool." },
    { q: "How fast?", a: "Setup takes five minutes for the best analytics tool." },
  ],
});

const MDX_BODY = `## Quick answer

The best analytics tool is the one you actually check daily. Keep it simple and cheap. [Example](/) fits.

## Why simple beats powerful

Most founders ignore heavy suites. The best analytics tool surfaces three numbers you act on. Review weekly and you stay honest about traction.

## How to choose

Start from your one key metric, then shortlist. The best analytics tool earns a daily open. Try one for a week before you commit any money.

## FAQ

### Is it free?

There is a free tier for the best analytics tool.

### How fast?

Setup takes five minutes for the best analytics tool.`;

/** Stub provider that returns canned outputs based on the prompt. */
class StubText implements TextProvider {
  async call(opts: TextCallOptions): Promise<string> {
    const u = opts.user;
    if (u.includes("Draft a JSON outline")) return OUTLINE_JSON;
    if (u.includes("Write the full MDX body")) return MDX_BODY;
    if (u.includes("Apply an SEO pass")) {
      return JSON.stringify({
        title: "Best analytics tool for founders",
        description: "A concrete guide to the best analytics tool for solo founders.",
        keywords: ["best analytics tool", "analytics for founders"],
        body: MDX_BODY,
      });
    }
    if (u.includes("Apply an AEO")) {
      return JSON.stringify({ body: MDX_BODY, quickAnswer: "The best analytics tool is the one you check daily." });
    }
    if (u.includes("failed the SEO/AEO audit")) {
      return JSON.stringify({ body: MDX_BODY });
    }
    return "{}";
  }
}

const keywords: KeywordTarget[] = [
  { keyword: "best analytics tool", intent: "commercial", volume: 100, difficulty: 20, notes: "" },
];

let root: string;
let ctx: EngineContext;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "seo-aeo-test-"));
  ctx = {
    root,
    project: ProjectConfig.parse({
      name: "Example",
      siteUrl: "https://example.com",
      article: { minWordCount: 30, maxWordCount: 4000, internalLinkTargets: [{ url: "/", anchor: "Example" }] },
      audit: { seoMinScore: 60, aeoMinScore: 60 },
    }),
    voice: "Practical and specific.",
    keywords,
    feeds: [],
    text: new StubText(),
    image: new NullImageProvider(),
  };
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("runOnce (mocked providers)", () => {
  it("produces an audit-passing MDX preview in dry-run", async () => {
    const result = await runOnce(ctx, { dryRun: true });

    expect(result.topic.keyword.keyword).toBe("best analytics tool");
    expect(result.audit.passed).toBe(true);
    expect(result.previewPath).toBeTruthy();

    const mdx = await readFile(result.previewPath!, "utf8");
    expect(mdx).toContain("## Quick answer");
    expect(mdx).toContain("title: Best analytics tool for founders");
    expect(mdx).toContain("## FAQ");
    // No PR in dry-run.
    expect(result.publish).toBeUndefined();
  });
});
