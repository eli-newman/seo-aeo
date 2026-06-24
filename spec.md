# seo-aeo — Spec

> An npm package that drops into any content-driven site and makes it
> rank in both classic search (SEO) and AI answer engines (AEO/GEO).
> One interactive onboarding, one cron, one human approval — forever.

```bash
npm install -D @elinewman/seo-aeo
npx seo-aeo init      # interview + wire up cron
# ...every week or two, a PR appears with a new optimized article
```

This is the TypeScript/npm productization of the existing Python engine
at `ongoing/seo-aeo-automated`. The pipeline logic, prompts, and AEO
checklist are ported from there; the new surface area is (1) interactive
onboarding, (2) AI image generation with alt text, (3) a portable
weekly/biweekly GitHub Actions cron.

---

## 1. Goals

1. **Zero-config install.** `npx seo-aeo init` inside any repo detects the
   stack, interviews the owner, and writes everything needed — no hand-
   editing of YAML.
2. **Write a real article every 1–2 weeks, forever.** A GitHub Actions
   cron runs the pipeline and opens a PR. Merging publishes.
3. **SEO _and_ AEO.** Every article ships classic SEO meta + on-page
   structure AND AEO/GEO scaffolding (TL;DR quick-answer, citable Q&A,
   FAQ, JSON-LD `Article`/`FAQPage`/`HowTo`, llms.txt-friendly structure).
4. **Optional AI images with alt text.** Toggle in onboarding. Generates
   a hero (+ optional inline) image, writes SEO alt text, drops files in
   the site's public dir, wires them into the MDX.
5. **Human stays in the loop.** Output is a draft PR, never a direct
   publish. The owner reviews the diff and merges.
6. **Portable across all the owner's sites.** Same package, per-repo
   config. Works with any framework that renders MDX/Markdown from a
   content directory (Next.js, Astro, Remix, plain static).

### Non-goals (explicitly out of scope for v1)

- Backlink acquisition / outreach (future).
- Direct-to-production publish without review.
- CMS/DB publishing targets (MDX-into-repo only for v1; architecture
  leaves a `Publisher` interface seam for these later).
- Multi-language content.

---

## 2. Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Publishing target | **MDX/Markdown committed to the repo via PR** | Portable, version-controlled, reviewable, framework-agnostic |
| Cron host | **GitHub Actions** | Free, works regardless of hosting, opens PRs natively |
| Images | **AI-generated, optional per run** | Original, no licensing; alt text written by Claude |
| Text LLM | **Anthropic Claude** | Quality + the owner's default |
| Image LLM | **Google Gemini** (image generation) | Already the owner's image stack; pluggable behind `ImageProvider` |
| Language/runtime | **TypeScript, ESM, Node ≥ 20** | Owner's primary stack; drops into JS repos |
| Cadence | **Configurable: weekly / biweekly** (cron expr) | Matches "every week or 2" |
| Config format | **`seo-aeo.config.json`** + `.seo-aeo/{keywords.json,voice.md}` | JSON for tooling; voice as prose markdown |

---

## 3. Architecture

```
@elinewman/seo-aeo (the package)
│
├── CLI  (bin: seo-aeo)
│   ├── init       interactive onboarding wizard
│   ├── run        generate ONE article (--dry-run | --real)
│   ├── approve    move draft → posts, commit (used by review flow / manual)
│   └── list       list drafts/posts and their status
│
├── engine/  (the pipeline — ported from Python)
│   ingest → rank → outline → write → seoPass → aeoPass → images → audit → publish
│
├── onboarding/  detect stack · interview · LLM-expand answers → config
│
└── scheduler/   emit .github/workflows/seo-aeo.yml
```

### 3.1 Pipeline stages

Each stage is `(article, ctx) => Promise<article>` over a single `Article`
object. The MDX file is only materialized at `publish`.

1. **ingest** — fetch RSS items from configured feeds (optional; if no
   feeds, ranker works off the keyword bank alone — "evergreen mode").
2. **rank** — score `(feedItem × keyword)` candidates with Claude; pick
   the highest-intent topic not already covered (dedupe against existing
   slugs in `posts/`).
3. **outline** — Claude drafts a structured `Outline` with AEO scaffolding
   (TL;DR quick-answer, H2 sections, FAQ, optional HowTo / comparison).
4. **write** — Claude drafts 1100–2000 words in the project voice.
5. **seoPass** — title (≤60), meta description (≤155), slug, keyword
   placement, internal links, heading hygiene.
6. **aeoPass** — quick-answer block, citable self-contained Q&A, FAQ,
   JSON-LD blocks (`Article`, `FAQPage`, `HowTo` when relevant).
7. **images** *(optional)* — Gemini generates hero (+ inline) images;
   Claude writes alt text; files saved to `<public>/blog/<slug>/`;
   `<img>`/markdown injected into the MDX.
8. **audit** — programmatic SEO + AEO scoring (port of `audit.py`,
   reuses the `seo-audit` / `geo-audit` heuristics). Fails the run if
   below thresholds (configurable), with one self-repair retry.
