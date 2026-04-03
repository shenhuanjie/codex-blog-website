import {
  deletePostAction,
  savePostAction,
  savePostAndStayAction,
} from "@/app/admin/actions";
import { ActionFeedback } from "@/components/admin/action-feedback";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { cx } from "@/lib/utils";
import type { PostRecord } from "@/lib/content";

type PostEditorFormProps = {
  post?: PostRecord | null;
  feedback?: {
    kind?: string;
    scope?: string;
    message?: string;
  };
};

export function PostEditorForm({ post, feedback }: PostEditorFormProps) {
  const tagValue = post?.tags.join(", ") ?? "";
  const isPublished = post?.status === "published";
  const draftButtonLabel = post ? "保存草稿" : "创建草稿";
  const publishButtonLabel = post ? (isPublished ? "更新已发布" : "发布并更新") : "创建并发布";
  const quickActionButtonClassName =
    "cyber-chamfer-sm inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-center font-sans text-sm leading-tight font-semibold tracking-[0.04em] whitespace-normal transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:tracking-[0.08em] md:whitespace-nowrap w-full sm:w-auto sm:min-w-36";

  return (
    <div className="space-y-6">
      <form action={savePostAction} className="space-y-5">
        <input type="hidden" name="id" defaultValue={post?.id ?? ""} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
              标题
            </label>
            <CyberInput name="title" defaultValue={post?.title ?? ""} required />
          </div>

          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
              Slug
            </label>
            <CyberInput name="slug" defaultValue={post?.slug ?? ""} required />
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
            摘要
          </label>
          <textarea
            name="summary"
            defaultValue={post?.summary ?? ""}
            required
            rows={3}
            className="cyber-chamfer min-h-28 w-full border border-input bg-input px-4 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
              标签
            </label>
            <CyberInput
              name="tags"
              defaultValue={tagValue}
              placeholder="React, Performance, AI"
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
              状态
            </label>
            <select
              name="status"
              defaultValue={post?.status ?? "draft"}
              className="cyber-chamfer min-h-11 w-full border border-input bg-input px-4 py-2 text-sm text-accent outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
            封面 URL
          </label>
          <CyberInput name="cover" defaultValue={post?.cover ?? ""} />
        </div>

        <div className="space-y-2">
          <label className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
            Markdown 内容
          </label>
          <textarea
            name="content"
            defaultValue={post?.content ?? ""}
            required
            rows={18}
            className="min-h-[28rem] w-full border border-input bg-[#090a10] px-4 py-3 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
          <CyberButton type="submit" className="w-full sm:w-auto sm:min-w-36">
            {post ? "更新文章" : "创建文章"}
          </CyberButton>
          <button
            type="submit"
            className={cx(
              quickActionButtonClassName,
              "border-2 border-accent bg-transparent text-accent hover:bg-accent/10 hover:text-accent hover:shadow-[var(--box-shadow-neon-sm)]"
            )}
            formAction={savePostAndStayAction}
            name="_intent"
            value="draft"
          >
            {draftButtonLabel}
          </button>
          <button
            type="submit"
            className={cx(
              quickActionButtonClassName,
              "border-2 border-accentSecondary bg-transparent text-accentSecondary hover:bg-accentSecondary/10 hover:text-accentSecondary hover:shadow-[var(--box-shadow-neon-secondary)]"
            )}
            formAction={savePostAndStayAction}
            name="_intent"
            value="publish"
          >
            {publishButtonLabel}
          </button>
          <CyberButton href="/admin/posts" variant="outline" className="w-full sm:w-auto">
            返回列表
          </CyberButton>
        </div>

        <ActionFeedback kind={feedback?.kind} scope={feedback?.scope} message={feedback?.message} />

        <p className="text-xs uppercase tracking-[0.18em] text-mutedForeground">
          当前工作流: {isPublished ? "published" : "draft"} / 快速按钮会直接保存并跳转回编辑页。
        </p>
      </form>

      {post ? (
        <form action={deletePostAction}>
          <input type="hidden" name="id" value={post.id} />
          <CyberButton type="submit" variant="secondary" className="w-full sm:w-auto">删除文章</CyberButton>
        </form>
      ) : null}
    </div>
  );
}
