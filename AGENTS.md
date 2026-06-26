# AGENTS.md — seo-aeo

The single entry point. If you are an AI coding agent and a user pointed you
at this repo, read this, then execute the runbook.

## What this is

A methodology + Claude Code skills + an npm CLI that an agent runs **on a
user's own website** to (1) make it rank in Google AND get cited by AI answer
engines (ChatGPT, Claude, Perplexity, Gemini, AI Overviews), and (2) optionally
automate a recurring optimized article via GitHub Actions.

## Your job (if a user said "optimize my site")

Execute **[PLAYBOOK.md](PLAYBOOK.md)** against **their** repo — the current
working directory is usually *their* project, not this package. Follow the
phases in order, run each gate, stop at the checkpoints. **Start at Phase 0.**

Claude Code users: the same workflow is installable as skills — run
`/seo-aeo` (see [skills/](skills/)).

## Safety contract (non-negotiable)

Reversibility-weighted: the harder an action is to undo, the more it needs the
user's explicit OK. Deny-first; when unsure, ask.

- **Branch only.** `git checkout -b seo-aeo/optimize`. Never commit to the
  default branch, **never auto-push**, never force-push the user's work.
- **Dirty tree → STOP** and surface it. Don't entangle your changes with the
  user's uncommitted work; stage only files you created.
- **Dry-run / preview first** for anything generative; show what you'll change
  before applying.
- **Stay in scope.** Touch only SEO/AEO-relevant files. Never write into
  `.gitignore`d or build dirs, never `../` out of the project root.
- **Inventory before you change.** Only fix real gaps — "already good" is a
  valid finding, not a reason to churn.
- **Keys:** Phases 0–2 need none. Phase 3 (automation) needs keys the user
  provides; never print or commit them.
- **Verify before claiming done:** build + typecheck + render. If you can't
  verify (e.g. live perf without a browser), say PENDING — never fake a pass.

(Vocabulary follows Anthropic's security model + the OpenSSF guide for AI
code-assistant instructions.)

## Build/test (only if you're editing THIS package, not a user's site)

```bash
npm install
npm run check   # typecheck + lint + test
```

## Where things are

- `PLAYBOOK.md` — the runbook you execute (start here)
- `skills/` — the same workflow as invokable Claude Code skills (`/seo-aeo`)
- `recipes/` — per-stack blog scaffolds + the frontmatter contract
- `checklists/onsite-seo-aeo.md` — the Phase 1 on-site checklist
- `src/`, `package.json` — the npm engine (the recurring-article CLI)
