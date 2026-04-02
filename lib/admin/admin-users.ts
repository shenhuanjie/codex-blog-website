import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, isDatabaseConfigured } from "@/lib/db/client";
import { adminUsers } from "@/lib/db/schema";

const adminLoginSchema = z
  .string()
  .trim()
  .min(1)
  .max(39)
  .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/, "Invalid GitHub login");

export type AdminUserRecord = {
  id: number;
  githubLogin: string;
  createdAt: string;
};

function normalizeGithubLogin(login: string): string {
  return adminLoginSchema.parse(login).toLowerCase();
}

export async function getAdminUsers(): Promise<AdminUserRecord[]> {
  if (!isDatabaseConfigured() || !db) {
    return [];
  }

  const rows = await db
    .select()
    .from(adminUsers)
    .orderBy(asc(adminUsers.createdAt), asc(adminUsers.id));

  return rows.map((row) => ({
    id: row.id,
    githubLogin: row.githubLogin,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getAdminUsersCount(): Promise<number> {
  return (await getAdminUsers()).length;
}

export async function addAdminUser(githubLogin: string): Promise<AdminUserRecord> {
  if (!isDatabaseConfigured() || !db) {
    throw new Error("Database is not configured.");
  }

  const normalizedLogin = normalizeGithubLogin(githubLogin);

  const inserted = await db
    .insert(adminUsers)
    .values({
      githubLogin: normalizedLogin,
    })
    .onConflictDoNothing({
      target: adminUsers.githubLogin,
    })
    .returning();

  if (inserted[0]) {
    return {
      id: inserted[0].id,
      githubLogin: inserted[0].githubLogin,
      createdAt: inserted[0].createdAt.toISOString(),
    };
  }

  const existing = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.githubLogin, normalizedLogin))
    .limit(1);

  const record = existing[0];

  if (!record) {
    throw new Error("Failed to persist admin user.");
  }

  return {
    id: record.id,
    githubLogin: record.githubLogin,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function removeAdminUser(id: number): Promise<void> {
  if (!isDatabaseConfigured() || !db) {
    throw new Error("Database is not configured.");
  }

  await db.delete(adminUsers).where(eq(adminUsers.id, id));
}
