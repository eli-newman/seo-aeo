#!/usr/bin/env node
import { Command } from "commander";

import { VERSION } from "../index.js";
import { log } from "../engine/log.js";

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
  .action(async (opts: { dryRun: boolean; images: boolean }) => {
    const { runCommand } = await import("./commands/run.js");
    await runCommand(process.cwd(), opts);
  });

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

program.parseAsync(process.argv).catch((err: unknown) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
