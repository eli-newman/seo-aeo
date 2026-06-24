import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { loadProject } from "../../engine/config.js";
import { log } from "../../engine/log.js";

function mdxFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .sort();
}

/** List drafts and posts. */
export async function runList(root: string): Promise<void> {
  const { config } = await loadProject(root);
  const drafts = mdxFiles(path.join(root, config.layout.draftsPath));
  const posts = mdxFiles(path.join(root, config.layout.postsPath));

  log.info(`Drafts (${drafts.length}) — ${config.layout.draftsPath}`);
  for (const f of drafts) log.dim(`  • ${f.replace(/\.mdx?$/, "")}`);

  log.info(`Posts (${posts.length}) — ${config.layout.postsPath}`);
  for (const f of posts) log.dim(`  • ${f.replace(/\.mdx?$/, "")}`);
}
