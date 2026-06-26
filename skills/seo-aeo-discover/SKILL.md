---
name: seo-aeo-discover
description: Inspect a website/repo to map its stack, content layout, existing SEO/AEO, and whether a blog exists and is publicly crawlable. Use at the discovery step of /seo-aeo, or when the user wants an SEO/AEO audit summary of a site before changing anything.
---

# seo-aeo-discover

Understand the site well enough to tailor every later step. **Read-only — change
nothing here.** Output a one-paragraph report at the end.

## Inspect

1. **Stack** — framework (from preflight), App Router vs Pages (`app/` vs
   `pages/`), the **content dir** (`content/blog`, `src/content/blog`,
   `posts/`…), the **public/static dir**.
2. **Does a blog exist?** A content dir with `*.md(x)`, a blog route
   (`app/blog`, `src/pages/blog`), or a CMS. If yes, read one post and record
   its **frontmatter shape**.
3. **Existing SEO/AEO — don't redo good work.** Check for: per-page
   `<title>`/description, canonical, OG/Twitter, `robots`, `sitemap`,
   **`llms.txt`**, `next/font`, and JSON-LD (`Organization`/`Article`/
   `FAQPage`). Note present-and-good vs missing/weak.
4. **CRITICAL — is the blog publicly crawlable?** Check middleware/auth and
   actually hit the URL: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" <site>/blog`.
   A 3xx → `/login` means it's **auth-gated and invisible to crawlers** — a
   blocking finding for AEO. Also confirm the blog route/content are actually
   **committed to the deploy branch**, not just sitting uncommitted locally.

## Gate

You can state in one paragraph: framework, where pages/assets live, whether a
blog exists, **whether it's publicly crawlable + committed to the deploy
branch**, whether the tree is clean, and what SEO/AEO is already in place.
Flag the auth-gated and uncommitted-blog cases loudly — they decide Phase 5.

---

**Next →** `seo-aeo-measure`
