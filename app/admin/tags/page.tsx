import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard } from "@/components/ui/cyber-card";
import { ActionFeedback } from "@/components/admin/action-feedback";
import { TagsPanel } from "@/components/admin/tags-panel";
import { getAdminTagRecords } from "@/lib/admin/tags";

type AdminTagsPageProps = {
  searchParams?: Promise<{
    kind?: string;
    scope?: string;
    message?: string;
  }>;
};

export default async function AdminTagsPage({ searchParams }: AdminTagsPageProps) {
  const params = (await searchParams) ?? {};
  const tags = await getAdminTagRecords();
  const unusedCount = tags.filter((tag) => tag.postCount === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-heading text-2xl uppercase tracking-[0.14em] text-foreground">
            Tags
          </p>
          <p className="text-sm text-mutedForeground">
            共 {tags.length} 个标签，{unusedCount} 个可删除的未使用标签。
          </p>
        </div>
        <CyberButton href="/admin/posts" variant="outline" className="w-full sm:w-auto">
          返回文章
        </CyberButton>
      </div>

      <ActionFeedback kind={params.kind} scope={params.scope} message={params.message} />

      <CyberCard variant="terminal" className="space-y-3">
        <p className="font-heading text-xl uppercase tracking-[0.14em] text-foreground">
          标签管理
        </p>
        <p className="text-sm text-mutedForeground">
          这里只允许删除没有关联文章的标签，避免误伤内容结构。
        </p>
      </CyberCard>

      <TagsPanel tags={tags} />
    </div>
  );
}
