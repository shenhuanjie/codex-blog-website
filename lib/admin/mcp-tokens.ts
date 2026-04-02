import { randomBytes, createHash } from "node:crypto";

import { asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db, isDatabaseConfigured, sql } from "@/lib/db/client";
import { mcpTokenEvents, mcpTokens } from "@/lib/db/schema";

const tokenLabelSchema = z.string().trim().min(1).max(120);
const tokenScopeSchema = z.enum(["read", "write"]);

export type McpTokenScope = z.infer<typeof tokenScopeSchema>;

export type McpTokenRecord = {
  id: number;
  label: string;
  scope: McpTokenScope;
  tokenPrefix: string;
  createdBy: string;
  createdAt: string;
  usageCount: number;
  lastUsedAt: string | null;
  lastUsedTool: string | null;
  revokedAt: string | null;
};

export type McpTokenEventRecord = {
  id: number;
  tokenId: number | null;
  tokenPrefix: string | null;
  toolName: string;
  requiredScope: McpTokenScope;
  result: "allowed" | "denied";
  detail: string | null;
  createdAt: string;
};

type StoredMcpTokenRecord = McpTokenRecord & {
  tokenHash: string;
};

let ensureTablePromise: Promise<void> | null = null;

function toRecord(row: typeof mcpTokens.$inferSelect): StoredMcpTokenRecord {
  return {
    id: row.id,
    label: row.label,
    scope: tokenScopeSchema.parse(row.scope),
    tokenPrefix: row.tokenPrefix,
    tokenHash: row.tokenHash,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    usageCount: row.usageCount,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    lastUsedTool: row.lastUsedTool ?? null,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
  };
}

function publicRecord(row: StoredMcpTokenRecord): McpTokenRecord {
  return {
    id: row.id,
    label: row.label,
    scope: row.scope,
    tokenPrefix: row.tokenPrefix,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    usageCount: row.usageCount,
    lastUsedAt: row.lastUsedAt,
    lastUsedTool: row.lastUsedTool,
    revokedAt: row.revokedAt,
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

function inferTokenPrefix(token: string | undefined): string | null {
  const normalizedToken = token?.trim();
  if (!normalizedToken) {
    return null;
  }

  return normalizedToken.slice(0, 18);
}

function createOpaqueToken(): { value: string; prefix: string; hash: string } {
  const secret = randomBytes(32).toString("base64url");
  const value = `nsmcp_${secret}`;
  return {
    value,
    prefix: value.slice(0, 18),
    hash: hashToken(value),
  };
}

export async function ensureMcpTokensTable(): Promise<void> {
  if (!isDatabaseConfigured() || !sql) {
    throw new Error("Database is not configured.");
  }

  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await sql`
        create table if not exists mcp_tokens (
          id serial primary key,
          label varchar(120) not null,
          scope varchar(16) not null default 'write',
          token_prefix varchar(24) not null,
          token_hash varchar(64) not null unique,
          created_by varchar(120) not null,
          usage_count integer not null default 0,
          last_used_at timestamptz,
          last_used_tool varchar(120),
          revoked_at timestamptz,
          created_at timestamptz not null default now()
        )
      `;
      await sql`alter table mcp_tokens add column if not exists scope varchar(16) not null default 'write'`;
      await sql`alter table mcp_tokens add column if not exists usage_count integer not null default 0`;
      await sql`alter table mcp_tokens add column if not exists last_used_tool varchar(120)`;
      await sql`
        create table if not exists mcp_token_events (
          id serial primary key,
          token_id integer references mcp_tokens(id) on delete set null,
          token_prefix varchar(24),
          tool_name varchar(120) not null,
          required_scope varchar(16) not null,
          result varchar(16) not null,
          detail text,
          created_at timestamptz not null default now()
        )
      `;
      await sql`alter table mcp_token_events add column if not exists token_prefix varchar(24)`;
      await sql`alter table mcp_token_events add column if not exists detail text`;
    })();
  }

  await ensureTablePromise;
}

export async function getMcpTokens(): Promise<McpTokenRecord[]> {
  if (!isDatabaseConfigured() || !db) {
    return [];
  }

  await ensureMcpTokensTable();

  const rows = await db
    .select()
    .from(mcpTokens)
    .orderBy(asc(mcpTokens.revokedAt), asc(mcpTokens.createdAt), asc(mcpTokens.id));

  return rows
    .map((row) => publicRecord(toRecord(row)))
    .sort((left, right) => {
      if (!left.revokedAt && right.revokedAt) {
        return -1;
      }

      if (left.revokedAt && !right.revokedAt) {
        return 1;
      }

      return left.createdAt < right.createdAt ? 1 : -1;
    });
}

export async function getActiveMcpTokenCount(): Promise<number> {
  if (!isDatabaseConfigured() || !db) {
    return 0;
  }

  await ensureMcpTokensTable();

  const rows = await db
    .select({ id: mcpTokens.id })
    .from(mcpTokens)
    .where(isNull(mcpTokens.revokedAt));

  return rows.length;
}

async function logMcpTokenEvent(input: {
  tokenId?: number | null;
  tokenPrefix?: string | null;
  toolName?: string;
  requiredScope?: McpTokenScope;
  result: "allowed" | "denied";
  detail?: string | null;
}) {
  if (!isDatabaseConfigured() || !db) {
    return;
  }

  await ensureMcpTokensTable();

  await db.insert(mcpTokenEvents).values({
    tokenId: input.tokenId ?? null,
    tokenPrefix: input.tokenPrefix ?? null,
    toolName: input.toolName ?? "unknown-tool",
    requiredScope: input.requiredScope ?? "read",
    result: input.result,
    detail: input.detail ?? null,
  });
}

