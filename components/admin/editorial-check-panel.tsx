"use client";

import Link from "next/link";

import type { AnalyzeDraftActionState } from "@/app/admin/actions";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard } from "@/components/ui/cyber-card";
import { cx } from "@/lib/utils";

type EditorialCheckPanelProps = {
  analysisState: AnalyzeDraftActionState;
  isAnalyzing: boolean;
  analysisIsStale: boolean;
  canAnalyze: boolean;
  canApplySlug: boolean;
  canApplyTags: boolean;
  canApplySummary: boolean;
  onAnalyze: () => void;
  onApplySlug: () => void;
  onApplyTags: () => void;
  onApplySummary: () => void;
};

function formatDateTime(timestamp: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function priorityClassName(priority: "high" | "medium" | "low"): string {
  if (priority === "high") {
    return "text-accent";
  }

  if (priority === "medium") {
    return "text-accentSecondary";
  }

  return "text-mutedForeground";
}

function getRecommendedSlug(preview: NonNullable<AnalyzeDraftActionState["preview"]>): string {
  if (preview.slugExists && preview.slugAlternatives.length > 0) {
    return preview.slugAlternatives[0];
  }

  return preview.slug;
}

export function EditorialCheckPanel({
  analysisState,
  isAnalyzing,
  analysisIsStale,
  canAnalyze,
  canApplySlug,
  canApplyTags,
  canApplySummary,
  onAnalyze,
  onApplySlug,
  onApplyTags,
  onApplySummary,
}: EditorialCheckPanelProps) {
  const preview = analysisState.kind === "success" ? analysisState.preview : undefined;
  const recommendedSlug = preview ? getRecommendedSlug(preview) : "";
  const alternateSlugs =
    preview && preview.slugExists && preview.slugAlternatives.length > 0
      ? preview.slugAlternatives.slice(1)
      : preview?.slugAlternatives ?? [];

  return (
    <CyberCard variant="holographic" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="font-label text-xs uppercase tracking-[0.24em] text-accent">
            Editorial Check
          </p>
          <p className="text-sm text-mutedForeground">
            用当前草稿做一次内容预检，检查重复风险、slug、标签和结构质量。
          </p>
        </div>
        <CyberButton
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={onAnalyze}
          disabled={!canAnalyze || isAnalyzing}
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Draft"}
        </CyberButton>
      </div>

      {analysisState.kind === "error" ? (
        <div className="border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
          {analysisState.message}
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-5">
          <div className={cx(
            "space-y-3 border border-border bg-background/40 p-4",
            analysisIsStale ? "border-accentSecondary/40" : undefined
          )}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-label text-xs uppercase tracking-[0.18em] text-accent">
                {preview.recommendation}
              </span>
              {analysisIsStale ? (
                <span className="font-label text-xs uppercase tracking-[0.18em] text-accentSecondary">
                  stale
                </span>
              ) : null}
              <span className="font-label text-xs uppercase tracking-[0.18em] text-mutedForeground">
                {preview.tagConfidence}
              </span>
            </div>
            <p className="text-sm text-foreground">{preview.editorNote}</p>
            {analysisIsStale ? (
              <p className="text-xs uppercase tracking-[0.16em] text-accentSecondary">
                分析结果基于更早的草稿版本。重新运行 Analyze Draft 后才能应用建议。
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-heading text-lg uppercase tracking-[0.1em] text-foreground">
                Slug & Summary
              </p>
            </div>
            <div className="space-y-3 border border-border bg-background/40 p-4">
              <div className="space-y-2">
                <p className="font-label text-xs uppercase tracking-[0.16em] text-mutedForeground">
                  Recommended Slug
                </p>
                <p className="font-mono text-sm text-accent">{recommendedSlug}</p>
                {alternateSlugs.length > 0 ? (
                  <p className="text-xs uppercase tracking-[0.16em] text-mutedForeground">
                    alternatives: {alternateSlugs.join(" / ")}
                  </p>
                ) : null}
              </div>
              <CyberButton
                type="button"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={onApplySlug}
                disabled={!canApplySlug || analysisIsStale}
              >
                应用推荐 Slug
              </CyberButton>

              <div className="space-y-2 border-t border-border pt-3">
                <p className="font-label text-xs uppercase tracking-[0.16em] text-mutedForeground">
                  Suggested Summary
                </p>
                <p className="text-sm text-mutedForeground">{preview.summary}</p>
                <CyberButton
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={onApplySummary}
                  disabled={!canApplySummary || analysisIsStale}
                >
                  应用建议摘要
                </CyberButton>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-heading text-lg uppercase tracking-[0.1em] text-foreground">
              Tags
            </p>
            <div className="space-y-3 border border-border bg-background/40 p-4">
              <div className="space-y-2">
                <p className="font-label text-xs uppercase tracking-[0.16em] text-mutedForeground">
                  Selected Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {preview.selectedTags.length > 0 ? (
                    preview.selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-border px-2 py-1 text-xs uppercase tracking-[0.16em] text-foreground"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-mutedForeground">当前没有显式标签。</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-label text-xs uppercase tracking-[0.16em] text-mutedForeground">
                  Suggested Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {preview.suggestedTags.length > 0 ? (
                    preview.suggestedTags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-accentSecondary/40 px-2 py-1 text-xs uppercase tracking-[0.16em] text-accentSecondary"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-mutedForeground">没有新的标签建议。</span>
                  )}
                </div>
              </div>

              <CyberButton
                type="button"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={onApplyTags}
                disabled={!canApplyTags || analysisIsStale}
              >
                应用建议标签
              </CyberButton>

              {preview.tagRecommendations.length > 0 ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="font-label text-xs uppercase tracking-[0.16em] text-mutedForeground">
                    Why these tags
                  </p>
                  <div className="space-y-2 text-sm text-mutedForeground">
                    {preview.tagRecommendations.slice(0, 5).map((item) => (
                      <div key={item.tag} className="border border-border/70 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground">{item.tag}</span>
                          <span className={cx("text-xs uppercase tracking-[0.16em]", priorityClassName(item.priority))}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="mt-2 text-xs">{item.reasons.join(" / ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-heading text-lg uppercase tracking-[0.1em] text-foreground">
              Duplicate Candidates
            </p>
            <div className="space-y-3 border border-border bg-background/40 p-4">
              {preview.duplicateCandidates.length > 0 ? (
                preview.duplicateCandidates.map((candidate) => (
                  <div key={candidate.id} className="border border-border/70 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-label text-xs uppercase tracking-[0.16em] text-accent">
                        {candidate.similarityBand}
                      </span>
                      <span className="text-xs uppercase tracking-[0.16em] text-mutedForeground">
                        score {candidate.relevanceScore}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{candidate.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mutedForeground">
                      {candidate.status} / {formatDateTime(candidate.updatedAt)}
                    </p>
                    <p className="mt-2 text-xs text-mutedForeground">
                      {candidate.matchReasons.join(" / ")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em]">
                      <Link href={`/admin/posts/${candidate.id}`} className="text-accent hover:text-accentSecondary">
                        打开文章
                      </Link>
                      <Link href={`/blog/${candidate.slug}`} target="_blank" rel="noreferrer" className="text-accent hover:text-accentSecondary">
                        公开预览
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-mutedForeground">没有检测到明显重复的文章。</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-heading text-lg uppercase tracking-[0.1em] text-foreground">
              Quality Checks
            </p>
            <div className="grid gap-3 border border-border bg-background/40 p-4 sm:grid-cols-2">
              <div className="border border-border/70 p-3 text-sm text-mutedForeground">
                headings: {preview.qualityChecks.headingCount}
              </div>
              <div className="border border-border/70 p-3 text-sm text-mutedForeground">
                code blocks: {preview.qualityChecks.codeBlockCount}
              </div>
              <div className="border border-border/70 p-3 text-sm text-mutedForeground">
                bullet lists: {preview.qualityChecks.bulletListCount}
              </div>
              <div className="border border-border/70 p-3 text-sm text-mutedForeground">
                external links: {preview.qualityChecks.externalLinkCount}
              </div>
              <div className="border border-border/70 p-3 text-sm text-mutedForeground">
                images: {preview.qualityChecks.imageCount}
              </div>
              <div className="border border-border/70 p-3 text-sm text-mutedForeground">
                title heading: {preview.qualityChecks.hasTitleHeading ? "yes" : "no"}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-heading text-lg uppercase tracking-[0.1em] text-foreground">
              Warnings
            </p>
            <div className="space-y-2 border border-border bg-background/40 p-4">
              {preview.warnings.length > 0 ? (
                preview.warnings.map((warning) => (
                  <p key={warning} className="text-sm text-mutedForeground">
                    - {warning}
                  </p>
                ))
              ) : (
                <p className="text-sm text-mutedForeground">当前草稿没有额外警告。</p>
              )}
            </div>
          </div>
        </div>
      ) : analysisState.kind !== "error" ? (
        <div className="border border-border bg-background/40 p-4 text-sm text-mutedForeground">
          保存后的草稿或当前正在编辑的未保存内容都可以拿来分析。默认不会自动运行，点击右上角按钮开始即可。
        </div>
      ) : null}
    </CyberCard>
  );
}
