"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addAdminUser, removeAdminUser, getAdminUsersCount } from "@/lib/admin/admin-users";
import { createMcpToken, revokeMcpToken } from "@/lib/admin/mcp-tokens";
import { getPostSaveFeedback, resolveRequestedPostStatus } from "@/lib/admin/post-workflow";
import { mergeTags, removeTag, renameTag } from "@/lib/admin/tags";
import { getAdminSession } from "@/lib/auth/session";
import { upsertPost, removePost } from "@/lib/admin/posts";
import { getAdminGithubLogins } from "@/lib/env";
import { getAdminPostById } from "@/lib/content";
import type { PostStatus } from "@/lib/db/schema";
import { previewManagedPost, type ManagedPostPreview } from "@/lib/services/post-publishing";
import { slugifyTag } from "@/lib/utils";

function requireString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function getIntent(formData: FormData): string {
  return requireString(formData, "_intent").trim();
}

function getSubmittedStatus(formData: FormData): PostStatus {
  return requireString(formData, "status") === "published" ? "published" : "draft";
}

function parseSubmittedTags(input: string): string[] {
  return [...new Set(
    input
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

async function assertAdmin() {
  const session = await getAdminSession();

  if (!session) {
    throw new Error("Unauthorized");
  }
}

function redirectWithFeedback(
  path: string,
  feedback: {
    kind: "success" | "error";
    scope: string;
    message: string;
  }
) {
  const params = new URLSearchParams({
    kind: feedback.kind,
    scope: feedback.scope,
    message: feedback.message,
  });

  redirect(`${path}?${params.toString()}`);
}

function revalidatePostMutationPaths(input: {
  nextSlug: string;
  nextTags: string[];
  previousSlug?: string | null;
  previousTags?: string[];
  adminPostId?: number;
}) {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath(`/blog/${input.nextSlug}`);

  if (typeof input.adminPostId === "number") {
    revalidatePath(`/admin/posts/${input.adminPostId}`);
  }

  if (input.previousSlug && input.previousSlug !== input.nextSlug) {
    revalidatePath(`/blog/${input.previousSlug}`);
  }

  const affectedTagSlugs = new Set(
    [...(input.previousTags ?? []), ...input.nextTags]
      .map((tag) => slugifyTag(tag))
      .filter(Boolean)
  );

  for (const tagSlug of affectedTagSlugs) {
    revalidatePath(`/blog/tag/${tagSlug}`);
  }
}

export type CreateMcpTokenActionState = {
  kind: "idle" | "success" | "error";
  message?: string;
  token?: string;
  tokenPrefix?: string;
  scope?: "read" | "write";
};

export type AnalyzeDraftActionState = {
  kind: "idle" | "success" | "error";
  message?: string;
  preview?: ManagedPostPreview;
};

export async function analyzeDraftAction(
  _previousState: AnalyzeDraftActionState,
  formData: FormData
): Promise<AnalyzeDraftActionState> {
  try {
    await assertAdmin();

    const preview = await previewManagedPost({
      title: requireString(formData, "title"),
      slug: requireString(formData, "slug") || undefined,
      summary: requireString(formData, "summary") || undefined,
      tags: parseSubmittedTags(requireString(formData, "tags")),
      content: requireString(formData, "content"),
      cover: requireString(formData, "cover") || undefined,
    });

    return {
      kind: "success",
      message: "Draft analysis updated.",
      preview,
    };
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Failed to analyze draft.",
    };
  }
}

export async function savePostAction(formData: FormData) {
  await assertAdmin();
  const rawId = requireString(formData, "id");
  const intent = getIntent(formData);
  const submittedStatus = getSubmittedStatus(formData);
  const nextStatus = resolveRequestedPostStatus(intent, submittedStatus);
  const slug = requireString(formData, "slug");
  const normalizedSlug = slugifyTag(slug);
  const tags = parseSubmittedTags(requireString(formData, "tags"));
  const previousPost = rawId ? await getAdminPostById(Number(rawId)) : null;

  const id = await upsertPost({
    id: rawId ? Number(rawId) : undefined,
    title: requireString(formData, "title"),
    slug: normalizedSlug,
    summary: requireString(formData, "summary"),
    cover: requireString(formData, "cover"),
    content: requireString(formData, "content"),
    tags: requireString(formData, "tags"),
    status: nextStatus,
  });

  revalidatePostMutationPaths({
    nextSlug: normalizedSlug,
    nextTags: tags,
    previousSlug: previousPost?.slug,
    previousTags: previousPost?.tags,
    adminPostId: id,
  });
  redirectWithFeedback(`/admin/posts/${id}`, getPostSaveFeedback(nextStatus, "redirect"));
}

export async function savePostAndStayAction(formData: FormData) {
  await assertAdmin();
  const rawId = requireString(formData, "id");
  const intent = getIntent(formData);
  const submittedStatus = getSubmittedStatus(formData);
  const nextStatus = resolveRequestedPostStatus(intent, submittedStatus);
  const slug = requireString(formData, "slug");
  const normalizedSlug = slugifyTag(slug);
  const tags = parseSubmittedTags(requireString(formData, "tags"));
  const previousPost = rawId ? await getAdminPostById(Number(rawId)) : null;

  const id = await upsertPost({
    id: rawId ? Number(rawId) : undefined,
    title: requireString(formData, "title"),
    slug: normalizedSlug,
    summary: requireString(formData, "summary"),
    cover: requireString(formData, "cover"),
    content: requireString(formData, "content"),
    tags: requireString(formData, "tags"),
    status: nextStatus,
  });

  revalidatePostMutationPaths({
    nextSlug: normalizedSlug,
    nextTags: tags,
    previousSlug: previousPost?.slug,
    previousTags: previousPost?.tags,
    adminPostId: id,
  });
  redirectWithFeedback(`/admin/posts/${id}`, getPostSaveFeedback(nextStatus, "stay"));
}

export async function deletePostAction(formData: FormData) {
  await assertAdmin();

  const id = Number(formData.get("id"));

  if (!Number.isFinite(id)) {
    throw new Error("Invalid post id");
  }

  const existingPost = await getAdminPostById(id);
  await removePost(id);

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);

  if (existingPost) {
    revalidatePath(`/blog/${existingPost.slug}`);

    for (const tag of existingPost.tags) {
      const tagSlug = slugifyTag(tag);

      if (tagSlug) {
        revalidatePath(`/blog/tag/${tagSlug}`);
      }
    }
  }

  redirectWithFeedback("/admin/posts", {
    kind: "success",
    scope: "post-delete",
    message: "Article deleted. Related previews and tag pages were refreshed.",
  });
}

export async function addAdminUserAction(formData: FormData) {
  await assertAdmin();

  const githubLogin = requireString(formData, "githubLogin");
  await addAdminUser(githubLogin);

  revalidatePath("/admin");
  revalidatePath("/admin/admins");
  redirectWithFeedback("/admin/admins", {
    kind: "success",
    scope: "admin-add",
    message: `Added @${githubLogin.trim().toLowerCase()} to admin_users.`,
  });
}

export async function deleteAdminUserAction(formData: FormData) {
  await assertAdmin();

  const id = Number(formData.get("id"));

  if (!Number.isFinite(id)) {
    throw new Error("Invalid admin id");
  }

  const [totalAdmins, envAdmins] = await Promise.all([
    getAdminUsersCount(),
    Promise.resolve(getAdminGithubLogins()),
  ]);

  if (totalAdmins <= 1 && envAdmins.length === 0) {
    throw new Error("Cannot remove the last admin user.");
  }

  await removeAdminUser(id);

  revalidatePath("/admin");
  revalidatePath("/admin/admins");
  redirectWithFeedback("/admin/admins", {
    kind: "success",
    scope: "admin-delete",
    message: "Admin record deleted.",
  });
}

export async function createMcpTokenAction(
  _previousState: CreateMcpTokenActionState,
  formData: FormData
): Promise<CreateMcpTokenActionState> {
  try {
    const session = await getAdminSession();

    if (!session) {
      return {
        kind: "error",
        message: "Unauthorized",
      };
    }

    const label = requireString(formData, "label");
    const scope = requireString(formData, "scope") as "read" | "write";
    const created = await createMcpToken(label, scope, session.user?.login ?? "unknown");

    revalidatePath("/admin");
    revalidatePath("/admin/tokens");

    return {
      kind: "success",
      message: "MCP token created. Copy it now; the plaintext value will not be shown again.",
      token: created.token,
      tokenPrefix: created.record.tokenPrefix,
      scope: created.record.scope,
    };
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Failed to create MCP token.",
    };
  }
}

