"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  analyzeDraftAction,
  deletePostAction,
  savePostAction,
  savePostAndStayAction,
  type AnalyzeDraftActionState,
} from "@/app/admin/actions";
import { ActionFeedback } from "@/components/admin/action-feedback";
import { EditorialCheckPanel } from "@/components/admin/editorial-check-panel";
import { PostSubmitButton } from "@/components/admin/post-submit-button";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard } from "@/components/ui/cyber-card";
import { CyberInput } from "@/components/ui/cyber-input";
import {
  createPostEditorFingerprint,
  createPostEditorSnapshot,
  createPostEditorValues,
  formatPostEditorTags,
  getPostEditorDraftStorageKey,
  getSuggestedSlug,
  inferPostEditorSlugMode,
  parsePostEditorSnapshot,
  parsePostEditorTagInput,
  shouldApplySuggestedSummary,
  shouldOfferPostEditorRestore,
  type PostEditorSlugMode,
  type PostEditorSnapshot,
  type PostEditorValues,
} from "@/lib/admin/editor-draft";
import {
  POST_EDITOR_TEMPLATES,
  type PostEditorTemplate,
} from "@/lib/admin/editor-templates";
import { getPostPreviewHref, getPostPreviewLabel } from "@/lib/admin/post-workflow";
import type { PostRecord } from "@/lib/content";
import type { ManagedPostPreview } from "@/lib/services/post-publishing";
import { cx } from "@/lib/utils";

type PostEditorFormProps = {
  heading: string;
  description: string;
  post?: PostRecord | null;
  previewPanel: ReactNode;
  feedback?: {
    kind?: string;
    scope?: string;
    message?: string;
  };
};

const initialAnalysisState: AnalyzeDraftActionState = {
  kind: "idle",
};

const quickActionButtonClassName =
  "cyber-chamfer-sm inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-center font-sans text-sm leading-tight font-semibold tracking-[0.04em] whitespace-normal transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:tracking-[0.08em] md:whitespace-nowrap w-full sm:w-auto sm:min-w-36";

function formatSavedAt(savedAt: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(savedAt));
}

function snapshotToValues(snapshot: PostEditorSnapshot): PostEditorValues {
  return {
    title: snapshot.title,
    slug: snapshot.slug,
    summary: snapshot.summary,
    tags: snapshot.tags,
    cover: snapshot.cover,
    content: snapshot.content,
    status: snapshot.status,
  };
}

function getRecommendedSlug(preview?: ManagedPostPreview): string {
  if (!preview) {
    return "";
  }

  if (preview.slugExists && preview.slugAlternatives.length > 0) {
    return preview.slugAlternatives[0];
  }

  return preview.slug;
}

function buildDraftFormData(
  values: PostEditorValues,
  post?: Pick<PostRecord, "id"> | null
): FormData {
  const formData = new FormData();

  formData.set("id", typeof post?.id === "number" ? String(post.id) : "");
  formData.set("title", values.title);
  formData.set("slug", values.slug);
  formData.set("summary", values.summary);
  formData.set("tags", values.tags);
  formData.set("cover", values.cover);
  formData.set("content", values.content);
  formData.set("status", values.status);

  return formData;
}

