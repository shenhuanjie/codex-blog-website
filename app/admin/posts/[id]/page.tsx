import { notFound } from "next/navigation";

import { PostPreviewPanel } from "@/components/admin/post-preview-panel";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { getAdminPostById } from "@/lib/content";

type AdminPostDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    kind?: string;
    scope?: string;
    message?: string;
  }>;
};

export default async function AdminPostDetailPage({
  params,
  searchParams,
}: AdminPostDetailPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const postId = Number(id);

  if (!Number.isFinite(postId)) {
    notFound();
  }

  const post = await getAdminPostById(postId);

  if (!post) {
    notFound();
  }

  return (
    <PostEditorForm
      key={`post-editor-${post.id}-${post.updatedAt}`}
      heading="编辑文章"
      description={`当前文章 ID: ${post.id}，最近更新 ${new Date(post.updatedAt).toLocaleString("zh-CN")}，当前状态 ${post.status}。`}
      post={post}
      previewPanel={<PostPreviewPanel post={post} />}
      feedback={{
        kind: query.kind,
        scope: query.scope,
        message: query.message,
      }}
    />
  );
}