export async function revokeMcpTokenAction(formData: FormData) {
  await assertAdmin();

  const id = Number(formData.get("id"));

  if (!Number.isFinite(id)) {
    redirectWithFeedback("/admin/tokens", {
      kind: "error",
      scope: "mcp-token-revoke",
      message: "Invalid token id.",
    });
  }

  try {
    await revokeMcpToken(id);
    revalidatePath("/admin");
    revalidatePath("/admin/tokens");
    redirectWithFeedback("/admin/tokens", {
      kind: "success",
      scope: "mcp-token-revoke",
      message: "MCP token revoked.",
    });
  } catch (error) {
    redirectWithFeedback("/admin/tokens", {
      kind: "error",
      scope: "mcp-token-revoke",
      message: error instanceof Error ? error.message : "Failed to revoke MCP token.",
    });
  }
}

export async function deleteTagAction(formData: FormData) {
  await assertAdmin();

  const id = Number(formData.get("id"));

  if (!Number.isFinite(id)) {
    redirectWithFeedback("/admin/tags", {
      kind: "error",
      scope: "tag-delete",
      message: "Invalid tag id.",
    });
  }

  try {
    await removeTag(id);

    revalidatePath("/admin");
    revalidatePath("/admin/tags");
    redirectWithFeedback("/admin/tags", {
      kind: "success",
      scope: "tag-delete",
      message: "Tag deleted.",
    });
  } catch (error) {
    redirectWithFeedback("/admin/tags", {
      kind: "error",
      scope: "tag-delete",
      message: error instanceof Error ? error.message : "Failed to delete tag.",
    });
  }
}

