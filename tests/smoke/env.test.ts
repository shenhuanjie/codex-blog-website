import assert from "node:assert/strict";
import test from "node:test";

import { resolveLocalAdminLoginEnabled } from "../../lib/env";

test("local admin login defaults to enabled in development", () => {
  assert.equal(resolveLocalAdminLoginEnabled(undefined, "development"), true);
});

test("local admin login can be explicitly disabled in development", () => {
  assert.equal(resolveLocalAdminLoginEnabled("false", "development"), false);
});

test("local admin login never enables outside development", () => {
  assert.equal(resolveLocalAdminLoginEnabled("true", "production"), false);
  assert.equal(resolveLocalAdminLoginEnabled(undefined, "test"), false);
});
