import pc from "picocolors";

import { ProjectConfig } from "../../engine/types.js";
import { AnthropicProvider } from "../../engine/providers/text.js";
import { cronFor } from "../../scheduler/workflow.js";
import { detect } from "../../onboarding/detect.js";
import { interview } from "../../onboarding/interview.js";
import { expand } from "../../onboarding/expand.js";
import { writeArtifacts } from "../../onboarding/write.js";
import { log } from "../../engine/log.js";

export interface InitOptions {
  force: boolean;
}

/** Interactive onboarding: interview → expand → write config + cron. */
export async function runInit(root: string, opts: InitOptions): Promise<void> {
  // Fail fast on a missing key before the interview wastes the user's time.
  if (!process.env.ANTHROPIC_API_KEY) {
    log.error(
      "ANTHROPIC_API_KEY is not set. Export it first (the wizard uses Claude to draft your keyword bank + voice).",
    );
    process.exit(1);
  }

  const detection = detect(root);
  const result = await interview(root, detection);

  const text = new AnthropicProvider();
  const { keywords, voice, feeds } = await expand(result.answers, text);

  // Auto-suggested internal link targets.
  const internalLinkTargets = [
    { url: "/", anchor: result.answers.name },
    { url: "/blog", anchor: "the blog" },
  ];

  const config = ProjectConfig.parse({
    name: result.answers.name,
    siteUrl: result.answers.siteUrl,
    author: result.author,
    layout: result.layout,
    article: { internalLinkTargets },
    icp: {
      primaryRoles: result.answers.audienceRoles
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      companySize: result.answers.companySize,
      pain: result.answers.pain,
    },
    images: { enabled: result.images.enabled, style: result.images.style },
    cadence: { frequency: result.cadence, cron: cronFor(result.cadence) },
  });

  log.step("writing files…");
  const report = await writeArtifacts({
    root,
    config,
    keywords,
    voice,
    feeds,
    force: opts.force,
  });

  if (report.skipped.length) {
    log.warn(
      `Skipped ${report.skipped.length} existing file(s). Re-run with --force to overwrite: ${report.skipped.join(", ")}`,
    );
  }

  // Next steps.
  const secrets = result.images.enabled
    ? "ANTHROPIC_API_KEY and GEMINI_API_KEY"
    : "ANTHROPIC_API_KEY";
  console.log();
  log.ok(pc.bold("Setup complete."));
  console.log(
    [
      "",
      pc.bold("Next steps:"),
      `  1. Review ${pc.cyan(".seo-aeo/voice.md")} and ${pc.cyan(".seo-aeo/keywords.json")} — tweak to taste.`,
      `  2. Add repo secrets in GitHub → Settings → Secrets → Actions: ${pc.cyan(secrets)}.`,
      `  3. Preview your first article locally:  ${pc.cyan("npx seo-aeo run --dry-run")}`,
      `  4. The cron (${pc.cyan(result.cadence)}) is wired in ${pc.cyan(".github/workflows/seo-aeo.yml")} — it opens a PR you merge to publish.`,
      "",
    ].join("\n"),
  );
}
