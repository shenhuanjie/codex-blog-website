import { PostPreviewPanel } from "@/components/admin/post-preview-panel";
import { PostEditorForm } from "@/components/admin/post-editor-form";

export default function AdminNewPostPage() {
  return (
    <PostEditorForm
      key="post-editor-new"
      heading="新建文章"
      description="从模板起稿、恢复本地草稿，或直接开始写作。默认先保存为草稿，也可以直接创建并发布。"
      previewPanel={<PostPreviewPanel />}
    />
  );
}
