#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

import { VERSION } from "../index.js";
import { log } from "../engine/log.js";

/**
 * Load ~/.seo-aeo.env (and ./.env) into process.env without a dep, so the
 * documented "put your key in ~/.seo-aeo.env" flow actually works. Existing
 * env vars win — never override what's already set (e.g. CI secrets).
 */
function loadEnvFiles(): void {
  const files = [
    path.join(os.homedir(), ".seo-aeo.env"),
    path.join(process.cwd(), ".env"),
  ];
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1]!;
      if (process.env[key]) continue;
      process.env[key] = m[2]!.replace(/^['"]|['"]$/g, "");
    }
  }
}

loadEnvFiles();

const program = new Command();

program
  .name("seo-aeo")
  .description(
    "SEO + AEO content engine — writes an optimized article for your site every week or two, forever.",
  )
  .version(VERSION);

program
  .command("init")
  .description("Interactive onboarding: interview + wire up the cron")
  .option("-f, --force", "overwrite existing config/state files", false)
  .action(async (opts: { force: boolean }) => {
    const { runInit } = await import("./commands/init.js");
    await runInit(process.cwd(), opts);
  });

program
  .command("run")
  .description("Generate one article")
  .option("--dry-run", "write a preview locally, do not open a PR", false)
  .option("--no-images", "skip image generation for this run")
  .option(
    "-k, --keyword <phrase>",
    'target a specific keyword instead of auto-ranking (e.g. "tool A vs tool B")',
  )
  .action(
    async (opts: { dryRun: boolean; images: boolean; keyword?: string }) => {
      const { runCommand } = await import("./commands/run.js");
      await runCommand(process.cwd(), opts);
    },
  );

program
  .command("approve")
  .argument("<slug>", "slug of the draft to approve")
  .description("Move a draft into posts/ and commit")
  .action(async (slug: string) => {
    const { runApprove } = await import("./commands/approve.js");
    await runApprove(process.cwd(), slug);
  });

program
  .command("list")
  .description("List drafts and posts")
  .action(async () => {
    const { runList } = await import("./commands/list.js");
    await runList(process.cwd());
  });

program
  .command("install-skills")
  .description(
    "Install the guided /seo-aeo skill suite into this project's .claude/skills",
  )
  .option("-g, --global", "install into ~/.claude/skills instead", false)
  .option("-f, --force", "overwrite existing skill dirs", false)
  .action(async (opts: { global: boolean; force: boolean }) => {
    const { runInstallSkills } = await import("./commands/install-skills.js");
    await runInstallSkills(process.cwd(), opts);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
