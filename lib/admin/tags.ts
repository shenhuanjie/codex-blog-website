import { countDistinct, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db, isDatabaseConfigured } from "@/lib/db/client";
import { postTags, tags } from "@/lib/db/schema";
import { slugifyTag } from "@/lib/utils";

export type AdminTagRecord = {
  id: number;
  name: string;
  slug: string;
  postCount: number;
  createdAt: string;
};

export type RenamedTagRecord = AdminTagRecord & {
  previousSlug: string;
};

export type MergedTagRecord = {
  sourceSlug: string;
  targetSlug: string;
};

const tagNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) => slugifyTag(value).length > 0, "Invalid tag name");

export async function getAdminTagRecords(): Promise<AdminTagRecord[]> {
  if (!isDatabaseConfigured() || !db) {
    return [];
  }

  const rows = await db
    .select({
      tag: tags,
      postCount: countDistinct(postTags.postId),
    })
    .from(tags)
    .leftJoin(postTags, eq(tags.id, postTags.tagId))
    .groupBy(tags.id)
    .orderBy(desc(tags.createdAt));

  return rows.map((row) => ({
    id: row.tag.id,
    name: row.tag.name,
    slug: row.tag.slug,
    postCount: Number(row.postCount ?? 0),
    createdAt: row.tag.createdAt.toISOString(),
  }));
}

export async function removeTag(id: number): Promise<void> {
  if (!isDatabaseConfigured() || !db) {
    throw new Error("Database is not configured.");
  }

  const [existing] = await db
    .select({
      tag: tags,
      postCount: countDistinct(postTags.postId),
    })
    .from(tags)
    .leftJoin(postTags, eq(tags.id, postTags.tagId))
    .where(eq(tags.id, id))
    .groupBy(tags.id)
    .limit(1);

  if (!existing) {
    throw new Error("Tag not found.");
  }

  if (Number(existing.postCount ?? 0) > 0) {
    throw new Error("Tag is in use.");
  }

  await db.delete(tags).where(eq(tags.id, id));
}

export async function renameTag(id: number, nextName: string): Promise<RenamedTagRecord> {
  if (!isDatabaseConfigured() || !db) {
    throw new Error("Database is not configured.");
  }

  const normalizedName = tagNameSchema.parse(nextName);
  const nextSlug = slugifyTag(normalizedName);

  const [current] = await db
    .select()
    .from(tags)
    .where(eq(tags.id, id))
    .limit(1);

  if (!current) {
    throw new Error("Tag not found.");
  }

  const [currentUsage] = await db
    .select({
      postCount: countDistinct(postTags.postId),
    })
    .from(tags)
    .leftJoin(postTags, eq(tags.id, postTags.tagId))
    .where(eq(tags.id, id))
    .groupBy(tags.id)
    .limit(1);

  const [conflict] = await db
    .select()
    .from(tags)
    .where(sql`${tags.id} <> ${id} AND (${tags.name} = ${normalizedName} OR ${tags.slug} = ${nextSlug})`)
    .limit(1);

  if (conflict) {
    throw new Error("A tag with the same name or slug already exists.");
  }

  const [updated] = await db
    .update(tags)
    .set({
      name: normalizedName,
      slug: nextSlug,
    })
    .where(eq(tags.id, id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update tag.");
  }

  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    postCount: Number(currentUsage?.postCount ?? 0),
    createdAt: updated.createdAt.toISOString(),
    previousSlug: current.slug,
  };
}

export async function mergeTags(sourceId: number, targetId: number): Promise<MergedTagRecord> {
  if (!isDatabaseConfigured() || !db) {
    throw new Error("Database is not configured.");
  }

  if (sourceId === targetId) {
    throw new Error("Cannot merge a tag into itself.");
  }

  const [source] = await db.select().from(tags).where(eq(tags.id, sourceId)).limit(1);
  const [target] = await db.select().from(tags).where(eq(tags.id, targetId)).limit(1);

  if (!source || !target) {
    throw new Error("Source or target tag not found.");
  }

  await db.transaction(async (trx) => {
    const sourceRelations = await trx
      .select({ postId: postTags.postId })
      .from(postTags)
      .where(eq(postTags.tagId, sourceId));

    if (sourceRelations.length > 0) {
      await trx
        .insert(postTags)
        .values(sourceRelations.map((row) => ({ postId: row.postId, tagId: targetId })))
        .onConflictDoNothing();
    }

    await trx.delete(postTags).where(eq(postTags.tagId, sourceId));
    await trx.delete(tags).where(eq(tags.id, sourceId));
  });

  return {
    sourceSlug: source.slug,
    targetSlug: target.slug,
  };
}
