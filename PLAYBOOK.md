# seo-aeo Playbook — Agent Directions

> **You are an AI coding agent.** A user has pointed you at a website or a
> repo and asked you to make it rank in search **and** get cited by AI
> answer engines. This file is your spec. Follow the phases in order, run
> each phase's gate before moving on, and report back at the checkpoints.

You can run **Phases 0–2 with no API keys** — they're pure code changes.
**Phase 3** (recurring article automation) needs two keys, which the user
provides at the end if they want it.

## The one command that starts you

The user will say something like:

> "Make this site SEO and AEO optimized — follow
> `node_modules/seo-aeo/PLAYBOOK.md`. Do Phases 0–2 now, no keys
> needed, and give me the report when done. If I paste an
> `ANTHROPIC_API_KEY` and a GitHub token, also do Phase 3."

If the user gave you a **live URL** but not a repo, first locate the repo
(ask, or look for it). You need write access to source to do Phases 1–3.
If you genuinely only have a URL, you can still produce the Phase 1 *audit*
(read-only) and hand the user the fix list.

## Operating rules

- **Work on a branch.** `git checkout -b seo-aeo/optimize`. Never commit to
  the default branch directly.
- **Commit per phase**, with a clear message. Small, reviewable commits.
- **Verify before you claim done** — build, typecheck, and run the site
  locally to confirm pages render. Don't report success on unverified work.
- **Don't invent content.** In Phases 0–2 you're fixing structure and
  metadata, not writing marketing copy. Article generation is Phase 3's job.
- **Match the repo's conventions** (styling, file layout, TS/JS). You're a
  guest in this codebase.
- **Check the working tree first** (`git status`). If it's **dirty**
  (uncommitted changes / untracked files), STOP and surface it — don't
  branch over or entangle the user's in-progress work with yours. Ask them
  to commit/stash, or to confirm it's safe to include.
- **Don't redo good work.** Many sites are already partly (or fully)
  optimized. Inventory what exists *before* changing anything, and only fix
  real gaps. "Already done well" is a valid, valuable finding — report it.

---

## Phase 0 — Discover

**Goal:** understand the site well enough to tailor every later step.

1. Detect the **framework**: read `package.json`.
   - `next` → Next.js (note App Router vs Pages Router: `app/` vs `pages/`).
   - `astro` → Astro.
   - `@remix-run/*` → Remix.
   - none of the above → treat as static/other; adapt the recipes by hand.
2. Inventory the site: list routes/pages, find the **public/static dir**,
   find any existing **sitemap/robots/llms.txt**, and check for OG images.
3. **Does a blog/article section already exist?** Look for: a content dir
   with `*.md(x)` (`content/blog`, `src/content/blog`, `posts/`…), a blog
   route (`app/blog`, `src/pages/blog`), or a CMS integration. Record the
   answer — it decides whether Phase 2 runs.
4. If a blog exists, read one existing post and record its **frontmatter
   shape** — you'll reconcile it with the contract in Phase 2/3.

Also **inventory existing SEO/AEO work** so you don't redo it: is there
already a `robots`, `sitemap`, `llms.txt`, per-page metadata, `next/font`,
and JSON-LD (`Organization`/`Article`/`FAQPage`)? Note what's present and
good vs. missing or weak — Phase 1 only touches the gaps.

**Gate:** you can state, in one paragraph: framework, where pages live,
where static assets live, whether a blog exists, **whether the tree is
clean**, and **what SEO/AEO is already in place**. Write this as the
opening of your report.

---

## Phase 1 — On-site SEO + AEO clean sweep (no keys)

**Goal:** make the *existing* site technically excellent for both Google
and AI answer engines.

**Measure first.** Before editing anything, get a **baseline** with
[`recipes/measure-lighthouse.md`](./recipes/measure-lighthouse.md): a
Lighthouse audit (SEO / Accessibility / Best Practices) **and** a
performance trace (Core Web Vitals). Performance *is* SEO — CWV are a Google
ranking factor — so both run on **mobile**, against a production build or
the live URL. Save the scores; you'll re-run them at the gate.

Then work through
[`checklists/onsite-seo-aeo.md`](./checklists/onsite-seo-aeo.md) top to
bottom. For each item: check current state → fix in code → note it in the
report.

The big rocks (full detail in the checklist):

- **Metadata:** unique `<title>` + meta description per page, canonical
  URLs, `lang`, viewport, OG + Twitter cards with an `og:image`.
- **Crawlability:** `robots.txt`, `sitemap.xml` (auto-generated, excludes
  drafts), proper status codes + redirects.