export async function getRecentMcpTokenEvents(limit = 12): Promise<McpTokenEventRecord[]> {
  if (!isDatabaseConfigured() || !db) {
    return [];
  }

  await ensureMcpTokensTable();

  const rows = await db
    .select()
    .from(mcpTokenEvents)
    .orderBy(desc(mcpTokenEvents.createdAt), desc(mcpTokenEvents.id))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    tokenId: row.tokenId ?? null,
    tokenPrefix: row.tokenPrefix ?? null,
    toolName: row.toolName,
    requiredScope: tokenScopeSchema.parse(row.requiredScope),
    result: row.result === "allowed" ? "allowed" : "denied",
    detail: row.detail ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createMcpToken(label: string, scope: McpTokenScope, createdBy: string): Promise<{
  token: string;
  record: McpTokenRecord;
}> {
  if (!isDatabaseConfigured() || !db) {
    throw new Error("Database is not configured.");
  }

  await ensureMcpTokensTable();

  const normalizedLabel = tokenLabelSchema.parse(label);
  const normalizedScope = tokenScopeSchema.parse(scope);
  const actor = createdBy.trim().toLowerCase() || "unknown";
  const generated = createOpaqueToken();

  const [row] = await db
    .insert(mcpTokens)
    .values({
      label: normalizedLabel,
      scope: normalizedScope,
      tokenPrefix: generated.prefix,
      tokenHash: generated.hash,
      createdBy: actor,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create MCP token.");
  }

  return {
    token: generated.value,
    record: publicRecord(toRecord(row)),
  };
}

export async function revokeMcpToken(id: number): Promise<McpTokenRecord> {
  if (!isDatabaseConfigured() || !db) {
    throw new Error("Database is not configured.");
  }

  await ensureMcpTokensTable();

  const [updated] = await db
    .update(mcpTokens)
    .set({
      revokedAt: new Date(),
    })
    .where(eq(mcpTokens.id, id))
    .returning();

  if (!updated) {
    throw new Error("MCP token not found.");
  }

  return publicRecord(toRecord(updated));
}

function scopeSatisfies(granted: McpTokenScope, required: McpTokenScope): boolean {
  return granted === "write" || granted === required;
}

export async function verifyMcpToken(
  token: string,
  options?: {
    requiredScope?: McpTokenScope;
    toolName?: string;
  }
): Promise<McpTokenRecord | null> {
  if (!isDatabaseConfigured() || !db) {
    return null;
  }

  const normalizedToken = token.trim();
  const toolName = options?.toolName ?? "unknown-tool";
  const requiredScope = options?.requiredScope ?? "read";

  if (!normalizedToken) {
    await logMcpTokenEvent({
      tokenPrefix: null,
      toolName,
      requiredScope,
      result: "denied",
      detail: "Empty token",
    });
    return null;
  }

  await ensureMcpTokensTable();

  const tokenHash = hashToken(normalizedToken);
  const rows = await db
    .select()
    .from(mcpTokens)
    .where(eq(mcpTokens.tokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  const tokenPrefix = inferTokenPrefix(normalizedToken);

  if (!row || row.revokedAt) {
    await logMcpTokenEvent({
      tokenId: row?.id ?? null,
      tokenPrefix: row?.tokenPrefix ?? tokenPrefix,
      toolName,
      requiredScope,
      result: "denied",
      detail: row?.revokedAt ? "Revoked token" : "Unknown token",
    });
    return null;
  }

  const parsedScope = tokenScopeSchema.parse(row.scope);

  if (!scopeSatisfies(parsedScope, requiredScope)) {
    await logMcpTokenEvent({
      tokenId: row.id,
      tokenPrefix: row.tokenPrefix,
      toolName,
      requiredScope,
      result: "denied",
      detail: `Insufficient scope: ${parsedScope}`,
    });
    return null;
  }

  const [updated] = await db
    .update(mcpTokens)
    .set({
      lastUsedAt: new Date(),
      lastUsedTool: toolName,
      usageCount: row.usageCount + 1,
    })
    .where(eq(mcpTokens.id, row.id))
    .returning();

  const record = publicRecord(toRecord(updated ?? row));

  await logMcpTokenEvent({
    tokenId: record.id,
    tokenPrefix: record.tokenPrefix,
    toolName,
    requiredScope,
    result: "allowed",
    detail: null,
  });

  return record;
}

export async function assertValidMcpToken(
  token: string | undefined,
  options?: {
    requiredScope?: McpTokenScope;
    toolName?: string;
  }
): Promise<McpTokenRecord> {
  const normalizedToken = token?.trim();

  if (!normalizedToken) {
    throw new Error("BLOG_MCP_TOKEN is missing. Generate one in /admin/tokens and pass it to your MCP client.");
  }

  const record = await verifyMcpToken(normalizedToken, options);

  if (!record) {
    if (options?.requiredScope === "write") {
      throw new Error("BLOG_MCP_TOKEN is invalid, revoked, or lacks write scope. Generate a fresh write token in /admin/tokens.");
    }

    throw new Error("BLOG_MCP_TOKEN is invalid or revoked. Generate a fresh token in /admin/tokens.");
  }

  return record;
}
