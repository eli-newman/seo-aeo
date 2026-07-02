---
name: seo-aeo-engine
description: Install and wire the recurring content engine so a site auto-publishes an SEO/AEO-optimized article every 1-2 weeks via GitHub Actions, opened as a PR. Use at the automation step of /seo-aeo, or when the user wants scheduled/automatic blog articles or to set up the seo-aeo cron.
---

# seo-aeo-engine

Set up the engine that writes one optimized article every 1-2 weeks as a PR.
Needs an `ANTHROPIC_API_KEY` (gathered in preflight). Only run if the user
wants automation.

## Steps

1. **Install + onboard** (in the target repo):
   ```bash
   npm install -D github:eli-newman/seo-aeo
   ANTHROPIC_API_KEY=… npx seo-aeo init   # interview → keywords.json, voice.md, config, cron
   ```
   Pre-answer the interview from what preflight/discover gathered.
2. **Point the config at the real blog** — set `layout.postsPath` /
   `draftsPath` / `publicPath` / `publicUrlBase` to match the blog. **Make
   the engine write where the blog renders from** so merge = publish (a draft
   in a dir the blog ignores never goes live).
3. **Repo secret** — `gh secret set ANTHROPIC_API_KEY -R <owner/repo>`
   (`GEMINI_API_KEY` too if images are on). Use the user's real key.
4. **Enable Actions to open PRs** — off by default; the first run will 403 on
   `gh pr create` without it:
   ```bash
   gh api -X PUT repos/<owner/repo>/actions/permissions/workflow \
     -F default_workflow_permissions=write -F can_approve_pull_request_reviews=true
   ```
5. **The engine repo must be installable in CI** — it's public
   (`seo-aeo`) so `npx -y seo-aeo` works
   with no auth. (Private → add a PAT secret instead.)

## Known-good behavior to confirm

- Dedup works against **both** `posts/` and `drafts/`, so merging a PR moves
  the next run to a fresh topic (otherwise it repeats the top topic).
- New Claude models reject `temperature`; the engine drops it and retries.

## Gate

`npx seo-aeo run --dry-run` produces an **audit-passing** article
(SEO + AEO) whose MDX renders in the blog. Cron + secret + PR permission set.

---

**Next →** `seo-aeo-verify`
