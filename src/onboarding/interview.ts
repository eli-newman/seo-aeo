/**
 * The interactive onboarding interview. Uses @clack/prompts, pre-filled
 * with detection defaults. Returns everything needed to assemble a
 * ProjectConfig plus the raw answers used to expand keywords/voice.
 */
import {
  intro,
  outro,
  note,
  text,
  select,
  confirm,
  isCancel,
  cancel,
} from "@clack/prompts";
import path from "node:path";
import pc from "picocolors";

import type { Detection } from "./detect.js";
import type { OnboardingAnswers } from "./expand.js";
import type { Cadence, ImageSettings, RepoLayout } from "../engine/types.js";

export interface InterviewResult {
  answers: OnboardingAnswers;
  cadence: Cadence["frequency"];
  images: { enabled: boolean; style: string };
  layout: RepoLayout;
  author: string;
}

function bail(value: unknown): asserts value is string {
  if (isCancel(value)) {
    cancel("Onboarding cancelled.");
    process.exit(0);
  }
}

async function ask(
  message: string,
  initialValue = "",
  required = true,
): Promise<string> {
  const v = await text({
    message,
    initialValue,
    validate: required
      ? (s) => (s.trim().length === 0 ? "Required." : undefined)
      : undefined,
  });
  bail(v);
  return v.trim();
}

export async function interview(
  root: string,
  detection: Detection,
): Promise<InterviewResult> {
  intro(pc.cyan(pc.bold(" seo-aeo onboarding ")));

  const detected = [
    `framework: ${detection.framework}`,
    `posts: ${detection.postsPath}`,
    `drafts: ${detection.draftsPath}`,
    detection.samplePostPath
      ? `sample post: ${detection.samplePostPath}`
      : "no existing posts found",
  ].join("\n");
  note(detected, "Detected");

  const dirName = path.basename(root);
  const name = await ask("What's the site/product name?", dirName);
  const siteUrl = await ask(
    "Public site URL (used for canonical links + JSON-LD):",
    detection.siteUrl ?? "https://",
  );
  const whatItDoes = await ask(
    "In one sentence, what does this site/product do?",
  );
  const audienceRoles = await ask(
    "Who's the audience? (roles, comma-separated)",
  );
  const companySize = await ask(
    "Typical customer size? (e.g. 'solo / 1-3 people')",
    "solo / small team",
  );
  const pain = await ask("What's the core pain you solve for them?");
  const tone = await ask(
    "Describe the writing tone you want:",
    "practical, specific, anti-fluff — peer talking to a peer",
  );
  const competitors = await ask(
    "Competitors to compare against? (comma-separated, optional)",
    "",
    false,
  );

  const cadence = (await select({
    message: "How often should it publish?",
    options: [
      { value: "biweekly", label: "Every 2 weeks (recommended)" },
      { value: "weekly", label: "Weekly" },
    ],
    initialValue: "biweekly",
  })) as Cadence["frequency"];
  bail(cadence);

  const imagesEnabled = await confirm({
    message: "Generate AI images (with alt text) for each article?",
    initialValue: true,
  });
  if (isCancel(imagesEnabled)) {
    cancel("Onboarding cancelled.");
    process.exit(0);
  }

  let style: ImageSettings["style"] =
    "clean, modern, editorial illustration; no text in the image";
  if (imagesEnabled) {
    style = await ask("Image style hint:", style);
  }

  // Content layout — defaults from detection.
  const draftsPath = await ask(
    "Where should draft articles be written?",
    detection.draftsPath,
  );
  const postsPath = await ask(
    "Where do published articles live?",
    detection.postsPath,
  );
  const publicPath = await ask(
    "Public/static dir (for images)?",
    detection.publicPath,
  );
  const publicUrlBase = await ask(
    "URL path images are served from?",
    detection.publicUrlBase,
  );

  outro(pc.green("Got it — generating your keyword bank and voice guide…"));

  return {
    answers: {
      name,
      siteUrl,
      whatItDoes,
      audienceRoles,
      companySize,
      pain,
      tone,
      competitors,
    },
    cadence,
    images: { enabled: imagesEnabled, style },
    layout: {
      framework: detection.framework,
      draftsPath,
      postsPath,
      publicPath,
      publicUrlBase,
    },
    author: name,
  };
}
