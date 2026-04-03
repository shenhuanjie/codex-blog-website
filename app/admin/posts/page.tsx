import Link from "next/link";

import { ActionFeedback } from "@/components/admin/action-feedback";
import { CyberCard } from "@/components/ui/cyber-card";
import { CyberButton } from "@/components/ui/cyber-button";
import { getAdminPostRecords } from "@/lib/content";

type AdminPostsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    kind?: string;
    scope?: string;
    message?: string;
  }>;
};

export default async function AdminPostsPage({
  searchParams,
}: AdminPostsPageProps) {
  const params = (await searchParams) ?? {};
  const query = params.q?.trim().toLowerCase() ?? "";
  const status = params.status?.trim() ?? "all";
  const kind = params.kind;
  const scope = params.scope;
  const message = params.message;
  const records = await getAdminPostRecords();

  const filtered = records.filter((record) => {
    const matchesQuery =
      !query ||
      [record.title, record.summary, record.slug, record.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesStatus = status === "all" ? true : record.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-heading text-2xl uppercase tracking-[0.14em] text-foreground">
            Posts
          </p>
          <p className="text-sm text-mutedForeground">
            共 {filtered.length} 篇文章，支持状态与关键词筛选。
          </p>
        </div>
        <CyberButton href="/admin/posts/new" className="w-full sm:w-auto">
          新建文章
        </CyberButton>
      </div>

      <ActionFeedback kind={kind} scope={scope} message={message} />

      <CyberCard variant="terminal" className="space-y-4">
        <form className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="搜索标题 / 摘要 / slug"
            className="cyber-chamfer min-h-11 border border-input bg-input px-4 py-2 text-sm text-accent outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            name="status"
            defaultValue={status}
            className="cyber-chamfer min-h-11 border border-input bg-input px-4 py-2 text-sm text-accent outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">all</option>
            <option value="published">published</option>
            <option value="draft">draft</option>
          </select>
          <CyberButton type="submit" className="w-full lg:w-auto">应用筛选</CyberButton>
        </form>
      </CyberCard>

      <div className="grid gap-4">
        {filtered.map((record) => (
          <CyberCard key={record.id} hoverEffect className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <p className="font-heading text-xl uppercase tracking-[0.08em] text-foreground">
                  {record.title}
                </p>
                <p className="text-sm text-mutedForeground">{record.summary}</p>
                <p className="font-label text-xs uppercase tracking-[0.2em] text-accent">
                  {record.status} / {record.slug}
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-mutedForeground">
                  {record.tags.join(" / ") || "no tags"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <CyberButton href={`/admin/posts/${record.id}`} variant="outline">
                  编辑
                </CyberButton>
                <Link
                  href={record.status === "published" ? `/blog/${record.slug}` : `/blog/${record.slug}?preview=draft`}
                  className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.2em] text-accent hover:text-accentSecondary"
                >
                  预览
                </Link>
              </div>
            </div>
          </CyberCard>
        ))}
        {filtered.length === 0 ? (
          <CyberCard className="text-sm text-mutedForeground">
            当前没有匹配的文章。
          </CyberCard>
        ) : null}
      </div>
    </div>
  );
}
