import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import readingTime from "reading-time";
import { and, desc, eq } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/lib/db/client";
import { postTags, posts, tags, type PostStatus } from "@/lib/db/schema";
import { slugifyTag } from "@/lib/utils";

const postsDirectory = path.join(process.cwd(), "content/posts");

export type PostFrontmatter = {
  title: string;
  date: string;
  summary: string;
  tags: string[];
  draft?: boolean;
  cover?: string;
};

export type PostMeta = PostFrontmatter & {
  slug: string;
  readingTime: string;
  dateTimestamp: number;
};

export type Post = PostMeta & {
  content: string;
};

export type SearchDocument = {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  date: string;
};

export type PostRecord = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  cover: string | null;
  status: PostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
};

function normalizeFrontmatter(data: Record<string, unknown>): PostFrontmatter {
  const tagList = Array.isArray(data.tags)
    ? data.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];

  return {
    title: String(data.title ?? "Untitled"),
    date: String(data.date ?? new Date().toISOString()),
    summary: String(data.summary ?? ""),
    tags: tagList,
    draft: Boolean(data.draft),
    cover: data.cover ? String(data.cover) : undefined,
  };
}

function ensurePostsDirectory(): void {
  if (!fs.existsSync(postsDirectory)) {
    fs.mkdirSync(postsDirectory, { recursive: true });
  }
}

function getFilePostFilenames(): string[] {
  ensurePostsDirectory();
  return fs
    .readdirSync(postsDirectory)
    .filter((filename) => filename.endsWith(".mdx"));
}

function getFilePostSlugs(): string[] {
  return getFilePostFilenames().map((filename) => filename.replace(/\.mdx$/, ""));
}

function getFilePostBySlug(slug: string): Post | null {
  const filePath = path.join(postsDirectory, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const source = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(source);
  const frontmatter = normalizeFrontmatter(data);
  const stats = readingTime(content);
  const dateTimestamp = new Date(frontmatter.date).getTime();

  return {
    ...frontmatter,
    slug,
    content,
    readingTime: stats.text,
    dateTimestamp,
  };
}

function getAllFilePosts(includeDraft = false): PostMeta[] {
  return getFilePostSlugs()
    .map((slug) => getFilePostBySlug(slug))
    .filter((post): post is Post => Boolean(post))
    .filter((post) => (includeDraft ? true : !post.draft))
    .sort((a, b) => b.dateTimestamp - a.dateTimestamp)
    .map((post) => ({
      title: post.title,
      date: post.date,
      summary: post.summary,
      tags: post.tags,
      draft: post.draft,
      cover: post.cover,
      slug: post.slug,
      readingTime: post.readingTime,
      dateTimestamp: post.dateTimestamp,
    }));
}

function groupDbRows(
  rows: Array<{
    post: typeof posts.$inferSelect;
    tagName: string | null;
  }>
): PostRecord[] {
  const grouped = new Map<number, PostRecord>();

  for (const row of rows) {
    const current = grouped.get(row.post.id);

    if (!current) {
      grouped.set(row.post.id, {
        id: row.post.id,
        slug: row.post.slug,
        title: row.post.title,
        summary: row.post.summary,
        content: row.post.content,
        cover: row.post.cover,
        status: row.post.status,
        publishedAt: row.post.publishedAt?.toISOString() ?? null,
        createdAt: row.post.createdAt.toISOString(),
        updatedAt: row.post.updatedAt.toISOString(),
        tags: row.tagName ? [row.tagName] : [],
      });
      continue;
    }

    if (row.tagName && !current.tags.includes(row.tagName)) {
      current.tags.push(row.tagName);
    }
  }

  return [...grouped.values()];
}

function toFrontendPost(record: PostRecord): Post {
  const date = record.publishedAt ?? record.createdAt;
  const stats = readingTime(record.content);

  return {
    slug: record.slug,
    title: record.title,
    summary: record.summary,
    content: record.content,
    tags: record.tags,
    cover: record.cover ?? undefined,
    draft: record.status !== "published",
    date,
    readingTime: stats.text,
    dateTimestamp: new Date(date).getTime(),
  };
}

async function getDbPosts(includeDraft = false): Promise<Post[]> {
  if (!db) {
    return [];
  }

  const rows = await db
    .select({
      post: posts,
      tagName: tags.name,
    })
    .from(posts)
    .leftJoin(postTags, eq(posts.id, postTags.postId))
    .leftJoin(tags, eq(postTags.tagId, tags.id))
    .where(includeDraft ? undefined : eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt));

  return groupDbRows(rows)
    .map(toFrontendPost)
    .sort((a, b) => b.dateTimestamp - a.dateTimestamp);
}

async function getDbPostBySlug(slug: string): Promise<Post | null> {
  if (!db) {
    return null;
  }

  const rows = await db
    .select({
      post: posts,
      tagName: tags.name,
    })
    .from(posts)
    .leftJoin(postTags, eq(posts.id, postTags.postId))
    .leftJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(posts.slug, slug))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt));

  const grouped = groupDbRows(rows);

  if (grouped.length === 0) {
    return null;
  }

  return toFrontendPost(grouped[0]);
}