export function PostEditorForm({
  heading,
  description,
  post,
  previewPanel,
  feedback,
}: PostEditorFormProps) {
  const hasExistingPost = Boolean(post);
  const initialValues = useMemo(() => createPostEditorValues(post), [post]);
  const initialFingerprint = useMemo(
    () => createPostEditorFingerprint(initialValues),
    [initialValues]
  );
  const [values, setValues] = useState(initialValues);
  const [slugMode, setSlugMode] = useState<PostEditorSlugMode>(() =>
    inferPostEditorSlugMode(initialValues, hasExistingPost)
  );
  const [restoreSnapshot, setRestoreSnapshot] = useState<PostEditorSnapshot | null>(null);
  const [analysisState, analyzeAction, isAnalyzing] = useActionState(
    analyzeDraftAction,
    initialAnalysisState
  );
  const [lastAnalyzedFingerprint, setLastAnalyzedFingerprint] = useState<string | null>(null);
  const storageKey = getPostEditorDraftStorageKey(post?.id);
  const sourcePostUpdatedAt = post?.updatedAt ?? null;
  const currentFingerprint = useMemo(
    () => createPostEditorFingerprint(values),
    [values]
  );
  const analyzeFingerprintRef = useRef<string | null>(null);
  const autoAnalyzeTriggeredRef = useRef(false);
  const isDirty = currentFingerprint !== initialFingerprint;
  const isPublished = values.status === "published";
  const isSaveSuccess =
    feedback?.kind === "success" && feedback?.scope === "post-save";
  const previewHref = post ? getPostPreviewHref(post) : null;
  const previewLabel = post ? getPostPreviewLabel(post.status) : null;
  const draftButtonLabel = post ? "保存草稿" : "创建草稿";
  const publishButtonLabel = post
    ? post.status === "published"
      ? "更新已发布"
      : "发布并更新"
    : "创建并发布";
  const preview =
    analysisState.kind === "success" ? analysisState.preview : undefined;
  const recommendedSlug = getRecommendedSlug(preview);
  const normalizedCurrentTags = formatPostEditorTags(
    parsePostEditorTagInput(values.tags)
  );
  const normalizedSuggestedTags = formatPostEditorTags(preview?.tags ?? []);
  const analysisIsStale =
    analysisState.kind === "success" &&
    lastAnalyzedFingerprint !== null &&
    lastAnalyzedFingerprint !== currentFingerprint;
  const shouldShowPublishRisk =
    !analysisIsStale &&
    Boolean(
      preview &&
        (preview.shouldUpdateExisting ||
          preview.topDuplicateBand === "likely_same_article")
    );

  const submitAnalysis = useCallback(() => {
    if (!values.title.trim() || !values.content.trim()) {
      return;
    }

    analyzeFingerprintRef.current = currentFingerprint;
    startTransition(() => {
      void analyzeAction(buildDraftFormData(values, post));
    });
  }, [analyzeAction, currentFingerprint, post, values]);

  const updateValues = (nextValues: PostEditorValues) => {
    setRestoreSnapshot(null);
    setValues(nextValues);
  };

  useEffect(() => {
    if (!isSaveSuccess || typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(getPostEditorDraftStorageKey());
  }, [isSaveSuccess, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const snapshot = parsePostEditorSnapshot(window.localStorage.getItem(storageKey));

    if (!snapshot) {
      return;
    }

    const snapshotFingerprint = createPostEditorFingerprint(snapshotToValues(snapshot));

    if (snapshotFingerprint === initialFingerprint) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    if (
      !shouldOfferPostEditorRestore(
        snapshot,
        sourcePostUpdatedAt,
        hasExistingPost
      )
    ) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRestoreSnapshot(snapshot);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasExistingPost, initialFingerprint, sourcePostUpdatedAt, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || restoreSnapshot) {
      return;
    }

    if (!isDirty) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const snapshot = createPostEditorSnapshot(values, sourcePostUpdatedAt);
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, [isDirty, restoreSnapshot, sourcePostUpdatedAt, storageKey, values]);

  useEffect(() => {
    if (!isDirty || typeof window === "undefined") {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    if (
      analysisState.kind !== "success" ||
      !analyzeFingerprintRef.current
    ) {
      return;
    }

    setLastAnalyzedFingerprint(analyzeFingerprintRef.current);
  }, [analysisState]);

  useEffect(() => {
    if (!isSaveSuccess || restoreSnapshot || autoAnalyzeTriggeredRef.current) {
      return;
    }

    autoAnalyzeTriggeredRef.current = true;
    submitAnalysis();
  }, [isSaveSuccess, restoreSnapshot, submitAnalysis]);

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextTitle = event.target.value;

    setRestoreSnapshot(null);
    setValues((current) => ({
      ...current,
      title: nextTitle,
      slug: slugMode === "auto" ? getSuggestedSlug(nextTitle) : current.slug,
    }));
  };

  const handleSlugChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRestoreSnapshot(null);
    setSlugMode("manual");
    setValues((current) => ({
      ...current,
      slug: event.target.value,
    }));
  };

  const handleSummaryChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    updateValues({
      ...values,
      summary: event.target.value,
    });
  };

  const handleTagsChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateValues({
      ...values,
      tags: event.target.value,
    });
  };

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    updateValues({
      ...values,
      status: event.target.value === "published" ? "published" : "draft",
    });
  };

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateValues({
      ...values,
      cover: event.target.value,
    });
  };

  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    updateValues({
      ...values,
      content: event.target.value,
    });
  };

  const handleResetSlug = () => {
    const nextValues = {
      ...values,
      slug: getSuggestedSlug(values.title),
    };

    setSlugMode("auto");
    updateValues(nextValues);
  };

  const handleRestoreDraft = () => {
    if (!restoreSnapshot) {
      return;
    }

    const nextValues = snapshotToValues(restoreSnapshot);
    setValues(nextValues);
    setSlugMode(inferPostEditorSlugMode(nextValues, hasExistingPost));
    setRestoreSnapshot(null);
    setLastAnalyzedFingerprint(null);
  };

  const handleDiscardRestore = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }

    setRestoreSnapshot(null);
  };

  const handleApplyTemplate = (templateId: PostEditorTemplate["id"]) => {
    const template = POST_EDITOR_TEMPLATES.find((item) => item.id === templateId);

    if (!template) {
      return;
    }
    const hasCurrentDraftContent = Boolean(
      values.title.trim() || values.summary.trim() || values.content.trim()
    );

    if (
      hasCurrentDraftContent &&
      typeof window !== "undefined" &&
      !window.confirm("应用模板会覆盖当前标题、摘要和正文骨架，是否继续？")
    ) {
      return;
    }

    const nextValues: PostEditorValues = {
      ...values,
      title: template.values.title,
      summary: template.values.summary,
      content: template.values.content,
      slug:
        slugMode === "auto"
          ? getSuggestedSlug(template.values.title)
          : values.slug,
    };

    updateValues(nextValues);
  };

  const handleApplySuggestedSlug = () => {
    if (!recommendedSlug) {
      return;
    }

    const nextValues = {
      ...values,
      slug: recommendedSlug,
    };

    setSlugMode("manual");
    setLastAnalyzedFingerprint(createPostEditorFingerprint(nextValues));
    updateValues(nextValues);
  };

  const handleApplySuggestedTags = () => {
    if (!preview) {
      return;
    }

    const nextValues = {
      ...values,
      tags: formatPostEditorTags(preview.tags),
    };

    setLastAnalyzedFingerprint(createPostEditorFingerprint(nextValues));
    updateValues(nextValues);
  };

  const handleApplySuggestedSummary = () => {
    if (!preview) {
      return;
    }

    const nextValues = {
      ...values,
      summary: preview.summary,
    };

    setLastAnalyzedFingerprint(createPostEditorFingerprint(nextValues));
    updateValues(nextValues);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <CyberCard variant="terminal" className="space-y-5">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="font-heading text-2xl uppercase tracking-[0.14em] text-foreground">
                {heading}
              </p>
              <p className="text-sm text-mutedForeground">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-label text-xs uppercase tracking-[0.18em] text-mutedForeground">
                {hasExistingPost ? `ID ${post?.id}` : "new draft"}
              </span>
              <span
                className={cx(
                  "font-label text-xs uppercase tracking-[0.18em]",
                  isDirty ? "text-accentSecondary" : "text-accent"
                )}
              >
                {isDirty ? "Unsaved changes" : "All changes saved"}
              </span>
              <span className="font-label text-xs uppercase tracking-[0.18em] text-mutedForeground">
                slug {slugMode}
              </span>
            </div>
          </div>

          {restoreSnapshot ? (
            <CyberCard className="space-y-3 border border-accentSecondary/40 bg-accentSecondary/10">
              <div className="space-y-2">
                <p className="font-label text-xs uppercase tracking-[0.2em] text-accentSecondary">
                  Local Draft Found
                </p>
                <p className="text-sm text-foreground">
                  发现一份保存在本机的编辑快照，保存时间 {formatSavedAt(restoreSnapshot.savedAt)}。
                  你可以恢复这份未保存内容，或者丢弃它并继续使用当前已保存版本。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <CyberButton
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={handleRestoreDraft}
                >
                  恢复本地草稿
                </CyberButton>
                <CyberButton
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={handleDiscardRestore}
                >
                  丢弃本地草稿
                </CyberButton>
              </div>
            </CyberCard>
          ) : null}

          {!hasExistingPost ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-label text-xs uppercase tracking-[0.2em] text-accent">
                  Quick Templates
                </p>
                <span className="text-xs uppercase tracking-[0.16em] text-mutedForeground">
                  仅填充结构，不会自动保存
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {POST_EDITOR_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="cyber-chamfer border border-border bg-background/40 p-4 text-left transition-colors hover:border-accent hover:text-accent"
                    onClick={() => handleApplyTemplate(template.id)}
                  >
                    <p className="font-label text-xs uppercase tracking-[0.18em] text-accent">
                      {template.label}
                    </p>
                    <p className="mt-2 text-sm text-mutedForeground">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <form action={savePostAction} className="space-y-5">
          <input type="hidden" name="id" value={post?.id ?? ""} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
                标题
              </label>
              <CyberInput
                name="title"
                value={values.title}
                onChange={handleTitleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
                  Slug
                </label>
                <button
                  type="button"
                  className="text-xs uppercase tracking-[0.16em] text-accent hover:text-accentSecondary disabled:text-mutedForeground"
                  onClick={handleResetSlug}
                  disabled={!values.title.trim()}
                >
                  Reset Auto Slug
                </button>
              </div>
              <CyberInput
                name="slug"
                value={values.slug}
                onChange={handleSlugChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
              摘要
            </label>
            <textarea
              name="summary"
              value={values.summary}
              onChange={handleSummaryChange}
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
                value={values.tags}
                onChange={handleTagsChange}
                placeholder="React, Performance, AI"
              />
            </div>

            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
                状态
              </label>
              <select
                name="status"
                value={values.status}
                onChange={handleStatusChange}
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
            <CyberInput
              name="cover"
              value={values.cover}
              onChange={handleCoverChange}
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
              Markdown 内容
            </label>
            <textarea
              name="content"
              value={values.content}
              onChange={handleContentChange}
              required
              rows={18}
              className="min-h-[28rem] w-full border border-input bg-[#090a10] px-4 py-3 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {shouldShowPublishRisk && preview ? (
            <CyberCard className="space-y-3 border border-accentSecondary/40 bg-accentSecondary/10">
              <p className="font-label text-xs uppercase tracking-[0.2em] text-accentSecondary">
                Publish Risk
              </p>
              <p className="text-sm text-foreground">
                {preview.editorNote}
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-mutedForeground">
                top duplicate: {preview.topDuplicateBand ?? "none"} / score{" "}
                {preview.topDuplicateScore ?? "n/a"}
              </p>
            </CyberCard>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
            <PostSubmitButton
              type="submit"
              idleLabel={post ? "按当前状态保存" : "创建文章"}
              pendingLabel="保存中..."
              className={cx(
                quickActionButtonClassName,
                "border-2 border-accent bg-transparent text-accent hover:bg-accent/10 hover:text-accent hover:shadow-[var(--box-shadow-neon-sm)]"
              )}
            />
            <PostSubmitButton
              type="submit"
              idleLabel={draftButtonLabel}
              pendingLabel="保存草稿中..."
              matchIntent="draft"
              className={cx(
                quickActionButtonClassName,
                "border-2 border-accent bg-transparent text-accent hover:bg-accent/10 hover:text-accent hover:shadow-[var(--box-shadow-neon-sm)]"
              )}
              formAction={savePostAndStayAction}
              name="_intent"
              value="draft"
            />
            <PostSubmitButton
              type="submit"
              idleLabel={publishButtonLabel}
              pendingLabel={post?.status === "published" ? "更新发布中..." : "发布中..."}
              matchIntent="publish"
              className={cx(
                quickActionButtonClassName,
                "border-2 border-accentSecondary bg-transparent text-accentSecondary hover:bg-accentSecondary/10 hover:text-accentSecondary hover:shadow-[var(--box-shadow-neon-secondary)]"
              )}
              formAction={savePostAndStayAction}
              name="_intent"
              value="publish"
            />
            <CyberButton href="/admin/posts" variant="outline" className="w-full sm:w-auto">
              返回列表
            </CyberButton>
          </div>

          <ActionFeedback
            kind={feedback?.kind}
            scope={feedback?.scope}
            message={feedback?.message}
          />

          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-mutedForeground">
            <span>当前工作流: {isPublished ? "published" : "draft"}</span>
            <span>预览始终显示最近一次保存的内容</span>
            {previewHref && previewLabel ? (
              <CyberButton
                href={previewHref}
                target="_blank"
                rel="noreferrer"
                variant="ghost"
                className="min-h-0 px-0 py-0 text-xs text-accent"
              >
                {previewLabel}
              </CyberButton>
            ) : (
              <span>首次保存后即可打开预览</span>
            )}
          </div>
        </form>

        {post ? (
          <form action={deletePostAction}>
            <input type="hidden" name="id" value={post.id} />
            <CyberButton type="submit" variant="secondary" className="w-full sm:w-auto">
              删除文章
            </CyberButton>
          </form>
        ) : null}
      </CyberCard>

      <div className="space-y-6">
        <EditorialCheckPanel
          analysisState={analysisState}
          isAnalyzing={isAnalyzing}
          analysisIsStale={analysisIsStale}
          canAnalyze={Boolean(values.title.trim() && values.content.trim())}
          canApplySlug={Boolean(recommendedSlug) && values.slug !== recommendedSlug}
          canApplyTags={Boolean(normalizedSuggestedTags) && normalizedCurrentTags !== normalizedSuggestedTags}
          canApplySummary={Boolean(
            preview &&
              shouldApplySuggestedSummary(values.summary, preview.summary)
          )}
          onAnalyze={submitAnalysis}
          onApplySlug={handleApplySuggestedSlug}
          onApplyTags={handleApplySuggestedTags}
          onApplySummary={handleApplySuggestedSummary}
        />
        {previewPanel}
      </div>
    </div>
  );
}
