import type { PostStatus } from "@/lib/db/schema";
import type { PostRecord } from "@/lib/content";
import { slugifyTag } from "@/lib/utils";

export const POST_EDITOR_SNAPSHOT_VERSION = 1;

export type PostEditorValues = {
  title: string;
  slug: string;
  summary: string;
  tags: string;
  cover: string;
  content: string;
  status: PostStatus;
};

export type PostEditorSnapshot = PostEditorValues & {
  version: number;
  savedAt: number;
  sourcePostUpdatedAt: string | null;
};

export type PostEditorSlugMode = "auto" | "manual";

export function createPostEditorValues(post?: PostRecord | null): PostEditorValues {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    summary: post?.summary ?? "",
    tags: post?.tags.join(", ") ?? "",
    cover: post?.cover ?? "",
    content: post?.content ?? "",
    status: post?.status ?? "draft",
  };
}

export function getPostEditorDraftStorageKey(postId?: number | null): string {
  return typeof postId === "number"
    ? `admin-post-editor:${postId}`
    : "admin-post-editor:new";
}

export function getSuggestedSlug(title: string): string {
  return slugifyTag(title);
}

export function inferPostEditorSlugMode(
  values: PostEditorValues,
  hasExistingPost: boolean
): PostEditorSlugMode {
  if (hasExistingPost) {
    return "manual";
  }

  return values.slug.trim() === getSuggestedSlug(values.title) ? "auto" : "manual";
}

export function parsePostEditorTagInput(input: string): string[] {
  return [...new Set(
    input
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

export function formatPostEditorTags(tags: string[]): string {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].join(", ");
}

export function createPostEditorSnapshot(
  values: PostEditorValues,
  sourcePostUpdatedAt: string | null
): PostEditorSnapshot {
  return {
    version: POST_EDITOR_SNAPSHOT_VERSION,
    savedAt: Date.now(),
    sourcePostUpdatedAt,
    ...values,
  };
}

export function parsePostEditorSnapshot(rawValue: string | null): PostEditorSnapshot | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PostEditorSnapshot>;

    if (parsed.version !== POST_EDITOR_SNAPSHOT_VERSION || typeof parsed.savedAt !== "number") {
      return null;
    }

    if (parsed.status !== "draft" && parsed.status !== "published") {
      return null;
    }

    return {
      version: POST_EDITOR_SNAPSHOT_VERSION,
      savedAt: parsed.savedAt,
      sourcePostUpdatedAt:
        typeof parsed.sourcePostUpdatedAt === "string" ? parsed.sourcePostUpdatedAt : null,
      title: typeof parsed.title === "string" ? parsed.title : "",
      slug: typeof parsed.slug === "string" ? parsed.slug : "",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      tags: typeof parsed.tags === "string" ? parsed.tags : "",
      cover: typeof parsed.cover === "string" ? parsed.cover : "",
      content: typeof parsed.content === "string" ? parsed.content : "",
      status: parsed.status,
    };
  } catch {
    return null;
  }
}

export function shouldOfferPostEditorRestore(
  snapshot: PostEditorSnapshot,
  sourcePostUpdatedAt: string | null,
  hasExistingPost: boolean
): boolean {
  if (!hasExistingPost) {
    return true;
  }

  if (!sourcePostUpdatedAt) {
    return true;
  }

  const sourceTimestamp = Date.parse(sourcePostUpdatedAt);

  if (Number.isNaN(sourceTimestamp)) {
    return true;
  }

  return snapshot.savedAt > sourceTimestamp;
}

export function createPostEditorFingerprint(values: PostEditorValues): string {
  return JSON.stringify(values);
}

export function shouldApplySuggestedSummary(
  currentSummary: string,
  suggestedSummary: string
): boolean {
  const normalizedCurrent = currentSummary.trim().replace(/\s+/g, " ");
  const normalizedSuggested = suggestedSummary.trim().replace(/\s+/g, " ");

  if (!normalizedSuggested) {
    return false;
  }

  if (!normalizedCurrent) {
    return true;
  }

  if (normalizedCurrent === normalizedSuggested) {
    return false;
  }

  return normalizedCurrent.length < Math.max(Math.round(normalizedSuggested.length * 0.6), 40);
}
