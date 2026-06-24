# seo-aeo — todo

Atomic tasks, grouped by milestone. Commit after each milestone.

**Status: M0–M5 complete (v0.1.0).** Build + lint + typecheck + 16 tests
green. Onboarding, full content+image pipeline, cron, and CLI all shipped.

## M0 — Spec & plan
- [x] spec.md
- [x] todo.md

## M1 — Foundation (must build/lint/typecheck/test before any more code)
- [x] `package.json` — ESM, `bin: { "seo-aeo": "dist/cli/index.js" }`, scripts
- [x] `tsconfig.json` (NodeNext, strict), `tsup.config.ts`, `vitest.config.ts`
- [x] eslint + prettier config
- [x] `src/engine/types.ts` — zod schemas (port of models.py)
- [x] `src/engine/config.ts` — load + validate `seo-aeo.config.json` and `.seo-aeo/*`
- [x] `src/engine/log.ts` — tiny logger (picocolors)
- [x] `src/index.ts` — programmatic exports
- [x] `src/cli/index.ts` — commander skeleton (commands stubbed)
- [x] smoke test: `config.test.ts` parses a fixture config
- [x] **GATE:** build + lint + typecheck + test all green → commit

## M2 — Onboarding (`seo-aeo init`)
- [x] `src/onboarding/detect.ts` — framework, content dir, public dir, frontmatter schema
- [x] `src/onboarding/interview.ts` — @clack/prompts flow with detection defaults
- [x] `src/onboarding/expand.ts` — Claude → keywords.json, voice.md, feeds.json
- [x] `src/onboarding/write.ts` — write config + `.seo-aeo/*` + workflow (idempotent, `--force`)
- [x] `src/cli/commands/init.ts` — wire it together
- [x] tests: detect on next/astro fixtures; write is idempotent

## M3 — Pipeline port
- [x] `src/engine/providers/text.ts` — `TextProvider` + `AnthropicProvider`
- [x] `src/engine/prompts.ts` — port `_prompts.py`
- [x] `src/engine/pipeline/ingest.ts` — rss-parser (optional feeds)
- [x] `src/engine/pipeline/rank.ts` — topic×keyword scoring + slug dedupe
- [x] `src/engine/pipeline/outline.ts`
- [x] `src/engine/pipeline/write.ts`
- [x] `src/engine/pipeline/seoPass.ts`
- [x] `src/engine/pipeline/aeoPass.ts` — quick-answer, citable Q&A, JSON-LD
- [x] `src/engine/pipeline/audit.ts` — SEO+AEO scoring + 1 self-repair retry
- [x] `src/engine/pipeline/publish.ts` — `RepoPublisher`: render MDX, branch, commit, PR
- [x] `src/engine/runOnce.ts` — orchestrate stages
- [x] `src/cli/commands/run.ts`, `approve.ts`, `list.ts`
- [x] tests: rank, audit, mdx render, mocked runOnce

## M4 — AI images + alt text
- [x] `src/engine/providers/image.ts` — `ImageProvider`, `GeminiProvider`, `NullImageProvider`
- [x] `src/engine/pipeline/images.ts` — gen hero(+inline), alt text, save to public, inject MDX
- [x] frontmatter `image` field wired; JSON-LD `image` populated
- [x] test: images stage with stubbed provider injects valid markup

## M5 — Cron + docs + e2e
- [x] `src/scheduler/workflow.ts` — emit `.github/workflows/seo-aeo.yml` (weekly/biweekly)
- [x] biweekly ISO-week parity gate in the workflow
- [x] `README.md` — quickstart, config reference, secrets, FAQ
- [x] fixture-repo e2e: `run --dry-run` produces audit-passing MDX
- [x] **GATE:** full build + lint + typecheck + test green → tag v0.1.0

## Backlog (post-v1)
- [ ] DatabasePublisher / CmsPublisher behind the `Publisher` seam
- [ ] Backlink/outreach module
- [ ] GSC integration to replace estimated keyword volumes with real data
- [ ] Internal-link graph optimization across the whole post corpus
