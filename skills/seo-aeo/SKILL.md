---
name: seo-aeo
description: One-command setup that makes any website rank in Google AND get cited by AI answer engines (ChatGPT/Perplexity/Gemini), then auto-publishes an optimized article every 1-2 weeks. Orchestrates the full pipeline with gates and checkpoints. Use when the user wants to "make this site SEO/AEO optimized", "set up automatic blog articles", "optimize my site for AI search", or runs /seo-aeo.
---

# seo-aeo — orchestrator

You are setting up SEO + AEO optimization for the user's site. Run the phases
**in order**, check each **gate** before advancing, and **stop at checkpoints**
for human input. Goal: the user's hands-on time is **under 10 minutes** — so
front-load every decision in Phase 0, then run the rest autonomously.

## Front-load (do this first, once)

Before any work, gather everything you'll need so you never block later:
1. Run `seo-aeo-preflight` — verifies node ≥20, `gh` (authed), git repo, and
   asks the user up front for: the target repo path, whether they want
   automated articles (and the `ANTHROPIC_API_KEY` if so), and the publish
   cadence. **Collect keys/decisions now, not mid-run.**

Record a checkpoint after each phase (a short note of what passed) so the run
is **resumable** if interrupted — re-read this file + the last checkpoint.

## Phases (run in order; do not skip a failed gate)

| # | Skill | Gate (must pass to advance) |
|---|-------|------------------------------|
| 1 | `seo-aeo-preflight` | env ready, inputs gathered |
| 2 | `seo-aeo-discover`  | stack known; blog exists? auth-gated? SEO inventory done; **working tree clean** (or user OK'd) |
| 3 | `seo-aeo-measure`   | baseline Lighthouse + CWV captured (or marked PENDING) |
| 4 | `seo-aeo-onsite`    | metadata/robots/sitemap/llms.txt/JSON-LD fixed; re-measure hits targets |
| 5 | `seo-aeo-blog`      | **skip if a public blog exists**; else blog renders a sample post with JSON-LD and is **publicly crawlable (not behind auth)** |
| 6 | `seo-aeo-engine`    | only if user wants automation; dry-run produces an audit-passing article |
| 7 | `seo-aeo-verify`    | a real run opens a PR; the published article is **live and crawlable** |

## Gate rules

- **A gate is a hard stop.** If it fails, fix it (or the sub-skill does) and
  re-check. Never advance on a failed gate.
- **Checkpoint = report to the user** after each phase: what changed, the
  before/after, and the next phase. Keep it short.
- **Stop and ask the human** only for: missing keys, a dirty working tree, a
  decision that changes the site (e.g. "the blog is login-gated — make it
  public?"), or a destructive/outward-facing action. Otherwise proceed.
- **Honesty over green checks.** If you can't verify something (e.g. live
  perf with no browser), mark it PENDING — never fabricate a pass.

## The two critical AEO gotchas (check explicitly)

1. **Crawlability** — the blog and articles MUST be reachable by Google AND
   AI crawlers *unauthenticated*. A login-gated `/blog` defeats the whole
   point. `seo-aeo-discover` flags it; `seo-aeo-blog` must resolve it.
2. **Publish target** — confirm the engine writes where the blog actually
   renders from (the merge = publish path), not a dead `drafts/` dir.

## Done

When Phase 7 passes, report: what's optimized, whether automation is live and
on what cadence, and any honest gaps (e.g. off-page authority is out of scope).
If the user skipped automation, tell them the one command to enable it later.
