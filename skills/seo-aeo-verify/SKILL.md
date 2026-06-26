---
name: seo-aeo-verify
description: Prove the autonomous content setup actually works end to end — trigger a real run, confirm a PR opens, and confirm the published article is live and crawlable (not behind auth). Use at the final step of /seo-aeo, or when the user wants to verify the cron/automation really works.
---

# seo-aeo-verify

Prove autonomy is real, not theoretical. Don't claim success on unverified
work — actually trigger it and check the outcome.

## Steps

1. **Trigger a run** (don't wait for the schedule):
   `gh workflow run seo-aeo.yml -R <owner/repo>`, then watch:
   `gh run watch <id> -R <owner/repo>` (or poll `gh run view`).
2. **Confirm a PR opened** — `gh pr list -R <owner/repo>`. If the run
   succeeded but no PR, check the log for `gh pr create failed: ... not
   permitted to create or approve pull requests` → the Actions PR permission
   isn't set (go back to `seo-aeo-engine` step 4).
3. **Confirm the article is publishable where the blog renders** — the PR
   should add a file to the dir the blog reads. Merge it (or have the user
   review), then verify it actually lands in the rendered posts dir.
4. **Confirm it's LIVE and CRAWLABLE** — hit the published URL unauthenticated:
   `curl -s -o /dev/null -w "%{http_code}" <site>/blog/<slug>` must be **200**
   (a 3xx → login means it's gated and invisible to crawlers — fail).

## Gate (end-to-end proven)

A triggered run opened a PR; the article is in the blog's render dir; the live
post URL returns 200 to an anonymous request; the page source contains Article
+ FAQPage JSON-LD.

## Final report

State: what's optimized (before/after scores), whether automation is live and
the cadence, how to pause it (disable the workflow), and honest gaps (off-page
authority — reviews/mentions/links — is out of scope and partly manual).

---

**Done.** This is the last phase — report the final summary.
