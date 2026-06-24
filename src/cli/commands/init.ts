import { log } from "../../engine/log.js";

export interface InitOptions {
  force: boolean;
}

/** Interactive onboarding wizard. Implemented in M2. */
export async function runInit(
  _root: string,
  _opts: InitOptions,
): Promise<void> {
  log.warn("`init` is not implemented yet (M2).");
}
