import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { log } from "../../engine/log.js";

export interface InstallSkillsOptions {
  /** Install into ~/.claude/skills instead of <repo>/.claude/skills. */
  global: boolean;
  /** Overwrite existing skill dirs. */
  force: boolean;
}

/** Resolve the bundled `skills/` dir, which ships alongside `dist/`. */
function skillsSourceDir(): string {
  // This file is bundled into dist/cli/index.js → package root is two up.
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "skills");
}

/** Copy the seo-aeo skill suite into a project's (or global) .claude/skills. */
export async function runInstallSkills(
  root: string,
  opts: InstallSkillsOptions,
): Promise<void> {
  const src = skillsSourceDir();
  if (!existsSync(src)) {
    log.error(`Could not find the bundled skills at ${src}.`);
    process.exit(1);
  }

  const dest = opts.global
    ? path.join(os.homedir(), ".claude", "skills")
    : path.join(root, ".claude", "skills");
  await mkdir(dest, { recursive: true });

  const skills = (await readdir(src, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let installed = 0;
  let skipped = 0;
  for (const name of skills) {
    const target = path.join(dest, name);
    if (existsSync(target) && !opts.force) {
      log.dim(`  skip (exists): ${name}`);
      skipped++;
      continue;
    }
    await cp(path.join(src, name), target, { recursive: true });
    log.ok(`  installed ${name}`);
    installed++;
  }

  log.info(
    `${installed} skill(s) installed${skipped ? `, ${skipped} skipped (use --force to overwrite)` : ""} → ${dest}`,
  );
  log.info("Run /seo-aeo in this project to start the guided setup.");
}
