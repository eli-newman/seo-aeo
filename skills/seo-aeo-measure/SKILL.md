---
name: seo-aeo-measure
description: Score a site's SEO, accessibility, best-practices, and Core Web Vitals with Lighthouse + a performance trace, on mobile. Use to baseline before SEO fixes and to verify after, or whenever the user wants Lighthouse/PageSpeed/Core Web Vitals numbers for a URL.
---

# seo-aeo-measure

Turn "is this site fast/optimized?" into real scores. **Performance is SEO** —
Core Web Vitals are a Google ranking factor — so measure both halves, on
**mobile**, against a **production build or the live URL** (dev-mode perf lies).

See [MEASURE.md](MEASURE.md) for the full tool flow, thresholds, and fallbacks.

## Quick flow

1. **Lighthouse** (SEO / A11y / Best-practices): Chrome DevTools MCP
   `lighthouse_audit({device:"mobile", mode:"navigation"})`. Read the **SEO**
   category first.
2. **Performance trace** (Core Web Vitals): `performance_start_trace` →
   `performance_analyze_insight` (LCPBreakdown, RenderBlocking, CLSCulprits…).
3. **Fallbacks if no Chrome:** PageSpeed Insights API (`&key=<PSI_KEY>` for
   quota) or `npx lighthouse <URL> --form-factor=mobile`. If none work, do the
   **code-level audit** and mark live perf **PENDING — never fabricate a score**.

## Targets (mobile, "good")

- Lighthouse **SEO ≥ 95**, Best-practices ≥ 90, Accessibility ≥ 90
- **LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1**

## Gate

Baseline (or post-fix) scores captured and recorded for the report. Out-of-scope
misses (slow host, required heavy third-party) are noted with cause + fix, not
silently passed.
