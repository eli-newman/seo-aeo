import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { detect } from "../src/onboarding/detect.js";
import { writeArtifacts } from "../src/onboarding/write.js";
import { ProjectConfig } from "../src/engine/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEXT_FIXTURE = path.join(__dirname, "fixtures", "next-site");

describe("detect", () => {
  it("detects a Next.js site, its content dir, and frontmatter schema", () => {
    const d = detect(NEXT_FIXTURE);
    expect(d.framework).toBe("next");
    expect(d.postsPath).toBe("content/blog");
    expect(d.draftsPath).toBe("content/drafts");
    expect(d.siteUrl).toBe("https://my-next-site.example.com");
    expect(d.existingFrontmatterKeys).toContain("title");
    expect(d.existingFrontmatterKeys).toContain("description");
    expect(d.samplePostPath).toBe(path.join("content/blog", "hello-world.mdx"));
  });

  it("falls back gracefully on an empty repo", () => {
    const d = detect("/definitely/not/a/real/path");
    expect(d.framework).toBe("unknown");
    expect(d.publicPath).toBe("public");
  });
});

describe("writeArtifacts", () => {
  let root: string;
  const config = ProjectConfig.parse({
    name: "Example",
    siteUrl: "https://example.com",
    cadence: { frequency: "biweekly", cron: "0 14 * * 1" },
  });
  const input = () => ({
    root,
    config,
    keywords: [
      { keyword: "k1", intent: "informational" as const, volume: 10, difficulty: 5, notes: "" },
    ],
    voice: "# Voice\n\nBe specific.",
    feeds: ["https://example.com/feed"],
    force: false,
  });

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "seo-aeo-init-"));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes config, state, and the biweekly workflow", async () => {
    const report = await writeArtifacts(input());
    expect(report.written).toContain("seo-aeo.config.json");
    expect(report.written).toContain(path.join(".seo-aeo", "keywords.json"));
    expect(report.written).toContain(path.join(".github", "workflows", "seo-aeo.yml"));

    const wf = await readFile(
      path.join(root, ".github", "workflows", "seo-aeo.yml"),
      "utf8",
    );
    expect(wf).toContain("Biweekly gate");
    expect(wf).toContain("npx -y github:eli-newman/seo-aeo run");
    expect(existsSync(path.join(root, ".seo-aeo", "voice.md"))).toBe(true);
  });

  it("is idempotent — skips existing files without force, overwrites with force", async () => {
    await writeArtifacts(input());
    const second = await writeArtifacts(input());
    expect(second.written).toEqual([]);
    expect(second.skipped).toContain("seo-aeo.config.json");

    const forced = await writeArtifacts({ ...input(), force: true });
    expect(forced.written).toContain("seo-aeo.config.json");
  });
});
