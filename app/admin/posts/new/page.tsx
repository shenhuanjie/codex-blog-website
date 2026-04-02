import { CyberCard } from "@/components/ui/cyber-card";
import { PostPreviewPanel } from "@/components/admin/post-preview-panel";
import { PostEditorForm } from "@/components/admin/post-editor-form";

export default function AdminNewPostPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <CyberCard variant="terminal" className="space-y-5">
        <div>
          <p className="font-heading text-2xl uppercase tracking-[0.14em] text-foreground">
            新建文章
          </p>
          <p className="text-sm text-mutedForeground">
            默认先保存为草稿；也可以直接创建并发布。
          </p>
        </div>
        <PostEditorForm />
      </CyberCard>
      <PostPreviewPanel />
    </div>
  );
}
