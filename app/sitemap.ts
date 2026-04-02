import type { MetadataRoute } from "next";

import { getAllPosts, getAllTagSlugs } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseRoutes = ["", "/blog", "/about", "/rss.xml"];
  const [posts, tagSlugs] = await Promise.all([getAllPosts(), getAllTagSlugs()]);

  const baseItems = baseRoutes.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date(),
  }));

  const postItems = posts.map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  const tagItems = tagSlugs.map((tag) => ({
    url: `${siteConfig.url}/blog/tag/${tag}`,
    lastModified: new Date(),
  }));

  return [...baseItems, ...postItems, ...tagItems];
}
