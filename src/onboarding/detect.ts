/**
 * Inspect a consumer repo to pre-fill onboarding defaults: framework,
 * content + public dirs, an existing post's frontmatter schema, and a
 * best-guess site URL. Everything here is best-effort — the interview
 * lets the user override every value.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import type { RepoLayout } from "../engine/types.js";

export interface Detection {
  framework: RepoLayout["framework"];
  /** Suggested content dirs (drafts/posts share a parent). */
  draftsPath: string;
  postsPath: string;
  publicPath: string;
  publicUrlBase: string;
  siteUrl?: string;
  /** Frontmatter keys found in an existing post, if any. */
  existingFrontmatterKeys: string[];
  /** Path (relative) of the sample post we read, if any. */
  samplePostPath?: string;
}

function readPkg(root: string): Record<string, any> | null {
  const p = path.join(root, "package.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function detectFramework(root: string): RepoLayout["framework"] {
  const pkg = readPkg(root);
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  if (deps.next) return "next";
  if (deps.astro) return "astro";
  if (deps["@remix-run/react"] || deps["@remix-run/node"]) return "remix";
  if (pkg) return "static";
  return "unknown";
}

/** Candidate content directories, most-conventional first. */
const CONTENT_CANDIDATES = [
  "content/blog",
  "content/posts",
  "src/content/blog",
  "src/content/posts",
  "content",
  "posts",
  "app/blog",
  "src/posts",
  "_posts",
];

function dirHasMarkdown(dir: string): boolean {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return false;
  return readdirSync(dir).some((f) => f.endsWith(".md") || f.endsWith(".mdx"));
}

function findContentDir(root: string): string | undefined {
  for (const c of CONTENT_CANDIDATES) {
    if (dirHasMarkdown(path.join(root, c))) return c;
  }
  // Fall back to the first candidate that simply exists as a directory.
  for (const c of CONTENT_CANDIDATES) {
    const p = path.join(root, c);
    if (existsSync(p) && statSync(p).isDirectory()) return c;
  }
  return undefined;
}

function firstMarkdownFile(root: string, dir: string): string | undefined {
  const abs = path.join(root, dir);
  if (!existsSync(abs)) return undefined;
  const f = readdirSync(abs).find((n) => n.endsWith(".md") || n.endsWith(".mdx"));
  return f ? path.join(dir, f) : undefined;
}

function detectPublicDir(root: string): string {
  for (const c of ["public", "static", "assets"]) {
    if (existsSync(path.join(root, c))) return c;
  }
  return "public";
}

function detectSiteUrl(root: string): string | undefined {
  const pkg = readPkg(root);
  if (typeof pkg?.homepage === "string") return pkg.homepage;
  // Vercel/Netlify configs sometimes carry a production URL; keep it simple.
  return undefined;
}

export function detect(root: string): Detection {
  const framework = detectFramework(root);
  const contentDir = findContentDir(root);

  // Convention: drafts live beside posts. If we found content/blog, use
  // content/drafts for drafts (a sibling) so review-by-PR is obvious.
  let draftsPath = "content/drafts";
  let postsPath = contentDir ?? "content/posts";
  if (contentDir) {
    const parent = path.posix.dirname(contentDir.split(path.sep).join("/"));
    draftsPath = parent === "." ? "drafts" : `${parent}/drafts`;
  }

  const publicPath = detectPublicDir(root);

  const sample = contentDir ? firstMarkdownFile(root, contentDir) : undefined;
  let existingFrontmatterKeys: string[] = [];
  if (sample) {
    try {
      const parsed = matter(readFileSync(path.join(root, sample), "utf8"));
      existingFrontmatterKeys = Object.keys(parsed.data);
    } catch {
      existingFrontmatterKeys = [];
    }
  }

  return {
    framework,
    draftsPath,
    postsPath,
    publicPath,
    publicUrlBase: "/blog",
    siteUrl: detectSiteUrl(root),
    existingFrontmatterKeys,
    samplePostPath: sample,
  };
}
