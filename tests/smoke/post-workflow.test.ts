import assert from "node:assert/strict";
import test from "node:test";

import {
  getPostPreviewHref,
  getPostPreviewLabel,
  getPostSaveFeedback,
  resolveRequestedPostStatus,
} from "../../lib/admin/post-workflow";

test("publish and draft intents override the submitted status field", () => {
  assert.equal(resolveRequestedPostStatus("publish", "draft"), "published");
  assert.equal(resolveRequestedPostStatus("draft", "published"), "draft");
  assert.equal(resolveRequestedPostStatus("", "published"), "published");
});

test("preview helpers map draft and published posts to the correct route", () => {
  assert.equal(
    getPostPreviewHref({ slug: "hello-world", status: "draft" }),
    "/blog/hello-world?preview=draft"
  );
  assert.equal(
    getPostPreviewHref({ slug: "hello-world", status: "published" }),
    "/blog/hello-world"
  );
  assert.equal(getPostPreviewLabel("draft"), "Open Draft Preview");
  assert.equal(getPostPreviewLabel("published"), "Open Public Preview");
});

test("save feedback stays aligned with the saved post state", () => {
  assert.equal(
    getPostSaveFeedback("draft", "redirect").message,
    "Draft saved. Open draft preview to review the latest saved content."
  );
  assert.equal(
    getPostSaveFeedback("published", "stay").message,
    "Published article updated. Public preview reflects the latest saved content."
  );
});
