/**
 * Proves the engine's output is *real* MDX that compiles — not just a
 * string. This is the test that would have caught curly-brace/JSX hazards
 * and table/heading bugs before they hit a consumer's build.
 */
import { describe, it, expect } from "vitest";
import { compile } from "@mdx-js/mdx";

import { sanitizeMdxBraces } from "../src/engine/pipeline/write.js";

async function compiles(body: string): Promise<boolean> {
  try {
    await compile(body, { development: false });
    return true;
  } catch {
    return false;
  }
}

const REPRESENTATIVE_BODY = `## Quick answer

The best analytics tool is the one you check daily. Keep it simple. [Example](/) fits.

## Why simple beats powerful

Most founders ignore heavy suites.

| Tool | Price | Setup |
| --- | --- | --- |
| A | $9 | 5 min |
| B | $29 | 1 hour |

## How to choose

1. Pick your one key metric.
2. Shortlist tools that show it.
3. Try one for a week.

## FAQ

### Is it free?

There is a free tier.`;

describe("MDX compilation", () => {
  it("compiles a representative engine article (tables, lists, links, headings)", async () => {
    expect(await compiles(REPRESENTATIVE_BODY)).toBe(true);
  });

  it("raw multi-word curly placeholders BREAK MDX compilation — the real hazard", async () => {
    // Real email templates say "Hi {first name}". A space makes the braces
    // an invalid JS expression, so MDX fails to compile. (A bare {first_name}
    // would compile but throw at runtime as an undefined variable — also bad.)
    expect(await compiles("Hi {first name}, welcome to {the product}.")).toBe(false);
  });

  it("the sanitizer makes that same body compile", async () => {
    const raw = "Hi {first name}, welcome to {the product}.";
    const clean = sanitizeMdxBraces(raw);
    expect(clean).toContain("[first name]");
    expect(await compiles(clean)).toBe(true);
  });

  it("does not mangle code fences (leaves {braces} inside code intact and compiling)", async () => {
    const withCode = [
      "Here's a snippet:",
      "",
      "```js",
      "const x = { first_name: 'Sam' };",
      "```",
      "",
      "Done.",
    ].join("\n");
    const out = sanitizeMdxBraces(withCode);
    expect(out).toContain("{ first_name: 'Sam' }"); // untouched inside the fence
    expect(await compiles(out)).toBe(true);
  });
});
