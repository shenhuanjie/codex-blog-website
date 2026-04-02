import { ActionFeedback } from "@/components/admin/action-feedback";
import { notFound } from "next/navigation";
import Link from "next/link";

import { PostPreviewPanel } from "@/components/admin/post-preview-panel";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { CyberCard } from "@/components/ui/cyber-card";
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <CyberCard variant="terminal" className="space-y-5">
        <div className="space-y-3">
          <p className="font-heading text-2xl uppercase tracking-[0.14em] text-foreground">
            编辑文章
          </p>
          <p className="text-sm text-mutedForeground">
            当前文章 ID: {post.id}，状态: {post.status}
          </p>
          <ActionFeedback kind={query.kind} scope={query.scope} message={query.message} />
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              打开公开预览
            </Link>
          </div>
        </div>
        <PostEditorForm post={post} />
      </CyberCard>
      <PostPreviewPanel post={post} />
    </div>
  );
}
