import type { PostEditorValues } from "@/lib/admin/editor-draft";

export type PostEditorTemplate = {
  id: "deep-dive" | "checklist" | "release-note";
  label: string;
  description: string;
  values: Pick<PostEditorValues, "title" | "summary" | "content">;
};

export const POST_EDITOR_TEMPLATES: PostEditorTemplate[] = [
  {
    id: "deep-dive",
    label: "技术深度文",
    description: "适合方案拆解、架构复盘和性能分析。",
    values: {
      title: "技术方案复盘：",
      summary: "",
      content: `# 技术方案复盘：\n\n## 背景与问题\n\n## 方案设计\n\n## 核心实现\n\n## 风险与权衡\n\n## 结果与后续优化\n`,
    },
  },
  {
    id: "checklist",
    label: "Checklist / 实战清单",
    description: "适合沉淀 SOP、排查路径和工程实践清单。",
    values: {
      title: "实战清单：",
      summary: "",
      content: `# 实战清单：\n\n## 适用场景\n\n## 前置条件\n\n## 操作步骤\n\n## 常见坑位\n\n## 验收标准\n`,
    },
  },
  {
    id: "release-note",
    label: "短更新 / 发布说明",
    description: "适合记录版本发布、功能迭代和阶段性更新。",
    values: {
      title: "本周更新：",
      summary: "",
      content: `# 本周更新：\n\n## 这次改了什么\n\n## 为什么要改\n\n## 使用方式\n\n## 已知限制\n\n## 下一步计划\n`,
    },
  },
];
