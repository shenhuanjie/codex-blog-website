import { deleteTagAction, mergeTagsAction, renameTagAction } from "@/app/admin/actions";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard } from "@/components/ui/cyber-card";
import { CyberInput } from "@/components/ui/cyber-input";
import { formatDate } from "@/lib/utils";

import type { AdminTagRecord } from "@/lib/admin/tags";

type TagsPanelProps = {
  tags: AdminTagRecord[];
};

export function TagsPanel({ tags }: TagsPanelProps) {
  return (
    <div className="space-y-4">
      <CyberCard variant="terminal" className="space-y-5">
        <div className="space-y-2">
          <p className="font-heading text-xl uppercase tracking-[0.14em] text-foreground">
            合并标签
          </p>
          <p className="text-sm text-mutedForeground">
            选择源标签和目标标签后，源标签下的文章关系会迁移到目标标签，随后删除源标签。
          </p>
        </div>

        {tags.length < 2 ? (
          <p className="text-sm text-mutedForeground">
            当前标签数量不足，暂时无法执行合并。
          </p>
        ) : (
          <form action={mergeTagsAction} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <select
              name="sourceId"
              defaultValue={tags[0]?.id}
              className="cyber-chamfer min-h-11 border border-input bg-input px-4 py-2 text-sm text-accent outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  Source: {tag.name}
                </option>
              ))}
            </select>
            <select
              name="targetId"
              defaultValue={tags[1]?.id}
              className="cyber-chamfer min-h-11 border border-input bg-input px-4 py-2 text-sm text-accent outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  Target: {tag.name}
                </option>
              ))}
            </select>
            <CyberButton type="submit">
              合并
            </CyberButton>
          </form>
        )}
      </CyberCard>

      {tags.map((tag) => (
        <CyberCard key={tag.id} hoverEffect className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="font-heading text-xl uppercase tracking-[0.08em] text-foreground">
                {tag.name}
              </p>
              <p className="font-label text-xs uppercase tracking-[0.2em] text-accent">
                {tag.slug}
              </p>
              <p className="text-sm text-mutedForeground">
                关联文章数: {tag.postCount} · 创建于 {formatDate(tag.createdAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <CyberButton href={`/blog/tag/${tag.slug}`} variant="outline">
                预览
              </CyberButton>
              {tag.postCount === 0 ? (
                <form action={deleteTagAction}>
                  <input type="hidden" name="id" value={tag.id} />
                  <CyberButton type="submit" variant="secondary">
                    删除
                  </CyberButton>
                </form>
              ) : (
                <span className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.2em] text-mutedForeground">
                  in use
                </span>
              )}
            </div>
          </div>

          <form action={renameTagAction} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <input type="hidden" name="id" value={tag.id} />
            <CyberInput name="name" defaultValue={tag.name} />
            <CyberButton type="submit" variant="outline">
              重命名
            </CyberButton>
          </form>
        </CyberCard>
      ))}

      {tags.length === 0 ? (
        <CyberCard className="text-sm text-mutedForeground">
          当前没有标签。
        </CyberCard>
      ) : null}
    </div>
  );
}
