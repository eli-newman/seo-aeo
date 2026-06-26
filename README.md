# @elinewman/seo-aeo

> Drop-in SEO **and** AEO content engine. Run one command, answer a few
> questions, and your site gets a well-optimized article every week or
> two — forever — as a pull request you review and merge.

Built for any content-driven repo (Next.js, Astro, Remix, static).

## Three ways to use it

### 1. Guided skill suite — `/seo-aeo` (easiest, < 10 min hands-on)

Install the skill suite into any project, then let the orchestrator walk you
through the whole thing with gates and checkpoints:

```bash
npx -y github:eli-newman/seo-aeo install-skills   # → .claude/skills/
# then, in your agent:
/seo-aeo
```

`/seo-aeo` front-loads every decision up front (keys, cadence), then runs
8 gated phases on its own: **preflight → discover → measure → on-site fix →
build blog (if missing) → engine → verify**. Each is also a standalone skill
(`/seo-aeo-measure`, `/seo-aeo-onsite`, …) you can run à la carte.

### 2. Hand it to your coding agent (the raw playbook)

The site doesn't even need a blog yet. Point your agent (Claude Code,
Cursor, Copilot…) at the repo and the **[PLAYBOOK](./PLAYBOOK.md)**:

> "Make this site SEO and AEO optimized — follow
> `node_modules/@elinewman/seo-aeo/PLAYBOOK.md`. Do Phases 0–2 now (no keys
> needed) and give me the report. If I paste an `ANTHROPIC_API_KEY` and a
> GitHub token, also do Phase 3."

The agent then runs, on its own:

- **Phase 0 — Discover:** detect the stack, find whether a blog exists.
- **Phase 1 — Clean sweep:** fix on-site SEO + AEO (metadata, sitemap,
  robots, JSON-LD, **`llms.txt`**, AI-crawler rules, CWV) — pure code, no keys.
- **Phase 2 — Build the blog** *if missing*, tailored to the stack
  (per-stack [recipes](./recipes/) + a shared [frontmatter contract](./recipes/frontmatter-contract.md)).
- **Phase 3 — Automate** (needs the 2 keys): wire the recurring engine below.

### 3. Run the engine directly (if you already have a blog)

```bash
npm install -D @elinewman/seo-aeo
npx seo-aeo init            # interview + wire up the cron
npx seo-aeo run --dry-run   # preview the first article locally
```

---

## What it does

Every run, the engine:

1. **Ingests** fresh RSS items (optional — works fine without feeds).
2. **Ranks** topics against your keyword bank (deterministic, no LLM) and
   picks the highest-intent one you haven't covered yet.
3. **Outlines** with AEO scaffolding (a citable quick-answer, Q&A, FAQ).
4. **Writes** 1,100–2,000 words in *your* brand voice.
5. **SEO pass** — title, meta description, slug, keyword placement,
   internal links, heading hygiene.
6. **AEO pass** — quick-answer block, citable self-contained sections,
   JSON-LD (`Article` / `FAQPage` / `HowTo`).
7. **Images** *(optional)* — generates a hero + inline images and writes
   SEO alt text for each.
8. **Audits** the result on SEO + AEO heuristics, with one self-repair
   pass. Below threshold? It flags it instead of shipping junk.
9. **Publishes** the MDX as a draft and opens a **pull request**. You
   review the diff and merge to publish. Nothing goes live unattended.

The cron is a **GitHub Actions** workflow, so it runs regardless of where
the site is hosted.

## Why both SEO and AEO?

Classic SEO gets you ranked in Google. **AEO** (Answer-Engine
Optimization, a.k.a. GEO) gets you *cited* by ChatGPT, Claude, Perplexity,
and Google AI Overviews. Every article ships structured for both: clean
heading hierarchy, a quotable quick-answer, self-contained section
answers, FAQ, and JSON-LD.

## Setup

### 1. Install + onboard

```bash
npm install -D @elinewman/seo-aeo
npx seo-aeo init
```

The wizard detects your framework and content directory, interviews you
about the site/audience/voice, then uses Claude to generate a starter
keyword bank (`.seo-aeo/keywords.json`) and a voice guide
(`.seo-aeo/voice.md`). It writes `seo-aeo.config.json` and the cron at
`.github/workflows/seo-aeo.yml`.

> `init` needs `ANTHROPIC_API_KEY` in your environment (it drafts the
> keyword bank + voice with Claude).

### 2. Add repo secrets

In **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Required | Used for |
|---|---|---|
| `ANTHROPIC_API_KEY` | always | writing the article |
| `GEMINI_API_KEY` | only if images are on | generating images |

`GITHUB_TOKEN` is provided automatically and is what opens the PR.

### 3. Preview, then let it run

```bash
npx seo-aeo run --dry-run   # writes .seo-aeo/preview/<slug>.mdx, no PR
```

Once you're happy, do nothing — the cron opens a PR on your chosen
cadence. Merge it to publish.

## Commands

| Command | What it does |
|---|---|
| `seo-aeo init [--force]` | Onboarding wizard. `--force` overwrites existing files. |
| `seo-aeo run [--dry-run] [--no-images]` | Generate one article. Dry-run writes a local preview instead of a PR. |
| `seo-aeo approve <slug>` | Move a draft into `posts/` and commit (manual approve). |
| `seo-aeo list` | List drafts and published posts. |

## Configuration

`seo-aeo.config.json` (abbreviated — see `spec.md` for the full schema):

```jsonc
{
  "name": "Your Site",
  "siteUrl": "https://yoursite.com",
  "layout": {
    "framework": "next",
    "draftsPath": "content/drafts",
    "postsPath": "content/blog",
    "publicPath": "public",
    "publicUrlBase": "/blog"
  },
  "article": {
    "targetWordCount": 1500,
    "minWordCount": 1100,
    "maxWordCount": 2000,
    "internalLinkTargets": [{ "url": "/", "anchor": "Your Site" }]
  },
  "icp": { "primaryRoles": ["..."], "companySize": "...", "pain": "..." },
  "images": { "enabled": true, "inlineCount": 1, "style": "..." },
  "audit": { "seoMinScore": 80, "aeoMinScore": 75 },
  "cadence": { "frequency": "biweekly", "cron": "0 14 * * 1" }
}
```

Editable companion files in `.seo-aeo/`:

- **`keywords.json`** — your keyword bank. Refine intent/volume/difficulty
  as you get real data from Google Search Console.
- **`voice.md`** — the brand voice every article must match. Edit freely.
- **`feeds.json`** — optional RSS sources for riding trending topics.

## Cadence

- **weekly** → runs every Monday.
- **biweekly** → runs every other Monday (gated by ISO-week parity inside
  the workflow, since GitHub cron can't express "every 2 weeks").

Trigger a run anytime from the Actions tab (`workflow_dispatch`).

## Programmatic use

```ts
import { createContext, runOnce } from "@elinewman/seo-aeo";

const ctx = await createContext(process.cwd());
const { article, audit } = await runOnce(ctx, { dryRun: true });
console.log(audit.passed, article.slug);
```

## Roadmap

- Database / CMS publishing targets (behind the existing `Publisher` seam)
- Backlink / outreach module
- Google Search Console integration to replace estimated keyword metrics
- Cross-corpus internal-link optimization

## License

MIT
