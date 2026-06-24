/**
 * Stage 0: ingest. Pull recent items from the project's RSS feeds.
 * Feeds are optional — with none configured, the pipeline runs in
 * "evergreen mode" off the keyword bank alone.
 */
import Parser from "rss-parser";

import type { FeedItem } from "../types.js";
import { log } from "../log.js";

const parser = new Parser({ timeout: 15_000 });

/** Fetch + flatten items from all feeds. Failing feeds are skipped. */
export async function fetchFeeds(
  feeds: string[],
  perFeedLimit = 15,
): Promise<FeedItem[]> {
  if (feeds.length === 0) return [];

  const results = await Promise.allSettled(
    feeds.map((url) => parser.parseURL(url)),
  );

  const items: FeedItem[] = [];
  results.forEach((res, i) => {
    const url = feeds[i] ?? "";
    if (res.status === "rejected") {
      log.warn(`feed failed: ${url} (${String(res.reason).slice(0, 80)})`);
      return;
    }
    const source = res.value.title || new URL(url).hostname;
    for (const entry of (res.value.items ?? []).slice(0, perFeedLimit)) {
      if (!entry.title || !entry.link) continue;
      items.push({
        title: entry.title,
        link: entry.link,
        summary: (entry.contentSnippet || entry.content || "").slice(0, 1000),
        published: entry.isoDate ?? null,
        source,
      });
    }
  });

  // De-dupe by link.
  const seen = new Set<string>();
  return items.filter((it) => {
    if (seen.has(it.link)) return false;
    seen.add(it.link);
    return true;
  });
}
