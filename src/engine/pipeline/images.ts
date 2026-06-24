/**
 * Stage 6 (optional): images. Generate a hero (+ inline) image with the
 * configured ImageProvider, write SEO alt text with the TextProvider,
 * save the files into the site's public dir, and wire them into the MDX
 * + frontmatter. Skipped entirely when images are disabled.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { Article, ArticleImage, ProjectConfig } from "../types.js";
import type { EngineContext } from "../context.js";
import { extractJson } from "../util.js";
import { log } from "../log.js";

interface PlannedImage {
  role: "hero" | "inline";
  name: string;
  /** The scene we ask the image model to render. */
  scene: string;
  /** H2 heading this inline image sits under (hero: undefined). */
  anchorHeading?: string;
}

const AltText = z.object({
  alts: z.array(z.string()),
});

function bodyHeadings(body: string): string[] {
  return [...body.matchAll(/^##\s+(.+?)\s*$/gm)]
    .map((m) => m[1]!.trim())
    .filter((h) => !/^(quick answer|tl;?dr|summary|faq)$/i.test(h));
}

function planImages(article: Article, project: ProjectConfig): PlannedImage[] {
  const plan: PlannedImage[] = [
    {
      role: "hero",
      name: "hero",
      scene: `A hero illustration representing: ${article.frontmatter.title}.`,
    },
  ];
  const headings = bodyHeadings(article.body);
  const inlineCount = Math.min(project.images.inlineCount, headings.length);
  // Spread inline images across the available H2 sections.
  for (let i = 0; i < inlineCount; i++) {
    const heading = headings[Math.floor(((i + 1) * headings.length) / (inlineCount + 1))] ?? headings[i]!;
    plan.push({
      role: "inline",
      name: `inline-${i + 1}`,
      scene: `An illustration for the section "${heading}" of an article titled "${article.frontmatter.title}".`,
      anchorHeading: heading,
    });
  }
  return plan;
}

function imagePrompt(scene: string, project: ProjectConfig): string {
  return `${scene} Style: ${project.images.style}. 16:9 aspect, high quality, no text or words rendered in the image, no logos, no watermark.`;
}

async function writeAltText(
  plan: PlannedImage[],
  article: Article,
  ctx: EngineContext,
): Promise<string[]> {
  const targetKeyword = article.frontmatter.keywords[0] ?? "";
  const scenes = plan.map((p, i) => `${i + 1}. ${p.scene}`).join("\n");
  const user = `Write SEO + accessibility alt text for ${plan.length} image(s) in an article titled "${article.frontmatter.title}" (target keyword: "${targetKeyword}").

Images:
${scenes}

Rules:
- Each alt text describes what the image literally depicts, for a screen-reader user.
- <=125 characters each. No "image of" / "picture of" prefixes.
- Work the topic in naturally where honest; never keyword-stuff.

Return ONLY JSON: { "alts": ["...", "..."] } with exactly ${plan.length} entries in order.`;

  try {
    const raw = await ctx.text.call({
      model: ctx.project.llm.seoPassModel,
      system: "You write concise, accurate, accessible image alt text.",
      user,
      maxTokens: 1000,
      temperature: 0.4,
    });
    const parsed = AltText.parse(extractJson(raw));
    if (parsed.alts.length >= plan.length) return parsed.alts.slice(0, plan.length);
  } catch (err) {
    log.warn(
      `images: alt-text generation failed (${err instanceof Error ? err.message : String(err)}) — using fallback`,
    );
  }
  // Fallback alt text from the scene.
  return plan.map((p) => p.scene.replace(/\.$/, "").slice(0, 125));
}

function injectInlineImages(body: string, images: ArticleImage[]): string {
  let out = body;
  for (const img of images) {
    if (img.role !== "inline") continue;
    const md = `\n\n![${img.alt}](${img.src})\n`;
    // Insert right after the anchor heading line, else append.
    const lines = out.split("\n");
    const idx = lines.findIndex((l) => /^##\s+/.test(l));
    if (idx === -1) {
      out = out.trimEnd() + md;
    } else {
      // Place after the SECOND H2 if present (skip Quick answer), else first.
      const h2Indices = lines
        .map((l, i) => (/^##\s+/.test(l) ? i : -1))
        .filter((i) => i !== -1);
      const target = h2Indices[1] ?? h2Indices[0]!;
      lines.splice(target + 1, 0, md);
      out = lines.join("\n");
    }
  }
  return out;
}

export async function applyImages(
  article: Article,
  ctx: EngineContext,
): Promise<Article> {
  if (!ctx.image.enabled) return article;

  const project = ctx.project;
  const plan = planImages(article, project);
  const alts = await writeAltText(plan, article, ctx);

  const outDir = path.join(
    ctx.root,
    project.layout.publicPath,
    project.layout.publicUrlBase.replace(/^\/+/, ""),
    article.slug,
  );
  await mkdir(outDir, { recursive: true });

  const images: ArticleImage[] = [];
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i]!;
    const alt = alts[i] ?? p.scene;
    try {
      const gen = await ctx.image.generate(imagePrompt(p.scene, project));
      const fileName = `${p.name}.${gen.ext}`;
      const diskPath = path.join(outDir, fileName);
      await writeFile(diskPath, gen.bytes);
      const src = `${project.layout.publicUrlBase.replace(/\/+$/, "")}/${article.slug}/${fileName}`;
      images.push({ src, alt, role: p.role, diskPath });
      log.ok(`generated ${p.role} image → ${path.relative(ctx.root, diskPath)}`);
    } catch (err) {
      log.warn(
        `images: failed to generate ${p.name} (${err instanceof Error ? err.message : String(err)})`,
      );
    }
  }

  if (images.length === 0) return article;

  const hero = images.find((im) => im.role === "hero");
  const body = injectInlineImages(article.body, images);
  const stages = article.stagesCompleted.includes("images")
    ? article.stagesCompleted
    : [...article.stagesCompleted, "images"];

  return {
    ...article,
    body,
    images,
    frontmatter: { ...article.frontmatter, image: hero?.src ?? article.frontmatter.image },
    stagesCompleted: stages,
  };
}