- **Structured data:** JSON-LD `Organization` + `WebSite` (with
  `SearchAction`) site-wide; appropriate per-page types.
- **AEO / GEO:** an **`llms.txt`** at the site root, allow the AI crawlers
  you want (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) in
  `robots.txt`, clean semantic HTML + heading hierarchy, descriptive alt
  text, and content structured to be *quotable* (clear answers near the top).
- **Core Web Vitals quick wins:** optimized/lazy images, font loading,
  no obvious layout shift.

**Gate:** the site builds; every page has a unique title + description; a
valid sitemap, robots, and `llms.txt` exist; `Organization` + `WebSite`
JSON-LD validate; AND the **re-measured** scores (mobile, production build)
hit the targets — Lighthouse **SEO ≥ 95**, Best Practices ≥ 90,
Accessibility ≥ 90, and **LCP ≤ 2.5s / CLS ≤ 0.1 / INP ≤ 200ms**. If a
target is blocked by something out of scope (slow host, required heavy
third-party), note the metric + cause + fix in the report rather than
silently passing. Commit: `seo-aeo: on-site SEO + AEO clean sweep`.
**Report to the user** with the **before/after scores**, then continue.

---

## Phase 2 — Build the blog (only if Phase 0 found none)

**Goal:** give the site a place for the engine to publish — a blog that
renders the [frontmatter contract](./recipes/frontmatter-contract.md).

**Skip this phase if a blog already exists.** Instead, just confirm its
frontmatter matches the contract (or adjust the engine's config in Phase 3
to match the blog). Don't rebuild a working blog.

If there's no blog, pick the recipe for the detected stack and follow it:

- Next.js → [`recipes/blog-nextjs.md`](./recipes/blog-nextjs.md)
- Astro → [`recipes/blog-astro.md`](./recipes/blog-astro.md)
- Other → adapt the Next.js recipe's structure to the framework, keeping
  the **frontmatter contract** and the **JSON-LD-from-frontmatter** rule
  intact.

Each recipe gives you: a content dir, an MDX loader, an index page, a post
page (with `generateMetadata` + JSON-LD), a sitemap entry, and a styling
hook that matches the site. **Read the contract first** — it's the part
everything else depends on.

**Gate:** drop a hand-written sample MDX post (using the contract's
frontmatter) into the posts dir, run the site, and confirm: the index
lists it, the post page renders, the `<h1>` comes from `title`, and
`Article` + `FAQPage` JSON-LD appear in the page source. Then delete the
sample. Commit: `seo-aeo: add blog section`. **Report to the user.**

---

## Phase 3 — Wire the recurring engine (needs 2 keys)

**Goal:** one new article every 1–2 weeks, forever, as a PR.

Only run this if the user has provided an **`ANTHROPIC_API_KEY`** and a
**GitHub token** (and a **`GEMINI_API_KEY`** if they want images). If they
haven't, stop after Phase 2 and tell them exactly how to enable it later
(the two lines below).

1. Install + onboard:
   ```bash
   npm install -D github:eli-newman/seo-aeo
   ANTHROPIC_API_KEY=… npx seo-aeo init
   ```
   The wizard interviews the user (or you can pre-answer from what you
   learned in Phase 0), then generates `.seo-aeo/keywords.json`,
   `.seo-aeo/voice.md`, `seo-aeo.config.json`, and the cron workflow.
2. **Point the config at the real blog.** Set `layout.postsPath`,
   `layout.draftsPath`, `layout.publicPath`, and `layout.publicUrlBase` to
   match the blog from Phase 2 (or the existing blog). This is where the
   contract pays off.
3. Add the repo secrets in GitHub → Settings → Secrets → Actions:
   `ANTHROPIC_API_KEY` (+ `GEMINI_API_KEY` if images on). `GITHUB_TOKEN`
   is automatic and opens the PR.
4. **Prove it end-to-end:** `npx seo-aeo run --dry-run` → review the
   generated MDX preview → if good, you're done. The cron takes over.

**Gate:** `--dry-run` produces an audit-passing article that renders in the
blog you built. Commit: `seo-aeo: enable automated articles`. **Final
report** to the user: what's automated, the cadence, and how to pause it
(disable the workflow).

---

## What to tell the user at the very end

- What you changed on the existing site (Phase 1 wins).
- Whether you built a blog or used an existing one (Phase 2).
- Whether automation is live, and on what cadence (Phase 3) — or the two
  commands to enable it later if they skipped the keys.
- Anything you couldn't safely do and why.
