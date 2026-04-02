import { z } from "zod";
import readingTime from "reading-time";

import { removePost, upsertPost } from "@/lib/admin/posts";
import { getAdminPostById, getAdminPostBySlug, getAdminPostRecords, getAllTags, type PostRecord } from "@/lib/content";
import { isDatabaseConfigured } from "@/lib/db/client";
import { slugifyTag } from "@/lib/utils";

const createPostSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  content: z.string().min(1),
  cover: z.string().trim().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

const updatePostSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  nextSlug: z.string().trim().min(1).optional(),
  summary: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  content: z.string().min(1).optional(),
  cover: z.string().trim().optional(),
  status: z.enum(["draft", "published"]).optional(),
}).refine((input) => Boolean(input.id || input.slug), {
  message: "Either id or slug is required.",
});

export type CreateManagedPostInput = z.input<typeof createPostSchema>;
export type UpdateManagedPostInput = z.input<typeof updatePostSchema>;
export type PreviewManagedPostInput = Omit<CreateManagedPostInput, "status">;

export type ManagedPostPreview = {
  title: string;
  slug: string;
  slugAlternatives: string[];
  summary: string;
  tags: string[];
  tagRecommendations: Array<{
    tag: string;
    score: number;
    matchedIn: Array<"title" | "summary" | "content">;
  }>;
  cover?: string;
  readingTime: string;
  wordCount: number;
  slugExists: boolean;
  matchingTagSuggestions: string[];
  duplicateCandidates: Array<{
    id: number;
    slug: string;
    title: string;
    status: PostRecord["status"];
    updatedAt: string;
    relevanceScore: number;
    matchReasons: string[];
  }>;
  recommendation: "create" | "update-existing" | "review";
  editorNote: string;
  qualityChecks: {
    hasTitleHeading: boolean;
    headingCount: number;
    codeBlockCount: number;
    bulletListCount: number;
    externalLinkCount: number;
    imageCount: number;
  };
  warnings: string[];
};

function assertDatabaseConfigured(): void {
  if (!isDatabaseConfigured()) {
    throw new Error("POSTGRES_URL is not configured. MCP publishing requires the database-backed mode.");
  }
}

function normalizeSummary(summary: string | undefined, content: string): string {
  if (summary?.trim()) {
    return summary.trim();
  }

  const compact = content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return compact.slice(0, 140) || "Untitled summary";
}

function normalizeTags(tags: string[] | undefined): string {
  return (tags ?? []).map((tag) => tag.trim()).filter(Boolean).join(", ");
}

function normalizeTagList(tags: string[] | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
}

function scoreDuplicateCandidate(inputTitle: string, inputSlug: string, post: PostRecord, queryTerms: string[]): {
  score: number;
  reasons: string[];
} {
  const title = post.title.toLowerCase();
  const slug = post.slug.toLowerCase();
  const summary = post.summary.toLowerCase();
  const normalizedTitle = inputTitle.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (slug === inputSlug) {
    score += 100;
    reasons.push("Exact slug match");
  }

  if (title === normalizedTitle) {
    score += 80;
    reasons.push("Exact title match");
  }

  if (title.includes(normalizedTitle) || normalizedTitle.includes(title)) {
    score += 40;
    reasons.push("Title overlap");
  }

  if (summary.includes(normalizedTitle)) {
    score += 20;
    reasons.push("Summary mentions the proposed title");
  }

  for (const term of queryTerms) {
    if (title.includes(term)) {
      score += 12;
      reasons.push(`Shared title term: ${term}`);
    }

    if (slug.includes(term)) {
      score += 8;
      reasons.push(`Shared slug term: ${term}`);
    }

    if (summary.includes(term)) {
      score += 4;
      reasons.push(`Shared summary term: ${term}`);
    }
  }

  return {
    score,
    reasons: [...new Set(reasons)],
  };
}

function buildSlugAlternatives(baseSlug: string): string[] {
  return Array.from({ length: 3 }, (_, index) => `${baseSlug}-${index + 2}`);
}

function countMatches(input: string, pattern: RegExp): number {
  return input.match(pattern)?.length ?? 0;
}

function scoreTagRecommendation(tag: string, title: string, summary: string, content: string): {
  score: number;
  matchedIn: Array<"title" | "summary" | "content">;
} {
  const normalizedTag = tag.toLowerCase();
  const matchedIn: Array<"title" | "summary" | "content"> = [];
  let score = 0;

  if (title.includes(normalizedTag)) {
    matchedIn.push("title");
    score += 10;
  }

  if (summary.includes(normalizedTag)) {
    matchedIn.push("summary");
    score += 6;
  }

  if (content.includes(normalizedTag)) {
    matchedIn.push("content");
    score += 3;
  }

  return { score, matchedIn };
}

