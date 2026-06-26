---
name: seo-aeo-blog
description: Build a blog/article section on a site that doesn't have one, tailored to the stack (Next.js/Astro), rendering a shared frontmatter contract with Article/FAQPage JSON-LD, and publicly crawlable. Use at the blog step of /seo-aeo, or when the user needs to add an MDX blog that the content engine can publish into.
---

# seo-aeo-blog

Give the site a place for articles to land — a blog that renders the
[frontmatter contract](frontmatter-contract.md) and is **publicly crawlable**.

**Skip this entirely if a public blog already exists** — just confirm its
frontmatter matches the contract (or point the engine's config at it).

## Build (only if missing)

1. **Read [frontmatter-contract.md](frontmatter-contract.md) first** — it's
   the single integration point between the blog and the engine.
2. Pick the recipe for the stack and follow it:
   - Next.js → [blog-nextjs.md](blog-nextjs.md)
   - Astro → [blog-astro.md](blog-astro.md)
   - Other → adapt the Next.js recipe, keeping the contract + JSON-LD rule.
3. Each recipe gives: content dir, MDX loader, index page, post page
   (`generateMetadata` + Article/FAQPage JSON-LD), sitemap entry.

## The two non-negotiables

- **Public, not auth-gated.** If middleware redirects `/blog` to login, the
  content is invisible to Google and AI crawlers — fix the middleware to make
  `/blog` and `/blog/*` public. This is the most common silent AEO killer.
- **Committed to the deploy branch.** A blog that only exists in an
  uncommitted working tree never reaches production. Commit it (PR), and
  ensure production deploys from that branch.

## Gate

Drop a sample post (contract frontmatter, 2+ faqs), run the site, confirm: the
index lists it, the post renders, the `<h1>` comes from `title`, and Article +
FAQPage JSON-LD appear in the page source — **and the live URL returns 200 to
an unauthenticated request**. Delete the sample. Commit `seo-aeo: add blog`.
