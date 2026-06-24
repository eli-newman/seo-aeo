/** The shared context threaded through every pipeline stage. */
import type { TextProvider } from "./providers/text.js";
import type { ImageProvider } from "./providers/image.js";
import type { KeywordTarget, ProjectConfig } from "./types.js";

export interface EngineContext {
  /** Absolute path to the consumer repo root. */
  root: string;
  project: ProjectConfig;
  /** Raw markdown voice guide (may be empty). */
  voice: string;
  keywords: KeywordTarget[];
  /** RSS feed URLs (may be empty → evergreen mode). */
  feeds: string[];
  text: TextProvider;
  image: ImageProvider;
}
