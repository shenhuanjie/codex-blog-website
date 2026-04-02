import type { Metadata } from "next";

import { BlogSearchShell } from "@/components/blog/blog-search-shell";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAllPosts, getAllTags, getSearchDocuments } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "技术博客",
  description: "按时间浏览所有文章，支持标签筛选。",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: `技术博客 | ${siteConfig.name}`,
    description: "按时间浏览所有文章，支持标签筛选。",
    url: `${siteConfig.url}/blog`,
  },
};

export default async function BlogPage() {
  const [posts, tags, documents] = await Promise.all([
    getAllPosts(),
    getAllTags(),
    getSearchDocuments(),
  ]);

  return (
    <Section className="pt-12 md:pt-16">
      <Container className="space-y-10">
        <SectionHeading
          eyebrow="Archive"
          title="技术文章归档"
          description="按发布时间倒序排列。可通过标签快速切换关注主题。"
        />

        <BlogSearchShell posts={posts} tags={tags} documents={documents} />
      </Container>
    </Section>
  );
}
