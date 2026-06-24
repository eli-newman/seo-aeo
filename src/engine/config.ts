/** Config loading + validation. Reads from a consumer repo root. */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  KeywordBank,
  ProjectConfig,
  type KeywordTarget,
} from "./types.js";

export const CONFIG_FILENAME = "seo-aeo.config.json";
export const STATE_DIR = ".seo-aeo";

export interface LoadedProject {
  /** Absolute path to the consumer repo root. */
  root: string;
  config: ProjectConfig;
  keywords: KeywordTarget[];
  feeds: string[];
  /** Raw markdown voice guide (empty string if none yet). */
  voice: string;
}

export function configPath(root: string): string {
  return path.join(root, CONFIG_FILENAME);
}

export function statePath(root: string, ...parts: string[]): string {
  return path.join(root, STATE_DIR, ...parts);
}

export function hasConfig(root: string): boolean {
  return existsSync(configPath(root));
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8"));
}

/** Load + validate the full project context from a repo root. */
export async function loadProject(root: string): Promise<LoadedProject> {
  const cfgFile = configPath(root);
  if (!existsSync(cfgFile)) {
    throw new Error(
      `No ${CONFIG_FILENAME} found in ${root}. Run \`npx seo-aeo init\` first.`,
    );
  }

  const config = ProjectConfig.parse(await readJson(cfgFile));

  const keywords = await loadKeywords(root);
  const feeds = await loadFeeds(root);
  const voice = await loadVoice(root);

  return { root, config, keywords, feeds, voice };
}

export async function loadKeywords(root: string): Promise<KeywordTarget[]> {
  const file = statePath(root, "keywords.json");
  if (!existsSync(file)) return [];
  const bank = KeywordBank.parse(await readJson(file));
  return bank.keywords;
}

export async function loadFeeds(root: string): Promise<string[]> {
  const file = statePath(root, "feeds.json");
  if (!existsSync(file)) return [];
  const data = (await readJson(file)) as {
    feeds?: Array<string | { url: string }>;
  };
  return (data.feeds ?? []).map((f) => (typeof f === "string" ? f : f.url));
}

export async function loadVoice(root: string): Promise<string> {
  const file = statePath(root, "voice.md");
  if (!existsSync(file)) return "";
  return readFile(file, "utf8");
}
