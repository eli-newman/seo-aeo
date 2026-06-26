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

- [ ] **Allow the CITATION crawlers** in `robots.txt` — these are what drive
      AI citation (distinct from *training* bots). Don't accidentally block
      them with blanket bot rules / Cloudflare bot protection:
      `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`,
      `PerplexityBot`, `Perplexity-User`, `Googlebot`, `Bingbot`, `Applebot`.
      (Template at the bottom.) Training bots — `GPTBot`, `ClaudeBot` — are a
      *separate, optional* decision and do NOT affect citation.
- [ ] **Don't believe the `Google-Extended` myth.** It's a training opt-out
      token, **not a crawler** — blocking it does NOT remove you from AI
      Overviews (those use the main Google index). Never block `Googlebot`.
- [ ] **Server-rendered content (SSR/SSG) — the #1 silent AEO killer.** As of
      2026, **no major AI crawler executes JavaScript.** If the primary
      content only appears after client-side JS (SPA, CSR), it is **invisible**
      to AI crawlers. Verify the answer text is in the **raw HTML**
      (`curl <url> | grep "<a key sentence>"`). Same for content hidden behind
      **tabs/accordions/click-to-reveal** — flag it as a defect.
- [ ] **Semantic HTML + heading hierarchy:** one `<h1>` per page, no skipped
      levels, headings are descriptive (questions/claims, not "Section 1").
- [ ] **Quotable passages (evidence-backed).** LLMs chunk pages and quote the
      strongest passage, not the page. So: a **direct-answer block of ~40–75
      words** per key question (cited ~3× more), **self-contained sections**
      (restate the subject, no "as mentioned above"), short paragraphs, and a
      **visible last-updated date** (content >~3 months old is cited less).
- [ ] **Citation drivers in the copy (Princeton GEO study):** include **inline
      source citations** (+115% visibility), **statistics** (+40%), and
      **attributable quotations**. **Keyword stuffing scores WORSE than
      baseline — never do it.**
- [ ] **Descriptive alt text** on every meaningful image (not "image1.png").
- [ ] **`llms.txt`** at the root — 🔵 **optional, low-yield.** A 300k-domain
      study found no measurable citation lift and no major engine reliably
      fetches it; it mainly helps *developer-doc / coding-agent* discovery.
      Add it if cheap, but don't treat it as essential AEO. (Template below.)

## 6. Core Web Vitals — performance IS SEO 🔴

CWV are a confirmed Google ranking factor. **Measure** with
[`recipes/measure-lighthouse.md`](../recipes/measure-lighthouse.md)
(mobile, production build) — baseline before, re-check at the gate. Targets:
**LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1**.

- [ ] **LCP:** the hero/largest element loads fast — optimized + `priority`/
      preloaded hero image, no render-blocking CSS/JS, fast host/CDN.
- [ ] **CLS:** images & embeds have width/height (or aspect-ratio), space is
      reserved for anything that loads late, `font-display: swap`.
- [ ] **INP:** trim main-thread JS, break up long tasks, defer non-critical
      and third-party scripts.
- [ ] Images use the framework's optimized component (`next/image`,
      Astro `<Image>`) and lazy-load below the fold.
- [ ] Fonts use `next/font` / `font-display: swap`, preconnect to font hosts.

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
- **Re-measured scores hit target** (mobile, prod build): Lighthouse SEO ≥ 95,
  Best Practices ≥ 90, Accessibility ≥ 90; LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms.
  Out-of-scope misses are noted with cause + fix, not silently passed.
- You've written the **before/after report (with scores)**.

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

## AI-crawler `robots.txt` block (CITATION crawlers — allow these)

These are the search/retrieval/user-fetch agents that drive AI citation.
Allowing them is independent of any decision to block *training* bots
(`GPTBot`, `ClaudeBot`, `CCBot`).

```
# OpenAI (ChatGPT Search + live fetch)
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /

# Anthropic (Claude search + live fetch)
User-agent: Claude-SearchBot
Allow: /
User-agent: Claude-User
Allow: /

# Perplexity
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /

# Google (AI Overviews use the MAIN index — never block Googlebot),
# Bing (Copilot), Apple (Siri/Spotlight)
User-agent: Googlebot
Allow: /
User-agent: Bingbot
Allow: /
User-agent: Applebot
Allow: /

Sitemap: https://<site>/sitemap.xml
```

> Note: some crawlers (Perplexity's undeclared fetchers, Bytespider, xAI's
> Grok) ignore robots.txt — to actually *block* a bot you need WAF/firewall
> rules, not robots.txt. robots.txt only reliably *allows*.
