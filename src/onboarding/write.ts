/**
 * Write the onboarding artifacts into the consumer repo: the config file,
 * the `.seo-aeo/` state (keywords/voice/feeds), and the GitHub Actions
 * workflow. Idempotent — existing files are preserved unless `force`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { ProjectConfig, type KeywordTarget } from "../engine/types.js";
import { CONFIG_FILENAME, STATE_DIR } from "../engine/config.js";
import { workflowYaml } from "../scheduler/workflow.js";
import { log } from "../engine/log.js";

export interface WriteInput {
  root: string;
  config: ProjectConfig;
  keywords: KeywordTarget[];
  voice: string;
  feeds: string[];
  force: boolean;
}

export interface WriteReport {
  written: string[];
  skipped: string[];
}

async function writeFileSafe(
  file: string,
  content: string,
  force: boolean,
  report: WriteReport,
  root: string,
): Promise<void> {
  const rel = path.relative(root, file);
  if (existsSync(file) && !force) {
    report.skipped.push(rel);
    log.dim(`  skip (exists): ${rel}`);
    return;
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
  report.written.push(rel);
  log.ok(`  wrote ${rel}`);
}

export async function writeArtifacts(input: WriteInput): Promise<WriteReport> {
  const { root, config, keywords, voice, feeds, force } = input;
  const report: WriteReport = { written: [], skipped: [] };

  // Validate the config round-trips before writing.
  const validated = ProjectConfig.parse(config);

  await writeFileSafe(
    path.join(root, CONFIG_FILENAME),
    JSON.stringify(validated, null, 2) + "\n",
    force,
    report,
    root,
  );

  await writeFileSafe(
    path.join(root, STATE_DIR, "keywords.json"),
    JSON.stringify({ keywords }, null, 2) + "\n",
    force,
    report,
    root,
  );

  await writeFileSafe(
    path.join(root, STATE_DIR, "voice.md"),
    voice.trim() + "\n",
    force,
    report,
    root,
  );

  await writeFileSafe(
    path.join(root, STATE_DIR, "feeds.json"),
    JSON.stringify({ feeds }, null, 2) + "\n",
    force,
    report,
    root,
  );

  await writeFileSafe(
    path.join(root, ".github", "workflows", "seo-aeo.yml"),
    workflowYaml(config.cadence),
    force,
    report,
    root,
  );

  return report;
}
