/**
 * @elinewman/seo-aeo — programmatic API.
 *
 * The CLI (`seo-aeo`) is the primary surface, but the engine is also
 * importable for embedding in custom scripts or other runners.
 */

export * from "./engine/types.js";
export {
  loadProject,
  loadKeywords,
  loadFeeds,
  loadVoice,
  hasConfig,
  configPath,
  statePath,
  CONFIG_FILENAME,
  STATE_DIR,
  type LoadedProject,
} from "./engine/config.js";
export { log } from "./engine/log.js";

export const VERSION = "0.1.0";