export async function renameTagAction(formData: FormData) {
  await assertAdmin();

  const id = Number(formData.get("id"));
  const name = requireString(formData, "name");

  if (!Number.isFinite(id)) {
    redirectWithFeedback("/admin/tags", {
      kind: "error",
      scope: "tag-rename",
      message: "Invalid tag id.",
    });
  }

  try {
    const tag = await renameTag(id, name);

    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/admin");
    revalidatePath("/admin/tags");
    revalidatePath(`/blog/tag/${tag.previousSlug}`);
    revalidatePath(`/blog/tag/${tag.slug}`);

    redirectWithFeedback("/admin/tags", {
      kind: "success",
      scope: "tag-rename",
      message: `Renamed to ${tag.name}.`,
    });
  } catch (error) {
    redirectWithFeedback("/admin/tags", {
      kind: "error",
      scope: "tag-rename",
      message: error instanceof Error ? error.message : "Failed to rename tag.",
    });
  }
}

export async function mergeTagsAction(formData: FormData) {
  await assertAdmin();

  const sourceId = Number(formData.get("sourceId"));
  const targetId = Number(formData.get("targetId"));

  if (!Number.isFinite(sourceId) || !Number.isFinite(targetId)) {
    redirectWithFeedback("/admin/tags", {
      kind: "error",
      scope: "tag-merge",
      message: "Invalid tag selection.",
    });
  }

  try {
    const merged = await mergeTags(sourceId, targetId);

    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/admin");
    revalidatePath("/admin/tags");
    revalidatePath(`/blog/tag/${merged.sourceSlug}`);
    revalidatePath(`/blog/tag/${merged.targetSlug}`);

    redirectWithFeedback("/admin/tags", {
      kind: "success",
      scope: "tag-merge",
      message: "Tags merged.",
    });
  } catch (error) {
    redirectWithFeedback("/admin/tags", {
      kind: "error",
      scope: "tag-merge",
      message: error instanceof Error ? error.message : "Failed to merge tags.",
    });
  }
}
