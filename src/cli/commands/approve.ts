import { execa } from "execa";

import { loadProject } from "../../engine/config.js";
import { promote } from "../../engine/pipeline/publish.js";
import { log } from "../../engine/log.js";
import path from "node:path";
import { existsSync } from "node:fs";

/** Move a draft into posts/ and commit. */
export async function runApprove(root: string, slug: string): Promise<void> {
  const { config } = await loadProject(root);
  const dst = await promote(root, slug, config);
  log.ok(`promoted → ${path.relative(root, dst)}`);

  if (existsSync(path.join(root, ".git"))) {
    await execa("git", ["-C", root, "add", "--all"], { reject: false });
    const commit = await execa(
      "git",
      ["-C", root, "commit", "-m", `Publish article: ${slug}`],
      { reject: false },
    );
    if ((commit.exitCode ?? 1) === 0) log.ok("committed publish");
    else log.warn("nothing to commit (already staged or no changes).");
  }
}
