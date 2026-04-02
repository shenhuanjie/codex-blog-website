import { pgTable, serial, text, timestamp, varchar, integer, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";

export type PostStatus = "draft" | "published";

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 180 }).notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    content: text("content").notNull(),
    cover: text("cover"),
    status: varchar("status", { length: 16 }).$type<PostStatus>().notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("posts_slug_unique").on(table.slug)]
);

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tags_name_unique").on(table.name),
    uniqueIndex("tags_slug_unique").on(table.slug),
  ]
);

export const postTags = pgTable(
  "post_tags",
  {
    postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.tagId] })]
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    githubLogin: varchar("github_login", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("admin_users_github_login_unique").on(table.githubLogin)]
);

export const mcpTokens = pgTable(
  "mcp_tokens",
  {
    id: serial("id").primaryKey(),
    label: varchar("label", { length: 120 }).notNull(),
    scope: varchar("scope", { length: 16 }).notNull().default("write"),
    tokenPrefix: varchar("token_prefix", { length: 24 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    createdBy: varchar("created_by", { length: 120 }).notNull(),
    usageCount: integer("usage_count").notNull().default(0),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    lastUsedTool: varchar("last_used_tool", { length: 120 }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("mcp_tokens_token_hash_unique").on(table.tokenHash),
  ]
);

export const mcpTokenEvents = pgTable(
  "mcp_token_events",
  {
    id: serial("id").primaryKey(),
    tokenId: integer("token_id").references(() => mcpTokens.id, { onDelete: "set null" }),
    tokenPrefix: varchar("token_prefix", { length: 24 }),
    toolName: varchar("tool_name", { length: 120 }).notNull(),
    requiredScope: varchar("required_scope", { length: 16 }).notNull(),
    result: varchar("result", { length: 16 }).notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  }
);
