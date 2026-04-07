import Link from "next/link";

import { ActionFeedback } from "@/components/admin/action-feedback";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard } from "@/components/ui/cyber-card";
import { getPostPreviewHref, getPostPreviewLabel } from "@/lib/admin/post-workflow";
import { getAdminPostRecords, type PostRecord } from "@/lib/content";

type AdminPostsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    kind?: string;
    scope?: string;
    message?: string;
  }>;
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "未发布";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isRecentlyUpdated(record: PostRecord): boolean {
  const updatedAt = Date.parse(record.updatedAt);

  if (Number.isNaN(updatedAt)) {
    return false;
  }

  return Date.now() - updatedAt <= 1000 * 60 * 60 * 24 * 7;
}

function buildFilterHref(query: string, status: string): string {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (status !== "all") {
    params.set("status", status);
  }

  const suffix = params.toString();
  return suffix ? `/admin/posts?${suffix}` : "/admin/posts";
}

function getStatusBadgeClassName(status: string): string {
  return status === "published"
    ? "border-accent/40 text-accent"
    : "border-accentSecondary/40 text-accentSecondary";
}

export default async function AdminPostsPage({
  searchParams,
}: AdminPostsPageProps) {
  const params = (await searchParams) ?? {};
  const query = params.q?.trim().toLowerCase() ?? "";
  const status = params.status?.trim() ?? "all";
  const kind = params.kind;
  const scope = params.scope;
  const message = params.message;
  const records = (await getAdminPostRecords()).sort(
    (left, right) =>
      Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  );

  const filtered = records.filter((record) => {
    const matchesQuery =
      !query ||
      [record.title, record.summary, record.slug, record.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesStatus =
      status === "all"
        ? true
        : status === "recent"
          ? isRecentlyUpdated(record)
          : record.status === status;

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
            共 {filtered.length} 篇文章，默认按最近更新时间排序。
          </p>
        </div>
        <CyberButton href="/admin/posts/new" className="w-full sm:w-auto">
          新建文章
        </CyberButton>
      </div>

      <ActionFeedback kind={kind} scope={scope} message={message} />

      <CyberCard variant="terminal" className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {[
            { value: "all", label: "全部" },
            { value: "draft", label: "仅草稿" },
            { value: "published", label: "已发布" },
            { value: "recent", label: "最近更新" },
          ].map((option) => (
            <CyberButton
              key={option.value}
              href={buildFilterHref(query, option.value)}
              variant={status === option.value ? "default" : "outline"}
              className="w-full sm:w-auto"
            >
              {option.label}
            </CyberButton>
          ))}
        </div>

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
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="recent">recent</option>
          </select>
          <CyberButton type="submit" className="w-full lg:w-auto">
            应用筛选
          </CyberButton>
        </form>
      </CyberCard>

      <div className="grid gap-4">
        {filtered.map((record) => {
          const primaryActionLabel =
            record.status === "draft" ? "继续草稿" : "编辑已发布";

          return (
            <CyberCard key={record.id} hoverEffect className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`border px-2 py-1 text-xs uppercase tracking-[0.16em] ${getStatusBadgeClassName(record.status)}`}
                    >
                      {record.status}
                    </span>
                    <span className="font-label text-xs uppercase tracking-[0.18em] text-mutedForeground">
                      / {record.slug}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="font-heading text-xl uppercase tracking-[0.08em] text-foreground">
                      {record.title}
                    </p>
                    <p className="text-sm text-mutedForeground">
                      {record.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs uppercase tracking-[0.16em] text-mutedForeground">
                    <span>updated {formatDateTime(record.updatedAt)}</span>
                    <span>published {formatDateTime(record.publishedAt)}</span>
                    <span>tags {record.tags.length}</span>
                  </div>

                  <p className="text-xs uppercase tracking-[0.16em] text-mutedForeground">
                    {record.tags.join(" / ") || "no tags"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <CyberButton href={`/admin/posts/${record.id}`} variant="outline">
                    {primaryActionLabel}
                  </CyberButton>
                  <Link
                    href={getPostPreviewHref(record)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.2em] text-accent hover:text-accentSecondary"
                  >
                    {getPostPreviewLabel(record.status)}
                  </Link>
                </div>
              </div>
            </CyberCard>
          );
        })}

        {filtered.length === 0 ? (
          <CyberCard className="text-sm text-mutedForeground">
            当前没有匹配的文章。
          </CyberCard>
        ) : null}
      </div>
    </div>
  );
}