async function requirePost(reference: { id?: number; slug?: string }): Promise<PostRecord> {
  assertDatabaseConfigured();

  const record = reference.id
    ? await getAdminPostById(reference.id)
    : reference.slug
      ? await getAdminPostBySlug(slugifyTag(reference.slug))
      : null;

  if (!record) {
    throw new Error("Post not found.");
  }

  return record;
}

async function readStoredPost(id: number): Promise<PostRecord> {
  const record = await getAdminPostById(id);

  if (!record) {
    throw new Error("Failed to read persisted post.");
  }

  return record;
}

export async function listManagedPosts(input?: {
  status?: "draft" | "published" | "all";
  limit?: number;
  query?: string;
}): Promise<PostRecord[]> {
  assertDatabaseConfigured();

  const allPosts = await getAdminPostRecords();
  const status = input?.status ?? "all";
  const limit = input?.limit ?? allPosts.length;
  const query = input?.query?.trim().toLowerCase();

  return allPosts
    .filter((post) => status === "all" ? true : post.status === status)
    .filter((post) => {
      if (!query) {
        return true;
      }

      return [
        post.title,
        post.slug,
        post.summary,
        post.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .slice(0, limit);
}

export async function getManagedPost(reference: { id?: number; slug?: string }): Promise<PostRecord> {
  return requirePost(reference);
}

export async function createManagedPost(rawInput: CreateManagedPostInput): Promise<PostRecord> {
  assertDatabaseConfigured();

  const input = createPostSchema.parse(rawInput);
  const slug = slugifyTag(input.slug?.trim() || input.title);

  if (!slug) {
    throw new Error("Unable to derive a valid slug from the title.");
  }

  const postId = await upsertPost({
    title: input.title,
    slug,
    summary: normalizeSummary(input.summary, input.content),
    tags: normalizeTags(input.tags),
    content: input.content,
    cover: input.cover,
    status: input.status,
  });

  return readStoredPost(postId);
}

export async function updateManagedPost(rawInput: UpdateManagedPostInput): Promise<PostRecord> {
  assertDatabaseConfigured();

  const input = updatePostSchema.parse(rawInput);
  const current = await requirePost(input);
  const nextTitle = input.title ?? current.title;
  const nextContent = input.content ?? current.content;
  const nextSummary = normalizeSummary(input.summary ?? current.summary, nextContent);
  const nextSlug = slugifyTag(input.nextSlug?.trim() || input.slug?.trim() || current.slug || nextTitle);

  if (!nextSlug) {
    throw new Error("Unable to derive a valid slug for the updated post.");
  }

  const postId = await upsertPost({
    id: current.id,
    title: nextTitle,
    slug: nextSlug,
    summary: nextSummary,
    tags: normalizeTags(input.tags ?? current.tags),
    content: nextContent,
    cover: input.cover ?? current.cover ?? "",
    status: input.status ?? current.status,
  });

  return readStoredPost(postId);
}

export async function publishManagedPost(reference: { id?: number; slug?: string }): Promise<PostRecord> {
  const current = await requirePost(reference);
  return updateManagedPost({
    id: current.id,
    status: "published",
  });
}

export async function saveDraftManagedPost(reference: { id?: number; slug?: string }): Promise<PostRecord> {
  const current = await requirePost(reference);
  return updateManagedPost({
    id: current.id,
    status: "draft",
  });
}

export async function deleteManagedPost(reference: { id?: number; slug?: string }): Promise<PostRecord> {
  const current = await requirePost(reference);
  await removePost(current.id);
  return current;
}

export async function previewManagedPost(rawInput: PreviewManagedPostInput): Promise<ManagedPostPreview> {
  const input = createPostSchema.omit({ status: true }).parse(rawInput);
  const slug = slugifyTag(input.slug?.trim() || input.title);

  if (!slug) {
    throw new Error("Unable to derive a valid slug from the title.");
  }

  const summary = normalizeSummary(input.summary, input.content);
  const explicitTags = normalizeTagList(input.tags);
  const reading = readingTime(input.content);
  const warnings: string[] = [];
  const headingCount = countMatches(input.content, /^#{1,6}\s+/gm);
  const hasTitleHeading = /^#\s+/m.test(input.content);
  const codeBlockCount = countMatches(input.content, /```/g) / 2;
  const bulletListCount = countMatches(input.content, /^\s*[-*+]\s+/gm);
  const externalLinkCount = countMatches(input.content, /\[[^\]]+\]\(https?:\/\/[^)]+\)/g);
  const imageCount = countMatches(input.content, /!\[[^\]]*\]\([^)]+\)/g);
  const existingTags = isDatabaseConfigured() ? await getAllTags() : [];
  const normalizedTitle = input.title.toLowerCase();
  const normalizedSummary = summary.toLowerCase();
  const normalizedContent = input.content.toLowerCase();
  const tagRecommendations = existingTags
    .map((tag) => ({
      tag,
      ...scoreTagRecommendation(tag, normalizedTitle, normalizedSummary, normalizedContent),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const matchingTagSuggestions = tagRecommendations.map((item) => item.tag);
  const mergedTags = [...new Set([...explicitTags, ...matchingTagSuggestions])];
  const queryTerms = [...new Set(
    input.title
      .toLowerCase()
      .split(/[\s\-_/]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 3)
  )];
  const duplicateCandidates = isDatabaseConfigured()
    ? (await listManagedPosts({ status: "all", limit: 50 }))
        .map((post) => ({
          post,
          scored: scoreDuplicateCandidate(input.title, slug, post, queryTerms),
        }))
        .filter(({ scored }) => scored.score > 0)
        .sort((a, b) => b.scored.score - a.scored.score)
        .slice(0, 5)
        .map(({ post, scored }) => ({
          id: post.id,
          slug: post.slug,
          title: post.title,
          status: post.status,
          updatedAt: post.updatedAt,
          relevanceScore: scored.score,
          matchReasons: scored.reasons,
        }))
    : [];

  let slugExists = false;
  if (isDatabaseConfigured()) {
    slugExists = Boolean(await getAdminPostBySlug(slug));
  }

  if (slugExists) {
    warnings.push(`Slug "${slug}" already exists.`);
  }

  if (duplicateCandidates.length > 0) {
    warnings.push("Potentially related existing posts were found. Review duplicateCandidates before publishing.");
  }

  if (!input.summary?.trim()) {
    warnings.push("Summary was auto-generated from the Markdown body.");
  }

  if (explicitTags.length === 0 && matchingTagSuggestions.length > 0) {
    warnings.push("Tags were inferred from existing tag vocabulary.");
  }

  if (mergedTags.length === 0) {
    warnings.push("No tags were provided or inferred.");
  }

  if (!hasTitleHeading) {
    warnings.push("Markdown body does not start with an H1 heading.");
  }

  if (headingCount < 3) {
    warnings.push("Article structure is light. Consider adding more section headings.");
  }

  if (codeBlockCount === 0) {
    warnings.push("No code blocks detected. This may be fine, but technical posts often benefit from at least one concrete example.");
  }

  const topDuplicate = duplicateCandidates[0];
  const recommendation: ManagedPostPreview["recommendation"] =
    slugExists || (topDuplicate?.relevanceScore ?? 0) >= 80
      ? "update-existing"
      : duplicateCandidates.length > 0
        ? "review"
        : "create";
  const editorNote =
    recommendation === "update-existing"
      ? "A highly similar article already exists. Prefer updating the existing post unless this is intentionally a new angle."
      : recommendation === "review"
        ? "There are related posts in the archive. Review the candidates before deciding whether to create a new article."
        : "This looks like a clean new article candidate. Creating a new draft is reasonable.";
  const slugAlternatives = slugExists ? buildSlugAlternatives(slug) : [];

  return {
    title: input.title,
    slug,
    slugAlternatives,
    summary,
    tags: mergedTags,
    tagRecommendations,
    cover: input.cover,
    readingTime: reading.text,
    wordCount: reading.words,
    slugExists,
    matchingTagSuggestions,
    duplicateCandidates,
    recommendation,
    editorNote,
    qualityChecks: {
      hasTitleHeading,
      headingCount,
      codeBlockCount,
      bulletListCount,
      externalLinkCount,
      imageCount,
    },
    warnings,
  };
}

export async function publishMarkdownArticle(rawInput: CreateManagedPostInput & {
  existingSlug?: string;
}): Promise<PostRecord> {
  assertDatabaseConfigured();

  if (rawInput.existingSlug?.trim()) {
    return updateManagedPost({
      slug: rawInput.existingSlug.trim(),
      title: rawInput.title,
      nextSlug: rawInput.slug,
      summary: rawInput.summary,
      tags: rawInput.tags,
      content: rawInput.content,
      cover: rawInput.cover,
      status: "published",
    });
  }

  return createManagedPost({
    ...rawInput,
    status: "published",
  });
}

export async function saveMarkdownDraft(rawInput: CreateManagedPostInput & {
  existingSlug?: string;
}): Promise<PostRecord> {
  assertDatabaseConfigured();

  if (rawInput.existingSlug?.trim()) {
    return updateManagedPost({
      slug: rawInput.existingSlug.trim(),
      title: rawInput.title,
      nextSlug: rawInput.slug,
      summary: rawInput.summary,
      tags: rawInput.tags,
      content: rawInput.content,
      cover: rawInput.cover,
      status: "draft",
    });
  }

  return createManagedPost({
    ...rawInput,
    status: "draft",
  });
}

export async function listManagedTags(): Promise<string[]> {
  assertDatabaseConfigured();
  return getAllTags();
}
