# Measuring SEO + Performance (the Phase 1 grader)

> Turns the on-site clean sweep from "eyeball a checklist" into scored,
> gated work. **Baseline before you change anything → fix → re-measure at
> the gate.** Performance is part of SEO: Core Web Vitals are a confirmed
> Google ranking factor, so this recipe covers both.

This uses the **Chrome DevTools MCP** tools. If your agent doesn't have
them, fall back to the public PageSpeed Insights API (URL at the bottom) or
the `lighthouse` npm CLI — the thresholds and the baseline→gate flow are
the same.

## You need a running site

Lighthouse and the performance trace audit a **rendered URL**. Point them
at either:

- a **local dev/preview build** — prefer `npm run build && npm run start`
  (production build) over `npm run dev`; dev mode reports misleading perf, or
- the **live deployed URL**.

Audit on **mobile** — that's what Google ranks on. Run desktop too if you
want, but mobile is the one that counts.

## Step 1 — Lighthouse (SEO, Accessibility, Best Practices)

```
lighthouse_audit({ device: "mobile", mode: "navigation",
                   outputDirPath: ".seo-aeo/reports" })
```

- `mode: "navigation"` reloads and does a full audit (the real score).
  `snapshot` only grades the current DOM — use it after JS-driven changes.
- Read the **SEO** category first (it maps almost 1:1 to the Phase 1
  checklist: titles, meta descriptions, crawlability, valid structured
  data, tap targets, `hreflang`). Then **Best Practices** and
  **Accessibility**.

> Lighthouse does **not** measure performance via this tool — that's Step 2.
> It also can't see AEO (`llms.txt`, AI-crawler rules, citability) — those
> stay manual checklist items.

## Step 2 — Performance trace (Core Web Vitals)

Navigate first, then trace (the trace reloads the page itself):

```
navigate_page({ type: "url", url: "<the URL>" })
performance_start_trace({ reload: true, autoStop: true,
                          filePath: ".seo-aeo/reports/trace.json.gz" })
# (autoStop ends it after load; otherwise performance_stop_trace)
performance_analyze_insight({ insightSetId: "<from results>",
                              insightName: "LCPBreakdown" })
```

Pull the insights that matter and act on the worst ones. Common ones:
`LCPBreakdown`, `RenderBlocking`, `DocumentLatency`, `CLSCulprits`,
`ImageDelivery`, `ThirdParties`.

### Core Web Vitals thresholds (mobile, "good" bar)

| Metric | Good | What fixes it |
|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5 s | optimize/preload the hero image, cut render-blocking CSS/JS, fast server/CDN |
| **INP** (Interaction to Next Paint) | ≤ 200 ms | reduce main-thread JS, break up long tasks, defer third-parties |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | set width/height on images & embeds, reserve ad/iframe space, `font-display: swap` |

Supporting: **FCP** ≤ 1.8 s, **TTFB** ≤ 0.8 s.

## Step 3 — Record baseline, fix, re-measure

1. **Baseline:** run Steps 1–2 *before* editing. Save scores to the report.
2. **Fix:** work the [on-site checklist](../checklists/onsite-seo-aeo.md).
   Most perf wins are the framework's optimized image component, lazy-load,
   `next/font`/`font-display`, and removing render-blocking/third-party JS.
3. **Re-measure at the gate:** re-run Steps 1–2. Put before/after in the
   report.

## Phase 1 gate targets

Aim for (mobile, production build):

- Lighthouse **SEO ≥ 95**, **Best Practices ≥ 90**, **Accessibility ≥ 90**
- **LCP ≤ 2.5 s**, **CLS ≤ 0.1**, **INP ≤ 200 ms**

If a target is blocked by something out of scope (slow host, heavy required
third-party), **say so in the report** rather than silently passing — note
the metric, the cause, and the recommended fix.

## No MCP tools? Fallbacks (in order of reliability)

1. **Chrome DevTools MCP** `lighthouse_audit` — best, but needs a free
   Chrome instance. If it errors with "browser is already running / profile
   locked," another Chrome holds the profile; close it or skip to the CLI.
2. **PageSpeed Insights API** — no install, audits a *public* URL. The
   anonymous quota is small and shared, so add `&key=<PSI_API_KEY>` (free
   from Google Cloud) for real use:
   `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<URL>&strategy=mobile&key=<KEY>`
3. **Lighthouse CLI:** `npx lighthouse <URL> --form-factor=mobile --output=json --output-path=.seo-aeo/reports/lh.json --chrome-flags="--headless=new"` (also needs Chrome).

**If none are available**, don't fake a pass. Do the **code-level audit**
(read the metadata/JSON-LD/image/font setup directly) and mark live
performance as **PENDING** in the report, with a note to run the audit once
a browser/PSI key is available. An honest "measurement pending" beats a
fabricated score.
