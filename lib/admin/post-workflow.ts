import type { PostStatus } from "@/lib/db/schema";

export type PostSaveFeedbackMode = "redirect" | "stay";

export function resolveRequestedPostStatus(
  intent: string,
  statusField: PostStatus
): PostStatus {
  if (intent === "publish") {
    return "published";
  }

  if (intent === "draft") {
    return "draft";
  }

  return statusField;
}

export function getPostPreviewHref(input: {
  slug: string;
  status: PostStatus;
}): string {
  return input.status === "published"
    ? `/blog/${input.slug}`
    : `/blog/${input.slug}?preview=draft`;
}

export function getPostPreviewLabel(status: PostStatus): string {
  return status === "published" ? "Open Public Preview" : "Open Draft Preview";
}

export function getPostSaveFeedback(
  status: PostStatus,
  mode: PostSaveFeedbackMode
): {
  kind: "success";
  scope: "post-save";
  message: string;
} {
  if (mode === "stay") {
    return {
      kind: "success",
      scope: "post-save",
      message:
        status === "published"
          ? "Published article updated. Public preview reflects the latest saved content."
          : "Draft updated. Draft preview reflects the latest saved content.",
    };
  }

  return {
    kind: "success",
    scope: "post-save",
    message:
      status === "published"
        ? "Published article saved. Public preview is live."
        : "Draft saved. Open draft preview to review the latest saved content.",
  };
}
