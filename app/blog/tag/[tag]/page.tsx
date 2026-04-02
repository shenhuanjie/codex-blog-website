import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostList } from "@/components/blog/post-list";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { TagChip } from "@/components/ui/tag-chip";
import { getAllTagSlugs, getAllTags, getPostsByTagSlug } from "@/lib/content";
import { siteConfig } from "@/lib/site";
import { slugifyTag } from "@/lib/utils";

type TagPageProps = {
  params: Promise<{ tag: string }>;
};

export async function generateStaticParams() {
  return (await getAllTagSlugs()).map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const allTags = await getAllTags();
  const matchedTag = allTags.find((item) => slugifyTag(item) === tag) ?? tag;

  return {
    title: `标签: ${matchedTag}`,
    description: `筛选标签 ${matchedTag} 下的全部文章。`,
    alternates: {
      canonical: `/blog/tag/${tag}`,
    },
    openGraph: {
      title: `标签: ${matchedTag} | ${siteConfig.name}`,
      description: `筛选标签 ${matchedTag} 下的全部文章。`,
      url: `${siteConfig.url}/blog/tag/${tag}`,
    },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const posts = await getPostsByTagSlug(tag);

  if (posts.length === 0) {
    notFound();
  }

  const allTags = await getAllTags();
  const matchedTag = allTags.find((item) => slugifyTag(item) === tag) ?? tag;

  return (
    <Section className="pt-12 md:pt-16">
      <Container className="space-y-10">
        <SectionHeading
          eyebrow="Tag Filter"
          title={`标签: ${matchedTag}`}
          description={`当前筛选共 ${posts.length} 篇文章。`}
        />

        <div className="cyber-chamfer border border-border bg-card/70 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            <TagChip tag="全部" href="/blog" />
            {allTags.map((item) => {
              const slug = slugifyTag(item);
              return (
                <TagChip
                  key={item}
                  tag={item}
                  href={`/blog/tag/${slug}`}
                  active={slug === tag}
                />
              );
            })}
          </div>
        </div>

        <PostList posts={posts} />
      </Container>
    </Section>
  );
}
