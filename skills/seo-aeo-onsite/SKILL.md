---
name: seo-aeo-onsite
description: Fix a site's on-page SEO and AEO in code — metadata, canonical, robots.txt, sitemap, llms.txt, JSON-LD, AI-crawler rules, and Core Web Vitals — no API keys needed. Use at the on-site step of /seo-aeo, or when the user wants to fix technical SEO, structured data, llms.txt, or make a site AI-crawlable.
---

# seo-aeo-onsite

Make the existing site technically excellent for Google **and** AI answer
engines. All code edits, **no API keys**. Work the checklist top to bottom;
only fix real gaps (don't redo what `seo-aeo-discover` found already-good).

**Work on a branch.** Commit when done. **Don't entangle** a dirty tree —
stage only your own changes.

See [CHECKLIST.md](CHECKLIST.md) for the full item-by-item list + templates
(`llms.txt`, AI-crawler `robots.txt` block).

## The big rocks

- **Metadata** — unique `<title>` + description per page, canonical, `lang`,
  viewport, OG + Twitter cards with an `og:image`.
- **Crawlability** — `robots.txt`, auto-generated `sitemap.xml` (excludes
  drafts), correct status codes.
- **Structured data** — site-wide `Organization` + `WebSite` (SearchAction);
  per-page types where they fit.
- **AEO/GEO** — an **`llms.txt`** at the root, **allow AI crawlers** (GPTBot,
  ClaudeBot, PerplexityBot, Google-Extended), clean heading hierarchy,
  descriptive alt text, key answers in **server-rendered text** (not images).
- **CWV quick wins** — optimized/lazy images, `next/font`/`font-display`,
  no layout shift, defer third-party JS.

## Measure → fix → re-measure

Baseline with `seo-aeo-measure` before editing, fix, then re-measure.

## Gate

Site builds; every page has a unique title + description; `robots.txt`,
`sitemap.xml`, `llms.txt` valid; `Organization` + `WebSite` JSON-LD validate;
re-measured scores hit target (SEO ≥ 95; LCP ≤ 2.5s / CLS ≤ 0.1 / INP ≤ 200ms)
or misses are noted with cause. Commit `seo-aeo: on-site SEO + AEO clean sweep`
and report before/after.

---

**Next →** `seo-aeo-blog`
