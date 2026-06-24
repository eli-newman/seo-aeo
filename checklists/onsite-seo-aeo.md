# On-site SEO + AEO Checklist (Phase 1)

> Work this top to bottom. For each item: **check** the current state →
> **fix** in code (matching repo conventions) → **note** it in your report.
> No API keys needed — this is all structure and metadata.
>
> Legend: 🔴 must-fix (blocks the gate) · 🟡 should-fix · 🔵 nice-to-have.

Framework note: in **Next.js App Router**, most metadata is the
`metadata` export / `generateMetadata` and files like `app/sitemap.ts`,
`app/robots.ts`. In **Astro**, it's `<head>` in layouts + `@astrojs/sitemap`.
Adapt accordingly — the *requirements* below are framework-agnostic.

---

## 1. Per-page metadata 🔴

- [ ] Every page has a **unique** `<title>` (~50–60 chars, primary term near front).
- [ ] Every page has a **unique** meta `description` (~140–160 chars).
- [ ] `<html lang="…">` is set.
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- [ ] **Canonical URL** per page (`<link rel="canonical">`), absolute.
- [ ] No accidental `noindex` on pages that should be indexed (check for a
      stray `<meta name="robots" content="noindex">`).

## 2. Open Graph + Twitter cards 🟡

- [ ] `og:title`, `og:description`, `og:type`, `og:url`, `og:image` on every page.
- [ ] `twitter:card` = `summary_large_image`, plus `twitter:title/description/image`.
- [ ] A real `og:image` exists (1200×630). Next.js: an `opengraph-image`
      file or dynamic route is ideal. If none exists, create a sensible default.

## 3. Crawlability 🔴

- [ ] **`robots.txt`** exists, allows indexing, and points to the sitemap
      (`Sitemap: https://site/sitemap.xml`).
- [ ] **`sitemap.xml`** is generated from real routes, **excludes drafts**,
      and updates automatically (don't hand-maintain it).
- [ ] Correct status codes: real 404 page, 301s for any known moved URLs,
      no redirect chains.
- [ ] Trailing-slash and www/non-www behavior is consistent (one canonical form).

## 4. Structured data (JSON-LD) 🔴 site-wide, 🟡 per-page

- [ ] Site-wide **`Organization`** (name, url, logo, sameAs links).
- [ ] Site-wide **`WebSite`** with a `SearchAction` (the sitelinks search box).
- [ ] Per-page types where they fit: `BreadcrumbList`, `Product` /
      `SoftwareApplication` (for product pages), `Article` (handled by the
      blog in Phase 2/3).
- [ ] Validate: the JSON-LD parses and matches what's actually on the page
      (never claim structure that isn't rendered).

## 5. AEO / GEO — get cited by AI answer engines 🔴

This is the half most sites miss.

- [ ] **`llms.txt`** at the site root — a markdown map of the site for LLMs:
      what the site is, key pages with one-line descriptions, and links.
      (See the template at the bottom.)
- [ ] **Allow the AI crawlers** you want in `robots.txt` (or confirm they
      aren't blocked): `GPTBot`, `ChatGPT-User`, `ClaudeBot`,
      `PerplexityBot`, `Google-Extended`. Decide *with the user* if they
      want to allow training crawlers; at minimum allow the retrieval ones.
- [ ] **Semantic HTML + heading hierarchy:** one `<h1>` per page, no skipped
      levels, headings are descriptive (questions/claims, not "Section 1").
- [ ] **Quotable content:** key answers appear high on the page in
      self-contained sentences (LLMs lift paragraphs, not whole pages).
      On the homepage/landing, make sure the "what is this / who is it for /
      what does it cost" answers are in plain text, not trapped in images.
- [ ] **Descriptive alt text** on every meaningful image (not "image1.png").
- [ ] Make sure critical copy is **server-rendered text**, not baked into
      images or only injected client-side where crawlers may miss it.

## 6. Core Web Vitals — quick wins 🟡

- [ ] Images use the framework's optimized component (`next/image`,
      Astro `<Image>`), have width/height, and lazy-load below the fold.
- [ ] Fonts use `font-display: swap` (or `next/font`), preconnect to font hosts.
- [ ] No obvious layout shift (reserve space for images/embeds).
- [ ] Defer non-critical third-party scripts.

## 7. Accessibility basics (overlaps SEO) 🔵

- [ ] All images have alt text; decorative images have empty `alt=""`.
- [ ] Interactive elements are real buttons/links with labels.
- [ ] Sufficient color contrast on text.

---

## Gate (Phase 1 done when…)

- The site **builds** and pages render.
- Every page has a unique title + description.
- `robots.txt`, `sitemap.xml`, and `llms.txt` all exist and are valid.
- `Organization` + `WebSite` JSON-LD validate.
- You've written the before/after report.

Commit: `seo-aeo: on-site SEO + AEO clean sweep`.

---

## `llms.txt` template

```markdown
# <Site Name>

> <One-sentence description of what the site/product is and who it's for.>

## Key pages
- [Home](https://site/): <what it is, the core value, the price if relevant>
- [Pricing](https://site/pricing): <plans and prices in plain text>
- [Blog](https://site/blog): <topics covered>
- [About](https://site/about): <who's behind it>

## What we do
<2–4 short paragraphs an LLM can quote verbatim: the problem, the solution,
who it's for, what makes it different. Specific, no marketing fluff.>

## Contact
- <email / support link>
```

## AI-crawler `robots.txt` block (retrieval crawlers)

```
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://<site>/sitemap.xml
```
