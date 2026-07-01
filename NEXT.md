# seo-aeo — State & Next Steps

_Handoff note. Where the project stands and what's left, in priority order._

## Where it stands (proven, 2026-06)

- **Repo:** github.com/eli-newman/seo-aeo (private). Installable via
  `npm i seo-aeo` (builds on install via `prepare`).
- **Proven live** on simple-followup: generated real audit-passing articles
  (SEO 90 / AEO 100), opened a real PR (eli-newman/simple-followup#1).
- **24 tests** green; build + lint + typecheck clean.
- **Two layers ship:** (1) the agent **PLAYBOOK** (keyless on-site SEO/AEO
  clean sweep + blog scaffold), (2) the **engine** (recurring MDX articles
  via GitHub Actions). One shared **frontmatter contract** bridges them.

### Bugs found + fixed by dogfooding (the mocks missed all of these)
1. Opus 4.8 deprecated `temperature` → provider drops it and retries.
2. Keyword bloat (sentence-junk from headings) → seed target only, SEO pass
   caps to ≤8 clean keywords.
3. Length overshoot rejected the *whole* SEO/AEO/repair patch → schemas
   tolerate overshoot (apply truncates). **Lesson: validate LLM-patch
   schemas leniently — truncate, don't reject.**

### Quick wins just shipped
- `run --keyword "<phrase>"` — target a specific article (comparison/"vs"
  pages, on-demand topics) instead of auto-ranking.
- `config.sameAs[]` → emitted as schema.org `sameAs` (entity-consistency
  signal for answer engines).

---

## What's left (priority order)

### A. simple-followup autonomy — ✅ DONE & verified live
The biweekly cron is running in GitHub Actions and **opened PR #2 on its
own** (audit SEO 90 / AEO 100). What was needed (now done):
- `.github/workflows/seo-aeo.yml` committed to `main` (installs the engine
  via `npx -y seo-aeo`; the engine repo is now **public**).
- Repo secret `ANTHROPIC_API_KEY` set (currently the exposed key — **rotate
  + re-set**, see B).
- **CI gotcha fixed:** enabled Settings→Actions→"Allow GitHub Actions to
  create and approve pull requests" (was off → `gh pr create` 403'd the
  first run). API: `actions/permissions/workflow` `can_approve_pull_request_reviews=true`.
- **Dedup fixed:** ranker now dedupes against drafts too, so merging a PR
  moves the next run to a fresh topic (was repeating the top topic).

Remaining housekeeping:
- **Decide PR #1 and #2** — both are the same demo topic; close one/both.
- Cadence is biweekly (odd ISO weeks skipped); next scheduled run is the
  next even-week Monday 14:00 UTC. Trigger anytime: Actions tab → Run workflow.

### B. Security
- **Rotate the Anthropic key** — it was pasted in a chat transcript.
  Then set the new key as the GitHub secret (A.2) and in `~/.seo-aeo.env`.

### C. Off-page authority (the GEO half we don't fully do)
On-page AEO is done well; off-page authority is what makes an engine
*prefer* you. Mostly manual / future "outreach module":
- **Can do in code now:** generate comparison/"vs"/"alternatives" pages
  (use `run --keyword`), fill `config.sameAs[]` with real profile URLs.
- **Manual (or assisted later):** ProductHunt + G2/Capterra listings,
  get into "best X" roundups, genuine Reddit/community presence, reviews.
- `sameAs` for simple-followup is **blocked** — no profile URLs in the
  repo; needs the real X/LinkedIn/ProductHunt links.

### D. Open quality items
- **Images** — never run live (deferred). Needs `GEMINI_API_KEY` + one
  test run. Model id is `gemini-2.5-flash-image`.
- **OG-image gap** — engine sets `frontmatter.image`; simple-followup's
  Article JSON-LD uses a per-post `opengraph-image` route. Reconcile so
  the generated hero is the OG image (or have the engine respect the route).
- `low_keyword_density` is a soft warning on long exact-phrase keywords —
  acceptable, not worth forcing repetition.

### E. The original goal: "all my live projects"
Only simple-followup is wired. Roll the PLAYBOOK out to the other sites
(each: Phase 0 discover → Phase 1 clean sweep → Phase 2 blog if missing →
Phase 3 engine). simple-followup's clean tree + the playbook hardening
(dirty-tree check, "don't redo good work") make this repeatable.

### F. Distribution
- Repo is **private** — make public if other agents should fetch the
  PLAYBOOK by URL. npm publish optional, later.

---

## Gotchas to remember
- simple-followup's working tree was **dirty** (uncommitted blog/layout
  work) — the engine only commits its draft file; don't entangle.
- Engine writes frontmatter + body only; the **consumer blog page emits
  JSON-LD** from frontmatter (Article + FAQPage). Keep them in sync.
- Live measurement (Lighthouse/CWV) needs a free Chrome instance + PSI key;
  if unavailable, do the code-level audit and mark perf **PENDING** — never
  fabricate a score.
