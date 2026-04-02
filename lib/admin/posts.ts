import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db, isDatabaseConfigured } from "@/lib/db/client";
import { postTags, posts, tags, type PostStatus } from "@/lib/db/schema";
import { slugifyTag } from "@/lib/utils";

const postFormSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  cover: z.string().trim().optional(),
  content: z.string().min(1),
  tags: z.string().trim().optional(),
  status: z.enum(["draft", "published"]),
});

export type PostFormInput = z.infer<typeof postFormSchema>;

function parseTagInput(input: string | undefined): string[] {
  if (!input) {
    return [];
  }

  return [...new Set(
    input
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

async function ensureTags(tagNames: string[]) {
  if (!db || tagNames.length === 0) {
    return [];
  }

  const tagSlugs = tagNames.map((tag) => slugifyTag(tag));
  const existing = await db
    .select()
    .from(tags)
    .where(inArray(tags.slug, tagSlugs));

  const existingSlugs = new Set(existing.map((tag) => tag.slug));
  const missing = tagNames
    .map((name) => ({
      name,
      slug: slugifyTag(name),
    }))
    .filter((tag) => !existingSlugs.has(tag.slug));

  if (missing.length > 0) {
    await db.insert(tags).values(missing);
  }

  return db.select().from(tags).where(inArray(tags.slug, tagSlugs));
}

export async function upsertPost(input: PostFormInput): Promise<number> {
  if (!isDatabaseConfigured() || !db) {
    throw new Error("Database is not configured.");
  }

  const parsed = postFormSchema.parse(input);
  const now = new Date();
  const normalizedSlug = slugifyTag(parsed.slug);
  const tagNames = parseTagInput(parsed.tags);

  let postId = parsed.id;

  if (postId) {
    await db
      .update(posts)
      .set({
        slug: normalizedSlug,
        title: parsed.title,
        summary: parsed.summary,
        content: parsed.content,
        cover: parsed.cover || null,
        status: parsed.status,
        publishedAt: parsed.status === "published" ? now : null,
        updatedAt: now,
      })
      .where(eq(posts.id, postId));
  } else {
    const inserted = await db
      .insert(posts)
      .values({
        slug: normalizedSlug,
        title: parsed.title,
        summary: parsed.summary,
        content: parsed.content,
        cover: parsed.cover || null,
        status: parsed.status,
        publishedAt: parsed.status === "published" ? now : null,
        updatedAt: now,
      })
      .returning({ id: posts.id });

    postId = inserted[0]?.id;
  }

  if (!postId) {
    throw new Error("Failed to persist post.");
  }

  await db.delete(postTags).where(eq(postTags.postId, postId));
  const storedTags = await ensureTags(tagNames);

  if (storedTags.length > 0) {
    await db.insert(postTags).values(
      storedTags.map((tag) => ({
        postId,
        tagId: tag.id,
      }))
    );
  }

  return postId;
}

export async function removePost(id: number): Promise<void> {
  if (!isDatabaseConfigured() || !db) {
    throw new Error("Database is not configured.");
  }

  await db.delete(posts).where(eq(posts.id, id));
}

export async function getPostCountByStatus(status: PostStatus): Promise<number> {
  if (!isDatabaseConfigured() || !db) {
    return 0;
  }

  const rows = await db.select({ id: posts.id }).from(posts).where(eq(posts.status, status));
  return rows.length;
}

export async function getPublishedPostCount(): Promise<number> {
  return getPostCountByStatus("published");
}

export async function getDraftPostCount(): Promise<number> {
  return getPostCountByStatus("draft");
}
