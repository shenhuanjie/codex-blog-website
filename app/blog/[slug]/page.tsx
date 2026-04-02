import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GiscusComments } from "@/components/blog/giscus-comments";
import { MDXRenderer } from "@/components/blog/mdx-renderer";
import { PostMeta } from "@/components/blog/post-meta";
import { ViewCounter } from "@/components/blog/view-counter";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { CyberCard } from "@/components/ui/cyber-card";
import { TagChip } from "@/components/ui/tag-chip";
import { getAdjacentPosts, getAllPosts, getPostBySlug } from "@/lib/content";
import { siteConfig } from "@/lib/site";
import { slugifyTag } from "@/lib/utils";

type PostPageProps = {
  params: Promise<{ slug: string }>;
};

type TocItem = {
  id: string;
  label: string;
  level: 2 | 3;
};

function extractHeadings(source: string): TocItem[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("## ") || line.startsWith("### "))
    .map((line) => {
      const level: TocItem["level"] = line.startsWith("### ") ? 3 : 2;
      const label = line.replace(/^###?\s+/, "");
      const id = label
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-\u4e00-\u9fa5]/g, "");
      return { id, label, level };
    })
    .filter((item) => item.id.length > 0);
}

export async function generateStaticParams() {
  return (await getAllPosts()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.draft) {
    return {
      title: "文章不存在",
    };
  }

  return {
    title: post.title,
    description: post.summary,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | ${siteConfig.name}`,
      description: post.summary,
      type: "article",
      url: `${siteConfig.url}/blog/${post.slug}`,
      publishedTime: post.date,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.draft) {
    notFound();
  }

  const adjacent = await getAdjacentPosts(post.slug);
  const toc = extractHeadings(post.content);

  return (
    <Section className="pt-10 md:pt-14">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <CyberCard variant="default" className="space-y-6 p-6 md:p-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-mutedForeground transition-colors hover:text-accent"
            >
              {"<"}
              返回文章列表
            </Link>

            <header className="space-y-4 border-b border-border pb-6">
              <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.12em] text-foreground md:text-4xl">
                {post.title}
              </h1>
              <p className="text-mutedForeground">{post.summary}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <PostMeta post={post} />
                <div className="text-xs uppercase tracking-[0.16em] text-mutedForeground">
                  <ViewCounter slug={post.slug} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <TagChip key={tag} tag={tag} href={`/blog/tag/${slugifyTag(tag)}`} />
                ))}
              </div>
            </header>

            <MDXRenderer source={post.content} />
            <GiscusComments term={post.slug} />

            <nav className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
              <CyberCard variant="terminal" className="h-full">
                {adjacent.previous ? (
                  <Link href={`/blog/${adjacent.previous.slug}`} className="group block">
                    <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
                      Previous
                    </p>
                    <p className="mt-2 text-sm text-foreground transition-colors group-hover:text-accent">
                      {adjacent.previous.title}
                    </p>
                  </Link>
                ) : (
                  <p className="text-sm text-mutedForeground">没有更早的文章。</p>
                )}
              </CyberCard>

              <CyberCard variant="terminal" className="h-full">
                {adjacent.next ? (
                  <Link href={`/blog/${adjacent.next.slug}`} className="group block text-right">
                    <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">Next</p>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-foreground transition-colors group-hover:text-accent">
                      {adjacent.next.title}
                      {">"}
                    </p>
                  </Link>
                ) : (
                  <p className="text-right text-sm text-mutedForeground">没有更新的文章。</p>
                )}
              </CyberCard>
            </nav>
          </CyberCard>

          <aside className="hidden lg:block">
            <CyberCard variant="holographic" className="sticky top-24 space-y-4">
              <p className="font-label text-xs uppercase tracking-[0.24em] text-accent">On This Page</p>
              {toc.length === 0 ? (
                <p className="text-sm text-mutedForeground">本篇未定义目录标题。</p>
              ) : (
                <ul className="space-y-2 text-sm text-mutedForeground">
                  {toc.map((item) => (
                    <li key={item.id} className={item.level === 3 ? "pl-3" : ""}>
                      <a href={`#${item.id}`} className="transition-colors hover:text-accent">
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CyberCard>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
