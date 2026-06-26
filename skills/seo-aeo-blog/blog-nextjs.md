# Blog Recipe — Next.js (App Router)

> Scaffold a blog that renders the
> [frontmatter contract](./frontmatter-contract.md). **Read the contract
> first.** Adapt paths/styling to the repo; keep the contract and the
> JSON-LD-from-frontmatter rule intact.
>
> Pages Router note: the same pieces apply — use `getStaticPaths` /
> `getStaticProps` and `next/head` instead of `generateMetadata`.

## 0. Decide the MDX renderer

Pick whichever fits the repo (check existing deps first):

- **`next-mdx-remote`** (`next-mdx-remote/rsc` for App Router) — simplest
  when posts live in a content dir. Recommended here.
- **`@next/mdx`** — if the repo already compiles MDX as routes.

```bash
npm install next-mdx-remote gray-matter
```

## 1. Content dir

Create `content/blog/` (posts) and `content/drafts/` (engine writes here
first; you publish by moving to `content/blog/`). Match the engine's
`layout.postsPath` / `draftsPath` in Phase 3.

## 2. The loader — `lib/blog.ts`

```ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content/blog");

export interface PostFrontmatter {
  title: string;
  description: string;
  date: string;
  author: string;
  keywords?: string[];
  faqs?: { q: string; a: string }[];
  image?: string;
  draft?: boolean;
}

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  body: string;
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
      const { data, content } = matter(raw);
      return {
        slug: file.replace(/\.mdx?$/, ""),
        frontmatter: data as PostFrontmatter,
        body: content,
      };
    })
    .filter((p) => !p.frontmatter.draft) // contract: drafts excluded
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? 1 : -1));
}

export function getPost(slug: string): Post | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}
```

## 3. Index page — `app/blog/page.tsx`

```tsx
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export const metadata = {
  title: "Blog",
  description: "Latest articles.",
};

export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">Blog</h1>
      <ul className="mt-8 space-y-6">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} className="text-xl font-medium hover:underline">
              {p.frontmatter.title}
            </Link>
            <p className="text-sm text-gray-500">
              {new Date(p.frontmatter.date).toLocaleDateString()}
            </p>
            <p className="mt-1 text-gray-700">{p.frontmatter.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
```
> Restyle to match the site. The structure is what matters.

## 4. Post page — `app/blog/[slug]/page.tsx`

Renders the `<h1>` from frontmatter (the body has no H1 — contract),
compiles the MDX body, sets metadata, and **emits Article + FAQPage
JSON-LD**.

```tsx
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";
import { getAllPosts, getPost } from "@/lib/blog";

const SITE_URL = "https://YOURSITE.com"; // or process.env.NEXT_PUBLIC_SITE_URL
const SITE_NAME = "Your Site";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const { frontmatter: fm } = post;
  const url = `${SITE_URL}/blog/${slug}`;
  return {
    title: fm.title,
    description: fm.description,
    keywords: fm.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: fm.title,
      description: fm.description,
      type: "article",
      url,
      images: fm.image ? [new URL(fm.image, SITE_URL).toString()] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: fm.title,
      description: fm.description,
      images: fm.image ? [new URL(fm.image, SITE_URL).toString()] : undefined,
    },
  };
}

export default async function PostPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const { frontmatter: fm, body } = post;
  const url = `${SITE_URL}/blog/${slug}`;

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: fm.title,
      description: fm.description,
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      datePublished: fm.date,
      dateModified: fm.date,
      author: { "@type": "Person", name: fm.author },
      publisher: { "@type": "Organization", name: SITE_NAME },
      ...(fm.image ? { image: new URL(fm.image, SITE_URL).toString() } : {}),
    },
  ];
  if (fm.faqs && fm.faqs.length >= 2) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: fm.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="prose lg:prose-lg">
        <h1>{fm.title}</h1>
        <p className="text-sm text-gray-500">
          {new Date(fm.date).toLocaleDateString()} · {fm.author}
        </p>
        {fm.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fm.image} alt={fm.title} className="rounded-lg" />
        )}
        <MDXRemote source={body} />
      </article>
    </main>
  );
}
```
> Requires Tailwind Typography (`prose`) for nice defaults — or use the
> site's existing article styles. If the repo isn't using Tailwind, style
> the `<article>` however it styles long-form content.

## 5. Sitemap — `app/sitemap.ts`

```ts
import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

const SITE_URL = "https://YOURSITE.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts().map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.frontmatter.date,
  }));
  return [
    { url: SITE_URL, lastModified: new Date() },
    { url: `${SITE_URL}/blog`, lastModified: new Date() },
    ...posts,
  ];
}
```

## 6. Verify (the Phase 2 gate)

1. Add a sample post at `content/blog/2026-01-01-test.mdx` using the
   contract's frontmatter (include 2+ `faqs`).
2. `npm run dev` → open `/blog` (it's listed) and `/blog/2026-01-01-test`.
3. View source: confirm one `<h1>` from `title`, and `Article` +
   `FAQPage` JSON-LD in the `<script type="application/ld+json">`.
4. `npm run build` passes.
5. Delete the sample post.

Commit: `seo-aeo: add blog section`.
