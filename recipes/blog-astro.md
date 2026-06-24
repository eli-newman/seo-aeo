# Blog Recipe — Astro

> Scaffold a blog that renders the
> [frontmatter contract](./frontmatter-contract.md) using Astro content
> collections. **Read the contract first.** Adapt styling to the repo.

## 1. Install MDX + sitemap integrations

```bash
npx astro add mdx sitemap
```

## 2. Content collection — `src/content/config.ts`

Match the contract's frontmatter exactly.

```ts
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(), // ISO yyyy-mm-dd
    author: z.string(),
    keywords: z.array(z.string()).optional(),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    image: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

Posts live in `src/content/blog/*.mdx`. (Set the engine's
`layout.postsPath` to `src/content/blog` in Phase 3. For drafts, the
engine writes to `layout.draftsPath` — use `src/content/drafts` and exclude
it from the collection, or have the engine write straight to a draft branch.)

## 3. Index — `src/pages/blog/index.astro`

```astro
---
import { getCollection } from "astro:content";
const posts = (await getCollection("blog", ({ data }) => !data.draft))
  .sort((a, b) => (a.data.date < b.data.date ? 1 : -1));
---
<main class="mx-auto max-w-2xl px-4 py-12">
  <h1 class="text-3xl font-bold">Blog</h1>
  <ul class="mt-8 space-y-6">
    {posts.map((post) => (
      <li>
        <a href={`/blog/${post.slug}`} class="text-xl font-medium hover:underline">
          {post.data.title}
        </a>
        <p class="text-sm text-gray-500">{new Date(post.data.date).toLocaleDateString()}</p>
        <p class="mt-1 text-gray-700">{post.data.description}</p>
      </li>
    ))}
  </ul>
</main>
```

## 4. Post page — `src/pages/blog/[...slug].astro`

Renders `<h1>` from frontmatter, the MDX body, metadata, and **Article +
FAQPage JSON-LD**.

```astro
---
import { getCollection, type CollectionEntry } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return posts.map((post) => ({ params: { slug: post.slug }, props: { post } }));
}

const SITE_URL = "https://YOURSITE.com";
const SITE_NAME = "Your Site";
const { post } = Astro.props as { post: CollectionEntry<"blog"> };
const { Content } = await post.render();
const fm = post.data;
const url = `${SITE_URL}/blog/${post.slug}`;

const jsonLd: Record<string, unknown>[] = [{
  "@context": "https://schema.org", "@type": "Article",
  headline: fm.title, description: fm.description, url,
  mainEntityOfPage: { "@type": "WebPage", "@id": url },
  datePublished: fm.date, dateModified: fm.date,
  author: { "@type": "Person", name: fm.author },
  publisher: { "@type": "Organization", name: SITE_NAME },
  ...(fm.image ? { image: new URL(fm.image, SITE_URL).toString() } : {}),
}];
if (fm.faqs && fm.faqs.length >= 2) {
  jsonLd.push({
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: fm.faqs.map((f) => ({
      "@type": "Question", name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
}
---
<html lang="en">
  <head>
    <title>{fm.title}</title>
    <meta name="description" content={fm.description} />
    <link rel="canonical" href={url} />
    <meta property="og:title" content={fm.title} />
    <meta property="og:description" content={fm.description} />
    <meta property="og:type" content="article" />
    <meta property="og:url" content={url} />
    {fm.image && <meta property="og:image" content={new URL(fm.image, SITE_URL).toString()} />}
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
  </head>
  <body>
    <main class="mx-auto max-w-2xl px-4 py-12">
      <article class="prose lg:prose-lg">
        <h1>{fm.title}</h1>
        <p class="text-sm text-gray-500">
          {new Date(fm.date).toLocaleDateString()} · {fm.author}
        </p>
        {fm.image && <img src={fm.image} alt={fm.title} class="rounded-lg" />}
        <Content />
      </article>
    </main>
  </body>
</html>
```
> Use the site's existing `Layout` component instead of raw `<html>` if one
> exists — just keep the `<title>`, meta, canonical, and JSON-LD.

## 5. Sitemap

The `@astrojs/sitemap` integration (added in step 1) handles this from your
routes. Confirm drafts are excluded (they are, since `getStaticPaths`
filters `draft`).

## 6. Verify (the Phase 2 gate)

1. Add `src/content/blog/2026-01-01-test.mdx` with the contract frontmatter
   (2+ `faqs`).
2. `npm run dev` → `/blog` lists it, `/blog/2026-01-01-test` renders.
3. View source: one `<h1>` from `title`, `Article` + `FAQPage` JSON-LD present.
4. `npm run build` passes.
5. Delete the sample.

Commit: `seo-aeo: add blog section`.
