import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostEditorValues,
  createPostEditorSnapshot,
  formatPostEditorTags,
  getPostEditorDraftStorageKey,
  getSuggestedSlug,
  inferPostEditorSlugMode,
  parsePostEditorSnapshot,
  parsePostEditorTagInput,
  shouldApplySuggestedSummary,
  shouldOfferPostEditorRestore,
} from "../../lib/admin/editor-draft";

test("new editor drafts use the new-post storage key and existing posts use the post id", () => {
  assert.equal(getPostEditorDraftStorageKey(), "admin-post-editor:new");
  assert.equal(getPostEditorDraftStorageKey(42), "admin-post-editor:42");
});

test("slug mode stays auto for untouched new drafts and manual for existing posts", () => {
  const newDraft = createPostEditorValues();
  newDraft.title = "Hello Codex";
  newDraft.slug = getSuggestedSlug(newDraft.title);
  assert.equal(inferPostEditorSlugMode(newDraft, false), "auto");

  const existingDraft = createPostEditorValues({
    id: 1,
    slug: "kept-slug",
    title: "Updated title",
    summary: "",
    content: "",
    cover: null,
    status: "draft",
    publishedAt: null,
    createdAt: "",
    updatedAt: "",
    tags: [],
  });
  assert.equal(inferPostEditorSlugMode(existingDraft, true), "manual");
});

test("tag helpers normalize comma and newline separated input", () => {
  assert.deepEqual(parsePostEditorTagInput("React, AI\nReact, Performance"), [
    "React",
    "AI",
    "Performance",
  ]);
  assert.equal(formatPostEditorTags(["React", "AI", "React"]), "React, AI");
});

test("snapshots are parsed only when the schema version and shape match", () => {
  const snapshot = createPostEditorSnapshot(
    {
      title: "Hello",
      slug: "hello",
      summary: "",
      tags: "",
      cover: "",
      content: "# Hello",
      status: "draft",
    },
    null
  );
  const parsed = parsePostEditorSnapshot(JSON.stringify(snapshot));

  assert.equal(parsed?.slug, "hello");
  assert.equal(parsePostEditorSnapshot(JSON.stringify({ ...snapshot, version: 999 })), null);
});

test("existing post restore only appears when the local snapshot is newer than the source post", () => {
  const snapshot = {
    ...createPostEditorSnapshot(
      {
        title: "Hello",
        slug: "hello",
        summary: "",
        tags: "",
        cover: "",
        content: "# Hello",
        status: "draft",
      },
      "2026-04-01T00:00:00.000Z"
    ),
    savedAt: Date.parse("2026-04-05T12:00:00.000Z"),
  };

  assert.equal(shouldOfferPostEditorRestore(snapshot, "2026-04-05T11:59:59.000Z", true), true);
  assert.equal(shouldOfferPostEditorRestore(snapshot, "2026-04-05T12:00:01.000Z", true), false);
  assert.equal(shouldOfferPostEditorRestore(snapshot, null, false), true);
});

test("summary apply helper only offers replacement for empty or clearly weaker summaries", () => {
  assert.equal(shouldApplySuggestedSummary("", "A stronger generated summary."), true);
  assert.equal(shouldApplySuggestedSummary("Short summary", "A much richer generated summary for the same article."), true);
  assert.equal(
    shouldApplySuggestedSummary(
      "A much richer generated summary for the same article.",
      "A much richer generated summary for the same article."
    ),
    false
  );
});
