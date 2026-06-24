# seo-aeo — todo

Atomic tasks, grouped by milestone. Check off as completed. Commit after
each milestone.

## M0 — Spec & plan
- [x] spec.md
- [x] todo.md

## M1 — Foundation (must build/lint/typecheck/test before any more code)
- [ ] `package.json` — ESM, `bin: { "seo-aeo": "dist/cli/index.js" }`, scripts
- [ ] `tsconfig.json` (NodeNext, strict), `tsup.config.ts`, `vitest.config.ts`
- [ ] eslint + prettier config
- [ ] `src/engine/types.ts` — zod schemas (port of models.py)
- [ ] `src/engine/config.ts` — load + validate `seo-aeo.config.json` and `.seo-aeo/*`
- [ ] `src/engine/log.ts` — tiny logger (picocolors)
- [ ] `src/index.ts` — programmatic exports
- [ ] `src/cli/index.ts` — commander skeleton (commands stubbed)
- [ ] smoke test: `config.test.ts` parses a fixture config
- [ ] **GATE:** build + lint + typecheck + test all green → commit

## M2 — Onboarding (`seo-aeo init`)
- [ ] `src/onboarding/detect.ts` — framework, content dir, public dir, frontmatter schema
- [ ] `src/onboarding/interview.ts` — @clack/prompts flow with detection defaults
- [ ] `src/onboarding/expand.ts` — Claude → keywords.json, voice.md, feeds.json
- [ ] `src/onboarding/write.ts` — write config + `.seo-aeo/*` + workflow (idempotent, `--force`)
- [ ] `src/cli/commands/init.ts` — wire it together
- [ ] tests: detect on next/astro fixtures; write is idempotent

## M3 — Pipeline port
- [ ] `src/engine/providers/text.ts` — `TextProvider` + `AnthropicProvider`
- [ ] `src/engine/prompts.ts` — port `_prompts.py`
- [ ] `src/engine/pipeline/ingest.ts` — rss-parser (optional feeds)
- [ ] `src/engine/pipeline/rank.ts` — topic×keyword scoring + slug dedupe
- [ ] `src/engine/pipeline/outline.ts`
- [ ] `src/engine/pipeline/write.ts`
- [ ] `src/engine/pipeline/seoPass.ts`
- [ ] `src/engine/pipeline/aeoPass.ts` — quick-answer, citable Q&A, JSON-LD
- [ ] `src/engine/pipeline/audit.ts` — SEO+AEO scoring + 1 self-repair retry
- [ ] `src/engine/pipeline/publish.ts` — `RepoPublisher`: render MDX, branch, commit, PR
- [ ] `src/engine/runOnce.ts` — orchestrate stages
- [ ] `src/cli/commands/run.ts`, `approve.ts`, `list.ts`
- [ ] tests: rank, audit, mdx render, mocked runOnce

## M4 — AI images + alt text
- [ ] `src/engine/providers/image.ts` — `ImageProvider`, `GeminiProvider`, `NullImageProvider`
- [ ] `src/engine/pipeline/images.ts` — gen hero(+inline), alt text, save to public, inject MDX
- [ ] frontmatter `image` field wired; JSON-LD `image` populated
- [ ] test: images stage with stubbed provider injects valid markup

## M5 — Cron + docs + e2e
- [ ] `src/scheduler/workflow.ts` — emit `.github/workflows/seo-aeo.yml` (weekly/biweekly)
- [ ] biweekly ISO-week parity gate in the workflow
- [ ] `README.md` — quickstart, config reference, secrets, FAQ
- [ ] fixture-repo e2e: `run --dry-run` produces audit-passing MDX
- [ ] **GATE:** full build + lint + typecheck + test green → tag v0.1.0

## Backlog (post-v1)
- [ ] DatabasePublisher / CmsPublisher behind the `Publisher` seam
- [ ] Backlink/outreach module
- [ ] GSC integration to replace estimated keyword volumes with real data
- [ ] Internal-link graph optimization across the whole post corpus
