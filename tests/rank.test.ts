import { describe, it, expect } from "vitest";

import { rankTopics } from "../src/engine/pipeline/rank.js";
import { ProjectConfig, type FeedItem, type KeywordTarget } from "../src/engine/types.js";

const project = ProjectConfig.parse({
  name: "t",
  siteUrl: "https://t.dev",
});

const keywords: KeywordTarget[] = [
  { keyword: "best analytics tool", intent: "commercial", volume: 100, difficulty: 20, notes: "" },
  { keyword: "how to get first users", intent: "informational", volume: 200, difficulty: 15, notes: "" },
];

describe("rankTopics", () => {
  it("returns evergreen topics when there are no feed items", () => {
    const topics = rankTopics([], keywords, "/nonexistent-root", project);
    expect(topics.length).toBeGreaterThan(0);
    expect(topics.every((t) => t.feedItem === null)).toBe(true);
    // Commercial intent should rank above informational on a tie-ish basis.
    expect(topics[0]?.keyword.intent).toBe("commercial");
  });

  it("scores a relevant feed item above evergreen", () => {
    const items: FeedItem[] = [
      {
        title: "The best analytics tool for indie founders, reviewed",
        link: "https://news.example.com/a",
        summary: "We compare analytics tools.",
        published: null,
        source: "news",
      },
    ];
    const topics = rankTopics(items, keywords, "/nonexistent-root", project);
    const top = topics[0]!;
    expect(top.keyword.keyword).toBe("best analytics tool");
    expect(top.feedItem).not.toBeNull();
    expect(top.score).toBeGreaterThan(25);
  });

  it("returns empty when there are no keywords", () => {
    expect(rankTopics([], [], "/root", project)).toEqual([]);
  });
});
