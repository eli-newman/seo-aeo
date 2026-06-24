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

// Engine surface for embedding in custom runners.
export { runOnce, createContext, type RunOptions, type RunResult } from "./engine/runOnce.js";
export type { EngineContext } from "./engine/context.js";
export { audit } from "./engine/pipeline/audit.js";
export { rankTopics } from "./engine/pipeline/rank.js";
export { renderMdx } from "./engine/mdx.js";
export { AnthropicProvider, type TextProvider } from "./engine/providers/text.js";
export {
  GeminiProvider,
  NullImageProvider,
  type ImageProvider,
} from "./engine/providers/image.js";

export const VERSION = "0.1.0";
