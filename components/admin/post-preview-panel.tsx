import Link from "next/link";

import { MDXRenderer } from "@/components/blog/mdx-renderer";
import { CyberCard } from "@/components/ui/cyber-card";
import { TagChip } from "@/components/ui/tag-chip";
import { getPostPreviewHref, getPostPreviewLabel } from "@/lib/admin/post-workflow";
import type { PostRecord } from "@/lib/content";
import { formatDate } from "@/lib/utils";
import { slugifyTag } from "@/lib/utils";

type PostPreviewPanelProps = {
  post?: PostRecord | null;
};

export function PostPreviewPanel({ post }: PostPreviewPanelProps) {
  if (!post) {
    return (
      <CyberCard variant="holographic" className="space-y-4">
        <p className="font-label text-xs uppercase tracking-[0.24em] text-accent">
          Preview
        </p>
        <p className="text-sm text-mutedForeground">
          保存后这里会显示文章预览。先填写标题、摘要和正文，再点击发布或保存草稿。
        </p>
      </CyberCard>
    );
  }

  const previewHref = getPostPreviewHref(post);
  const previewLabel = getPostPreviewLabel(post.status);

  return (
    <CyberCard variant="holographic" className="space-y-6">
      <div className="space-y-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-label text-xs uppercase tracking-[0.24em] text-accent">
            Preview
          </p>
          <span className="font-label text-[11px] uppercase tracking-[0.2em] text-mutedForeground">
            {post.status}
          </span>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-mutedForeground">
          这里显示最近一次保存后的内容，未保存改动不会同步到预览。
        </p>
        <p className="font-heading text-2xl uppercase tracking-[0.12em] text-foreground">
          {post.title}
        </p>
        <p className="text-sm text-mutedForeground">{post.summary}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.16em] text-mutedForeground">
          <span className="inline-flex items-center gap-1.5">
            <span className="font-label text-accent">DT</span>
            {formatDate(post.publishedAt ?? post.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-label text-accent">ST</span>
            {post.status}
          </span>
          <Link
            href={previewHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center text-center text-xs uppercase tracking-[0.2em] text-accent transition-colors hover:text-accentSecondary sm:w-auto"
          >
            {previewLabel}
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <TagChip key={tag} tag={tag} href={`/blog/tag/${slugifyTag(tag)}`} />
          ))}
        </div>
      </div>

      <div className="prose prose-invert max-w-none prose-headings:font-heading prose-headings:uppercase prose-headings:tracking-[0.08em] prose-p:text-sm prose-p:leading-7 prose-p:text-foreground prose-a:text-accent prose-a:no-underline hover:prose-a:text-accentSecondary">
        <MDXRenderer source={post.content} />
      </div>
    </CyberCard>
  );
}
