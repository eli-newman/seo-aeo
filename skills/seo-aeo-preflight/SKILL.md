---
name: seo-aeo-preflight
description: Verify the environment and gather all inputs/decisions up front for an SEO/AEO setup, so the rest runs without blocking. Use at the start of /seo-aeo, or when the user wants to check prerequisites for site optimization or automated articles.
---

# seo-aeo-preflight

Get everything ready and gather every human decision **now**, so later phases
run autonomously. This is what keeps total hands-on time under 10 minutes.

## Checks (report pass/fail for each)

1. **Node ≥ 20** — `node --version`.
2. **git repo** — `git rev-parse --is-inside-work-tree`. Note the default
   branch and whether the **working tree is clean** (`git status --short`).
   A dirty tree is a checkpoint for the orchestrator, not an error.
3. **`gh` CLI authed** — `gh auth status`. Needed for secrets, PRs, and the
   Actions permission later. If missing, tell the user to run
   `gh auth login` (suggest `! gh auth login`).
4. **Framework** — read `package.json`: `next` / `astro` / `@remix-run/*` /
   else static.

## Gather up front (ask once, batched)

Ask the user these now and record the answers for later phases:

- **Target repo path** (default: current dir).
- **Site URL** (production).
- **Do you want automatic articles?** (the recurring engine). If **yes**:
  - Get an **`ANTHROPIC_API_KEY`**. Keep it out of the transcript: ask them
    to put it in `~/.seo-aeo.env` as `ANTHROPIC_API_KEY=...` in their own
    terminal, then confirm. (Images are optional and need `GEMINI_API_KEY`.)
  - **Cadence**: weekly or biweekly.
- **One sentence: what the site/product does**, the audience, and the tone —
  the engine's onboarding will reuse these.

## Gate

Env is ready and you have: repo path, site URL, automation yes/no (+ key if
yes), cadence, and the site description. Hand these to the orchestrator.

---

**Next →** `seo-aeo-discover`