export async function getPostSlugs(): Promise<string[]> {
  if (isDatabaseConfigured()) {
    return (await getDbPosts(true)).map((post) => post.slug);
  }

  return getFilePostSlugs();
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (isDatabaseConfigured()) {
    return getDbPostBySlug(slug);
  }

  return getFilePostBySlug(slug);
}

export async function getAllPosts(includeDraft = false): Promise<PostMeta[]> {
  const items = isDatabaseConfigured()
    ? await getDbPosts(includeDraft)
    : getAllFilePosts(includeDraft).map((post) => ({ ...post, content: "" })) as Array<Post>;

  const postsForList = items.map((post) => ({
    title: post.title,
    date: post.date,
    summary: post.summary,
    tags: post.tags,
    draft: post.draft,
    cover: post.cover,
    slug: post.slug,
    readingTime: post.readingTime,
    dateTimestamp: post.dateTimestamp,
  }));

  return postsForList;
}

export async function getPostsByTag(tag: string): Promise<PostMeta[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter((post) =>
    post.tags.some((item) => item.toLowerCase() === tag.toLowerCase())
  );
}

export async function getPostsByTagSlug(tagSlug: string): Promise<PostMeta[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter((post) =>
    post.tags.some((tag) => slugifyTag(tag) === tagSlug)
  );
}

export async function getAllTags(): Promise<string[]> {
  const set = new Set<string>();

  for (const post of await getAllPosts()) {
    for (const tag of post.tags) {
      set.add(tag);
    }
  }

  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function getAllTagSlugs(): Promise<string[]> {
  return (await getAllTags()).map((tag) => slugifyTag(tag));
}

export async function getFeaturedPosts(limit = 3): Promise<PostMeta[]> {
  return (await getAllPosts()).slice(0, limit);
}

export async function getAdjacentPosts(slug: string): Promise<{
  previous: PostMeta | null;
  next: PostMeta | null;
}> {
  const allPosts = await getAllPosts();
  const currentIndex = allPosts.findIndex((post) => post.slug === slug);

  if (currentIndex === -1) {
    return { previous: null, next: null };
  }

  return {
    previous: allPosts[currentIndex + 1] ?? null,
    next: allPosts[currentIndex - 1] ?? null,
  };
}

export async function getSiteStats(): Promise<{
  totalPosts: number;
  totalTags: number;
}> {
  const allPosts = await getAllPosts();
  const allTags = await getAllTags();

  return {
    totalPosts: allPosts.length,
    totalTags: allTags.length,
  };
}

export async function getSearchDocuments(): Promise<SearchDocument[]> {
  const allPosts = await getAllPosts();

  return allPosts.map((post) => ({
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    tags: post.tags,
    date: post.date,
  }));
}

export async function getAdminPostRecords(): Promise<PostRecord[]> {
  if (!isDatabaseConfigured() || !db) {
    return [];
  }

  const rows = await db
    .select({
      post: posts,
      tagName: tags.name,
    })
    .from(posts)
    .leftJoin(postTags, eq(posts.id, postTags.postId))
    .leftJoin(tags, eq(postTags.tagId, tags.id))
    .orderBy(desc(posts.updatedAt));

  return groupDbRows(rows);
}

export async function getAdminPostById(id: number): Promise<PostRecord | null> {
  if (!isDatabaseConfigured() || !db) {
    return null;
  }

  const rows = await db
    .select({
      post: posts,
      tagName: tags.name,
    })
    .from(posts)
    .leftJoin(postTags, eq(posts.id, postTags.postId))
    .leftJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(posts.id, id));

  const grouped = groupDbRows(rows);
  return grouped[0] ?? null;
}

export async function getAdminPostBySlug(slug: string): Promise<PostRecord | null> {
  if (!isDatabaseConfigured() || !db) {
    return null;
  }

  const rows = await db
    .select({
      post: posts,
      tagName: tags.name,
    })
    .from(posts)
    .leftJoin(postTags, eq(posts.id, postTags.postId))
    .leftJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(posts.slug, slug));

  const grouped = groupDbRows(rows);
  return grouped[0] ?? null;
}

export async function getPublishedPostCount(): Promise<number> {
  const allPosts = await getAllPosts();
  return allPosts.length;
}

export async function getDraftPostCount(): Promise<number> {
  if (!isDatabaseConfigured()) {
    return 0;
  }

  const allPosts = await getAdminPostRecords();
  return allPosts.filter((post) => post.status === "draft").length;
}

export async function getPublishedPostRecordBySlug(slug: string): Promise<PostRecord | null> {
  if (!isDatabaseConfigured() || !db) {
    return null;
  }

  const rows = await db
    .select({
      post: posts,
      tagName: tags.name,
    })
    .from(posts)
    .leftJoin(postTags, eq(posts.id, postTags.postId))
    .leftJoin(tags, eq(postTags.tagId, tags.id))
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")));

  const grouped = groupDbRows(rows);
  return grouped[0] ?? null;
}
