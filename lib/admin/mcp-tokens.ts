import { randomBytes, createHash } from "node:crypto";

import { asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db, isDatabaseConfigured, sql } from "@/lib/db/client";
import { mcpTokens } from "@/lib/db/schema";

const tokenLabelSchema = z.string().trim().min(1).max(120);

export type McpTokenRecord = {
  id: number;
  label: string;
  tokenPrefix: string;
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type StoredMcpTokenRecord = McpTokenRecord & {
  tokenHash: string;
};

let ensureTablePromise: Promise<void> | null = null;

function toRecord(row: typeof mcpTokens.$inferSelect): StoredMcpTokenRecord {
  return {
    id: row.id,
    label: row.label,
    tokenPrefix: row.tokenPrefix,
    tokenHash: row.tokenHash,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
  };
}

function publicRecord(row: StoredMcpTokenRecord): McpTokenRecord {
  return {
    id: row.id,
    label: row.label,
    tokenPrefix: row.tokenPrefix,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
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
          token_prefix varchar(24) not null,
          token_hash varchar(64) not null unique,
          created_by varchar(120) not null,
          last_used_at timestamptz,
          revoked_at timestamptz,
          created_at timestamptz not null default now()
        )
      `;
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

export async function createMcpToken(label: string, createdBy: string): Promise<{
  token: string;
  record: McpTokenRecord;
}> {
  if (!isDatabaseConfigured() || !db) {
    throw new Error("Database is not configured.");
  }

  await ensureMcpTokensTable();

  const normalizedLabel = tokenLabelSchema.parse(label);
  const actor = createdBy.trim().toLowerCase() || "unknown";
  const generated = createOpaqueToken();

  const [row] = await db
    .insert(mcpTokens)
    .values({
      label: normalizedLabel,
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

export async function verifyMcpToken(token: string): Promise<McpTokenRecord | null> {
  if (!isDatabaseConfigured() || !db) {
    return null;
  }

  const normalizedToken = token.trim();

  if (!normalizedToken) {
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

  if (!row || row.revokedAt) {
    return null;
  }

  const [updated] = await db
    .update(mcpTokens)
    .set({
      lastUsedAt: new Date(),
    })
    .where(eq(mcpTokens.id, row.id))
    .returning();

  return publicRecord(toRecord(updated ?? row));
}

export async function assertValidMcpToken(token: string | undefined): Promise<McpTokenRecord> {
  const normalizedToken = token?.trim();

  if (!normalizedToken) {
    throw new Error("BLOG_MCP_TOKEN is missing. Generate one in /admin/tokens and pass it to your MCP client.");
  }

  const record = await verifyMcpToken(normalizedToken);

  if (!record) {
    throw new Error("BLOG_MCP_TOKEN is invalid or revoked. Generate a fresh token in /admin/tokens.");
  }

  return record;
}
