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
  selectedTags: string[];
  suggestedTags: string[];
  tagRecommendations: Array<{
    tag: string;
    score: number;
    priority: "high" | "medium" | "low";
    matchedIn: Array<"title" | "summary" | "headings" | "content" | "code">;
    reasons: string[];
  }>;
  tagConfidence: "strong" | "mixed" | "weak";
  tagRecommendationNotes: string[];
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
    similarityBand: "likely_same_article" | "strong_overlap" | "related_topic";
    scoreBreakdown: {
      slug: number;
      title: number;
      summary: number;
      tags: number;
      body: number;
      heading: number;
    };
    matchedTags: string[];
    matchedTitleTerms: string[];
    matchReasons: string[];
  }>;
  topDuplicateScore: number | null;
  topDuplicateBand: "likely_same_article" | "strong_overlap" | "related_topic" | null;
  shouldUpdateExisting: boolean;
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

function buildSlugAlternatives(baseSlug: string): string[] {
  return Array.from({ length: 3 }, (_, index) => `${baseSlug}-${index + 2}`);
}

function countMatches(input: string, pattern: RegExp): number {
  return input.match(pattern)?.length ?? 0;
}

function normalizeMarkdownText(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, " $1 ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, " $1 ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
    .replace(/^#{1,6}\s+/gm, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[>*_~[\]()`|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractCodeText(input: string): string {
  return (input.match(/```[\s\S]*?```/g) ?? [])
    .join(" ")
    .replace(/```[\w-]*\n?/g, " ")
    .replace(/```/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractHeadingText(input: string): string {
  return (input.match(/^#{1,6}\s+.+$/gm) ?? [])
    .map((line) => line.replace(/^#{1,6}\s+/, "").trim())
    .join(" ")
    .toLowerCase();
}

function extractProseText(input: string): string {
  return normalizeMarkdownText(
    input
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/^#{1,6}\s+.+$/gm, " ")
  );
}

function buildBodyExcerpt(input: string): string {
  return extractProseText(input).slice(0, 1200);
}

function tokenizeForSimilarity(input: string): string[] {
  const normalized = normalizeMarkdownText(input);
  const latinTokens = normalized.match(/[a-z0-9]{2,}/g) ?? [];
  const cjkRuns = normalized.match(/[\u3400-\u9fff]+/g) ?? [];
  const cjkNgrams = cjkRuns.flatMap((run) => {
    if (run.length === 1) {
      return [run];
    }

    const grams: string[] = [];
    for (let index = 0; index < run.length - 1; index += 1) {
      grams.push(run.slice(index, index + 2));
    }
    return grams;
  });

  return [...new Set([...latinTokens, ...cjkNgrams])];
}

function diceCoefficient(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let intersection = 0;

  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  return (2 * intersection) / (leftSet.size + rightSet.size);
}

function jaccardSimilarity(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let intersection = 0;

  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function countTermOccurrences(haystack: string, needle: string): number {
  if (!haystack || !needle) {
    return 0;
  }

  return haystack.split(needle).length - 1;
}

type SimilarityProfile = {
  title: string;
  slug: string;
  summary: string;
  tags: string[];
  titleTokens: string[];
  summaryTokens: string[];
  headingTokens: string[];
  bodyTokens: string[];
  leadingHeading: string;
};

function buildSimilarityProfile(input: {
  title: string;
  slug: string;
  summary: string;
  tags?: string[];
  content: string;
}): SimilarityProfile {
  const headingLines = (input.content.match(/^#{1,6}\s+.+$/gm) ?? [])
    .map((line) => line.replace(/^#{1,6}\s+/, "").trim())
    .filter(Boolean);
  const headingText = headingLines.join(" ");
  const bodyExcerpt = buildBodyExcerpt(input.content);

  return {
    title: normalizeMarkdownText(input.title),
    slug: slugifyTag(input.slug),
    summary: normalizeMarkdownText(input.summary),
    tags: normalizeTagList(input.tags).map((tag) => slugifyTag(tag)),
    titleTokens: tokenizeForSimilarity(input.title),
    summaryTokens: tokenizeForSimilarity(input.summary),
    headingTokens: tokenizeForSimilarity(headingText),
    bodyTokens: tokenizeForSimilarity(bodyExcerpt),
    leadingHeading: normalizeMarkdownText(headingLines[0] ?? ""),
  };
}

function scoreDuplicateCandidate(input: SimilarityProfile, post: PostRecord): {
  score: number;
  band: "likely_same_article" | "strong_overlap" | "related_topic";
  reasons: string[];
  scoreBreakdown: {
    slug: number;
    title: number;
    summary: number;
    tags: number;
    body: number;
    heading: number;
  };
  matchedTags: string[];
  matchedTitleTerms: string[];
} {
  const postProfile = buildSimilarityProfile({
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    tags: post.tags,
    content: post.content,
  });

  const matchedTags = input.tags.filter((tag) => postProfile.tags.includes(tag));
  const matchedTitleTerms = input.titleTokens.filter((token) => postProfile.titleTokens.includes(token)).slice(0, 6);
  const scoreBreakdown = {
    slug: postProfile.slug === input.slug ? 100 : 0,
    title: Math.round(diceCoefficient(input.titleTokens, postProfile.titleTokens) * 35),
    summary: Math.round(diceCoefficient(input.summaryTokens, postProfile.summaryTokens) * 20),
    tags: Math.round(jaccardSimilarity(input.tags, postProfile.tags) * 20),
    body: Math.round(diceCoefficient(input.bodyTokens, postProfile.bodyTokens) * 20),
    heading:
      input.leadingHeading && postProfile.leadingHeading && input.leadingHeading === postProfile.leadingHeading
        ? 10
        : Math.round(diceCoefficient(input.headingTokens, postProfile.headingTokens) * 10),
  };

  const score = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0);
  const band =
    score >= 85
      ? "likely_same_article"
      : score >= 65
        ? "strong_overlap"
        : "related_topic";
  const reasons: string[] = [];

  if (scoreBreakdown.slug === 100) {
    reasons.push("Exact slug match");
  }

  if (scoreBreakdown.title >= 28) {
    reasons.push("Title similarity is very high");
  } else if (scoreBreakdown.title >= 18) {
    reasons.push("Title terms overlap strongly");
  }

  if (scoreBreakdown.summary >= 12) {
    reasons.push("Summary framing overlaps with an existing post");
  }

  if (matchedTags.length > 0) {
    reasons.push(`Shared tags: ${matchedTags.join(", ")}`);
  }

  if (scoreBreakdown.body >= 12) {
    reasons.push("Body excerpt discusses a very similar topic");
  }

  if (scoreBreakdown.heading >= 8) {
    reasons.push("Heading structure closely matches an existing article");
  }

  if (matchedTitleTerms.length > 0) {
    reasons.push(`Shared title terms: ${matchedTitleTerms.join(", ")}`);
  }

  return {
    score,
    band,
    reasons,
    scoreBreakdown,
    matchedTags,
    matchedTitleTerms,
  };
}

function buildTagCooccurrence(posts: PostRecord[], explicitTags: string[]): Map<string, number> {
  const explicitSet = new Set(explicitTags.map((tag) => slugifyTag(tag)));
  const cooccurrence = new Map<string, number>();

  if (explicitSet.size === 0) {
    return cooccurrence;
  }

  for (const post of posts) {
    const normalizedPostTags = post.tags.map((tag) => slugifyTag(tag));
    if (!normalizedPostTags.some((tag) => explicitSet.has(tag))) {
      continue;
    }

    for (const tag of normalizedPostTags) {
      if (explicitSet.has(tag)) {
        continue;
      }

      cooccurrence.set(tag, (cooccurrence.get(tag) ?? 0) + 1);
    }
  }

  return cooccurrence;
}

function scoreTagRecommendation(
  tag: string,
  context: {
    title: string;
    summary: string;
    headings: string;
    prose: string;
    code: string;
    titleTokens: string[];
    summaryTokens: string[];
    headingTokens: string[];
    proseTokens: string[];
  },
  relatedTagBoost: number
): {
  score: number;
  priority: "high" | "medium" | "low";
  matchedIn: Array<"title" | "summary" | "headings" | "content" | "code">;
  reasons: string[];
} {
  const normalizedTag = normalizeMarkdownText(tag);
  const tagTokens = tokenizeForSimilarity(tag);
  const matchedIn = new Set<"title" | "summary" | "headings" | "content" | "code">();
  const reasons: string[] = [];
  let score = 0;

  if (context.title.includes(normalizedTag)) {
    score += 24;
    matchedIn.add("title");
    reasons.push(`Title directly names "${tag}"`);
  } else {
    const titleSimilarity = diceCoefficient(tagTokens, context.titleTokens);
    if (titleSimilarity >= 0.5) {
      score += 16;
      matchedIn.add("title");
      reasons.push(`Title terms strongly align with "${tag}"`);
    }
  }

  if (context.summary.includes(normalizedTag)) {
    score += 12;
    matchedIn.add("summary");
    reasons.push(`Summary explicitly references "${tag}"`);
  } else {
    const summarySimilarity = diceCoefficient(tagTokens, context.summaryTokens);
    if (summarySimilarity >= 0.45) {
      score += 8;
      matchedIn.add("summary");
      reasons.push(`Summary reinforces "${tag}"`);
    }
  }

  if (context.headings.includes(normalizedTag)) {
    score += 10;
    matchedIn.add("headings");
    reasons.push(`Section headings support "${tag}"`);
  } else {
    const headingSimilarity = diceCoefficient(tagTokens, context.headingTokens);
    if (headingSimilarity >= 0.45) {
      score += 6;
      matchedIn.add("headings");
      reasons.push(`Heading structure suggests "${tag}"`);
    }
  }

  const proseHits = countTermOccurrences(context.prose, normalizedTag);
  if (proseHits > 0) {
    score += Math.min(proseHits * 2, 10);
    matchedIn.add("content");
    reasons.push(`Body prose mentions "${tag}" ${proseHits} time${proseHits > 1 ? "s" : ""}`);
  } else {
    const proseSimilarity = diceCoefficient(tagTokens, context.proseTokens);
    if (proseSimilarity >= 0.45) {
      score += 6;
      matchedIn.add("content");
      reasons.push(`Body discussion is closely related to "${tag}"`);
    }
  }

  const codeHits = countTermOccurrences(context.code, normalizedTag);
  if (codeHits > 0) {
    matchedIn.add("code");
    if (matchedIn.size === 1) {
      score += 1;
      reasons.push(`"${tag}" only appears in code snippets, so confidence stays low`);
    } else {
      reasons.push(`Code examples also reference "${tag}"`);
    }
  }

  if (relatedTagBoost > 0) {
    score += Math.min(relatedTagBoost * 2, 6);
    reasons.push(`Frequently co-occurs with the selected tags in existing posts`);
  }

  if (normalizedTag.length <= 2 && score < 18) {
    score -= 6;
    reasons.push(`Very short tag with weak evidence, so it was down-weighted`);
  }

  const priority =
    score >= 28
      ? "high"
      : score >= 16
        ? "medium"
        : "low";

  return {
    score,
    priority,
    matchedIn: [...matchedIn],
    reasons,
  };
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
  const existingPosts = isDatabaseConfigured() ? await getAdminPostRecords() : [];
  const normalizedTitle = normalizeMarkdownText(input.title);
  const normalizedSummary = normalizeMarkdownText(summary);
  const normalizedHeadings = extractHeadingText(input.content);
  const normalizedProse = extractProseText(input.content);
  const normalizedCode = extractCodeText(input.content);
  const normalizedExplicitTags = explicitTags.map((tag) => slugifyTag(tag));
  const tagCooccurrence = buildTagCooccurrence(existingPosts, explicitTags);
  const titleTokens = tokenizeForSimilarity(input.title);
  const summaryTokens = tokenizeForSimilarity(summary);
  const headingTokens = tokenizeForSimilarity(normalizedHeadings);
  const proseTokens = tokenizeForSimilarity(normalizedProse);
  const tagRecommendations = existingTags
    .filter((tag) => !normalizedExplicitTags.includes(slugifyTag(tag)))
    .map((tag) => {
      const normalizedTag = slugifyTag(tag);
      return {
        tag,
        ...scoreTagRecommendation(
          tag,
          {
            title: normalizedTitle,
            summary: normalizedSummary,
            headings: normalizedHeadings,
            prose: normalizedProse,
            code: normalizedCode,
            titleTokens,
            summaryTokens,
            headingTokens,
            proseTokens,
          },
          tagCooccurrence.get(normalizedTag) ?? 0
        ),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const matchingTagSuggestions = tagRecommendations
    .filter((item) => item.priority !== "low" || item.score >= 12)
    .map((item) => item.tag);
  const mergedTags = [...new Set([...explicitTags, ...matchingTagSuggestions])];
  const inputProfile = buildSimilarityProfile({
    title: input.title,
    slug,
    summary,
    tags: mergedTags,
    content: input.content,
  });
  const duplicateCandidates = isDatabaseConfigured()
    ? existingPosts
        .map((post) => ({
          post,
          scored: scoreDuplicateCandidate(inputProfile, post),
        }))
        .filter(({ scored }) => scored.score >= 40)
        .sort((a, b) => b.scored.score - a.scored.score)
        .slice(0, 5)
        .map(({ post, scored }) => ({
          id: post.id,
          slug: post.slug,
          title: post.title,
          status: post.status,
          updatedAt: post.updatedAt,
          relevanceScore: scored.score,
          similarityBand: scored.band,
          scoreBreakdown: scored.scoreBreakdown,
          matchedTags: scored.matchedTags,
          matchedTitleTerms: scored.matchedTitleTerms,
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

  const tagRecommendationNotes = tagRecommendations.length > 0
    ? tagRecommendations.slice(0, 3).map((item) => {
        const signal = item.reasons[0] ?? `The article has supporting signals for "${item.tag}"`;
        return `${item.tag}: ${signal}`;
      })
    : ["No strong tag recommendations were found from the current vocabulary."];

  const tagConfidence: ManagedPostPreview["tagConfidence"] =
    explicitTags.length > 0 || tagRecommendations.some((item) => item.priority === "high")
      ? "strong"
      : tagRecommendations.some((item) => item.priority === "medium")
        ? "mixed"
        : "weak";

  if (mergedTags.length === 0) {
    warnings.push("No tags were provided or inferred.");
  }

  if (tagConfidence === "weak" && explicitTags.length === 0) {
    warnings.push("Tag signals are weak. Consider adding one or two explicit tags before publishing.");
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
  const topDuplicateScore = topDuplicate?.relevanceScore ?? null;
  const topDuplicateBand = topDuplicate?.similarityBand ?? null;
  const shouldUpdateExisting = slugExists || topDuplicateBand === "likely_same_article";
  const recommendation: ManagedPostPreview["recommendation"] =
    shouldUpdateExisting
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
    selectedTags: explicitTags,
    suggestedTags: matchingTagSuggestions,
    tagRecommendations,
    tagConfidence,
    tagRecommendationNotes,
    cover: input.cover,
    readingTime: reading.text,
    wordCount: reading.words,
    slugExists,
    matchingTagSuggestions,
    duplicateCandidates,
    topDuplicateScore,
    topDuplicateBand,
    shouldUpdateExisting,
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
