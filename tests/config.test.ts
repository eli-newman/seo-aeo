import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadProject } from "../src/engine/config.js";
import { ProjectConfig } from "../src/engine/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(__dirname, "fixtures", "repo");

describe("config loading", () => {
  it("loads and validates a fixture project", async () => {
    const project = await loadProject(FIXTURE_ROOT);
    expect(project.config.name).toBe("fixture-site");
    expect(project.config.siteUrl).toBe("https://example.com");
    expect(project.config.images.enabled).toBe(true);
    expect(project.config.cadence.frequency).toBe("biweekly");
    expect(project.keywords).toHaveLength(2);
    expect(project.keywords[0]?.intent).toBe("informational");
    expect(project.voice).toContain("anti-fluff");
  });

  it("applies schema defaults for omitted fields", () => {
    const cfg = ProjectConfig.parse({
      name: "minimal",
      siteUrl: "https://minimal.dev",
    });
    expect(cfg.article.targetWordCount).toBe(1500);
    expect(cfg.audit.seoMinScore).toBe(80);
    expect(cfg.images.enabled).toBe(false);
    expect(cfg.llm.draftModel).toBe("claude-opus-4-8");
  });

  it("rejects an invalid siteUrl", () => {
    expect(() =>
      ProjectConfig.parse({ name: "bad", siteUrl: "not-a-url" }),
    ).toThrow();
  });
});
