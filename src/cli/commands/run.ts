import { createContext, runOnce } from "../../engine/runOnce.js";
import { log } from "../../engine/log.js";

export interface RunOptions {
  dryRun: boolean;
  /** commander's `--no-images` sets this to false. */
  images: boolean;
}

/** Generate one article. */
export async function runCommand(
  root: string,
  opts: RunOptions,
): Promise<void> {
  const ctx = await createContext(root, {
    dryRun: opts.dryRun,
    images: opts.images,
  });
  const result = await runOnce(ctx, {
    dryRun: opts.dryRun,
    images: opts.images,
  });

  if (!result.audit.passed) {
    log.warn(
      "Article still has audit issues after self-repair — review carefully before merging.",
    );
  }
  if (result.publish?.prUrl) {
    log.ok(`Done. Review the PR: ${result.publish.prUrl}`);
  } else if (result.previewPath) {
    log.ok(`Done. Preview: ${result.previewPath}`);
  } else {
    log.ok("Done.");
  }
}
