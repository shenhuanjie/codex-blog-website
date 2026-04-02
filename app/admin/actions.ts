"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addAdminUser, removeAdminUser, getAdminUsersCount } from "@/lib/admin/admin-users";
import { createMcpToken, revokeMcpToken } from "@/lib/admin/mcp-tokens";
import { mergeTags, removeTag, renameTag } from "@/lib/admin/tags";
import { getAdminSession } from "@/lib/auth/session";
import { upsertPost, removePost } from "@/lib/admin/posts";
import { getAdminGithubLogins } from "@/lib/env";

function requireString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function getIntent(formData: FormData): string {
  return requireString(formData, "_intent").trim();
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

export type CreateMcpTokenActionState = {
  kind: "idle" | "success" | "error";
  message?: string;
  token?: string;
  tokenPrefix?: string;
};

export async function savePostAction(formData: FormData) {
  await assertAdmin();
  const rawId = requireString(formData, "id");
  const intent = getIntent(formData);
  const statusField = requireString(formData, "status") as "draft" | "published";
  const nextStatus =
    intent === "publish"
      ? "published"
      : intent === "draft"
        ? "draft"
        : statusField;

  const id = await upsertPost({
    id: rawId ? Number(rawId) : undefined,
    title: requireString(formData, "title"),
    slug: requireString(formData, "slug"),
    summary: requireString(formData, "summary"),
    cover: requireString(formData, "cover"),
    content: requireString(formData, "content"),
    tags: requireString(formData, "tags"),
    status: nextStatus,
  });

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath(`/blog/${requireString(formData, "slug")}`);
  redirectWithFeedback(`/admin/posts/${id}`, {
    kind: "success",
    scope: "post-save",
    message:
      nextStatus === "published"
        ? "Article is published and the public route has been refreshed."
        : "Draft saved. The post is still hidden from the public blog.",
  });
}

export async function savePostAndStayAction(formData: FormData) {
  await assertAdmin();
  const rawId = requireString(formData, "id");
  const slug = requireString(formData, "slug");
  const intent = getIntent(formData);
  const statusField = requireString(formData, "status") as "draft" | "published";
  const nextStatus =
    intent === "publish"
      ? "published"
      : intent === "draft"
        ? "draft"
        : statusField;

  const id = await upsertPost({
    id: rawId ? Number(rawId) : undefined,
    title: requireString(formData, "title"),
    slug,
    summary: requireString(formData, "summary"),
    cover: requireString(formData, "cover"),
    content: requireString(formData, "content"),
    tags: requireString(formData, "tags"),
    status: nextStatus,
  });

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath(`/blog/${slug}`);
  redirectWithFeedback(`/admin/posts/${id}`, {
    kind: "success",
    scope: "post-save",
    message:
      nextStatus === "published"
        ? "Article updated in published mode."
        : "Draft updated. You can keep editing before publishing.",
  });
}

export async function deletePostAction(formData: FormData) {
  await assertAdmin();

  const id = Number(formData.get("id"));

  if (!Number.isFinite(id)) {
    throw new Error("Invalid post id");
  }

  await removePost(id);

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  redirectWithFeedback("/admin/posts", {
    kind: "success",
    scope: "post-delete",
    message: "Article deleted.",
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
    const created = await createMcpToken(label, session.user?.login ?? "unknown");

    revalidatePath("/admin");
    revalidatePath("/admin/tokens");

    return {
      kind: "success",
      message: "MCP token created. Copy it now; the plaintext value will not be shown again.",
      token: created.token,
      tokenPrefix: created.record.tokenPrefix,
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
