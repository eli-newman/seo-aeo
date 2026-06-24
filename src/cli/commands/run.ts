import { log } from "../../engine/log.js";

export interface RunOptions {
  dryRun: boolean;
  /** commander's `--no-images` sets this to false. */
  images: boolean;
}

/** Generate one article. Implemented in M3. */
export async function runCommand(
  _root: string,
  _opts: RunOptions,
): Promise<void> {
  log.warn("`run` is not implemented yet (M3).");
}