9. **publish** — render MDX (frontmatter + body + JSON-LD), write to
   `content/drafts/<slug>.mdx`, create branch, commit, open PR via `gh`.

### 3.2 Provider seams (interfaces)

- `TextProvider` — `outline/draft/seo/aeo/rank/alt-text` calls. Impl:
  `AnthropicProvider`.
- `ImageProvider` — `generate(prompt) => bytes`. Impl: `GeminiProvider`.
  `NullImageProvider` when images disabled.
- `Publisher` — `writeDraft(article) => PR`. Impl: `RepoPublisher` (MDX +
  `gh`). Seam reserved for `DatabasePublisher` / `CmsPublisher` later.

---

## 4. Data models (zod schemas — port of `engine/models.py`)

- **ProjectConfig** — name, siteUrl, contentDir (drafts/posts paths),
  article settings (word counts, includeFaq/howTo/table, internalLinks),
  icp, llm (models, maxTokens, temperature), images (enabled, provider,
  count, style), audit thresholds, cadence (cron).
- **KeywordTarget** — keyword, intent (informational|commercial|
  transactional|navigational), volume?, difficulty?, notes.
- **FeedItem** — title, link, summary, published?, source.
- **Topic** — feedItem?, keyword, angle, score, reason.
- **Outline** — workingTitle, targetKeyword, targetWordCount, tldr,
  sections[{heading, bullets, includeTable, includeHowTo}], faqs.
- **ArticleFrontmatter** — title, description(≤180), date, author,
  keywords[], faqs[{q,a}], image?, draft.
- **Article** — slug, frontmatter, body(MDX), jsonLdBlocks[], images[],
  wordCount, stagesCompleted[]; `toMdx()`.
- **AuditResult** — seoScore, aeoScore, findings[{level,rule,message}],
  passed.

Frontmatter schema is **detected per repo** during onboarding (read an
existing post if present) so the engine matches the consumer's blog
loader — never guess the schema.

---

## 5. Onboarding flow (`seo-aeo init`)

1. **Detect** — framework (next/astro/remix/static via package.json +
   file markers), content directory (scan for `content/**`, `posts/**`,
   `src/content/**`, existing `*.mdx`), public dir, and — if a sample
   post exists — its frontmatter schema.
2. **Interview** (@clack/prompts), with smart defaults from detection:
   - Site URL
   - One-paragraph "what this site/product does"
   - Audience / ICP (roles, company size, core pain)
   - Tone (pick presets or describe) + competitors (optional)
   - Cadence: weekly | biweekly
   - Images: on/off (+ style hint if on)
   - Internal link targets (auto-suggest `/`, `/blog`, pricing)
3. **Expand** — Claude turns the answers into:
   - `.seo-aeo/keywords.json` — a starter long-tail keyword bank
     (intent-tagged, conservative volume/difficulty estimates)
   - `.seo-aeo/voice.md` — a voice & tone guide + do-not-say list
     (modeled on the simple-followup `voice.md`)
   - `.seo-aeo/feeds.json` — suggested RSS sources (optional)
4. **Write** — `seo-aeo.config.json`, the `.seo-aeo/*` files, and
   `.github/workflows/seo-aeo.yml` (cron from cadence).
5. **Print next steps** — set repo secrets `ANTHROPIC_API_KEY` and (if
   images) `GEMINI_API_KEY`; review `.seo-aeo/voice.md`; run
   `npx seo-aeo run --dry-run` to preview the first article.

Re-running `init` is idempotent (updates, never clobbers edits without
`--force`).

---

## 6. CLI surface

```
seo-aeo init                 # onboarding wizard
seo-aeo run [--dry-run]      # generate one article (dry = no PR, writes to .seo-aeo/preview/)
seo-aeo run --no-images      # override images for this run
seo-aeo approve <slug>       # draft → posts, commit
seo-aeo list                 # show drafts + posts
seo-aeo --version | --help
```

Programmatic API: `import { runOnce, loadConfig } from '@elinewman/seo-aeo'`.

---

## 7. The cron (GitHub Actions)

`.github/workflows/seo-aeo.yml`:
- `schedule: cron` from cadence (weekly: `0 14 * * 1`, biweekly: gated by
  ISO-week parity check in the job).
- `workflow_dispatch` for manual runs.
- Steps: checkout → setup node → `npx seo-aeo run` → the run opens a PR
  via `peter-evans/create-pull-request` (or `gh`). Secrets:
  `ANTHROPIC_API_KEY`, optional `GEMINI_API_KEY`.

---

## 8. Quality gates (Definition of Done)

- `npm run build` (tsup) clean
- `npm run lint` (eslint) + `npm run typecheck` (tsc --noEmit) clean
- `npm test` (vitest) green — unit tests on rank/audit/mdx-render/config,
  and a mocked end-to-end `runOnce` with stubbed providers
- `seo-aeo run --dry-run` against a fixture repo produces a valid MDX file
  that passes the bundled audit
- No secrets committed; providers read from env

---

## 9. Milestones (see todo.md)

M0 spec+todo · M1 foundation (build/lint/types green) · M2 onboarding ·
M3 pipeline port · M4 images · M5 cron+CLI+docs+e2e.
