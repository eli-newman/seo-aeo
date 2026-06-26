# Frontmatter Contract

> **The single integration point.** The blog you scaffold in Phase 2 and
> the articles the engine writes in Phase 3 must agree on this exact
> frontmatter. Render it correctly once and the automation snaps in with
> zero glue code.

This is the schema the engine emits (`ArticleFrontmatter` in
`src/engine/types.ts`). Your blog's MDX loader must read these fields and
your page template must render them as described.

## The schema

```yaml
---
title: string            # Article title. Render as the page <h1>.
description: string      # <=160 chars. Meta description + OG/Twitter description.
date: "YYYY-MM-DD"       # ISO date string. Publish date.
author: string           # Display name.
keywords: string[]       # SEO keywords; keywords[0] is the primary target.
faqs:                    # Optional. Drives the FAQPage JSON-LD + on-page FAQ.
  - { q: string, a: string }
image: string            # Optional. Hero image path, e.g. /blog/<slug>/hero.png
draft: boolean           # If true, exclude from the published list + sitemap.
---
```

### Rules the engine guarantees (so your template can rely on them)

- **The body never contains an `<h1>` / `#`.** The engine strips it. Your
  template renders the `<h1>` from `title`. (Two H1s tanks SEO.)
- The body **opens with `## Quick answer`** (a citable TL;DR) and **ends
  with `## FAQ`**. You don't need to special-case these — they're just MDX.
- The `faqs` array mirrors the on-page `## FAQ` section. Use `faqs` to
  build the `FAQPage` JSON-LD (don't parse the body).
- Literal placeholders in body copy use `[square_brackets]`, never
  `{curly}` (curly braces are JSX in MDX).

## Image paths

- Files are written to `<publicPath>/<publicUrlBase>/<slug>/<name>.<ext>`
  (default: `public/blog/<slug>/hero.png`).
- `image` in frontmatter is the **served URL**: `<publicUrlBase>/<slug>/<name>.<ext>`
  (default `/blog/<slug>/hero.png`).
- These two settings live in `seo-aeo.config.json → layout.publicPath` and
  `layout.publicUrlBase`. Whatever your blog uses, set them to match.

## JSON-LD your blog page MUST emit (this is the AEO half)

The engine writes frontmatter + body only. **The blog page is responsible
for emitting JSON-LD into `<head>`**, derived from frontmatter:

1. **`Article`** — always. From `title`, `description`, `date`, `author`,
   canonical URL, and `image` if present.
2. **`FAQPage`** — when `faqs.length >= 2`. From the `faqs` array.

```ts
// Build once in the blog post page, inject as <script type="application/ld+json">.
function buildJsonLd(fm, url, siteName) {
  const blocks = [{
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fm.title,
    description: fm.description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: fm.date,
    dateModified: fm.date,
    author: { "@type": "Person", name: fm.author },
    publisher: { "@type": "Organization", name: siteName },
    ...(fm.image ? { image: new URL(fm.image, url).toString() } : {}),
  }];
  if (fm.faqs?.length >= 2) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: fm.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  return blocks;
}
```

## Loader requirements

Your MDX loader / content collection must:

- Read every `*.mdx` in the **posts** dir (default `content/blog`), parse
  frontmatter, and expose `{ slug, frontmatter, body }`.
- Exclude `draft: true` from the public list and the sitemap.
- Resolve `slug` from the filename (the engine names files
  `YYYY-MM-DD-<kebab-title>.mdx`; `slug` = filename without extension).
- Sort the index by `date` descending.

If your existing blog already does all of the above with a **different**
frontmatter shape, you have two options: (a) adapt this contract's field
names to match yours and set the engine's config accordingly, or (b) add
a thin mapping layer in your loader. Prefer (a) — fewer moving parts.
