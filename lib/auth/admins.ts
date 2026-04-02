import { eq } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/lib/db/client";
import { adminUsers } from "@/lib/db/schema";
import { getAdminGithubLogins } from "@/lib/env";

export async function isAdminLogin(login: string): Promise<boolean> {
  const normalizedLogin = login.trim().toLowerCase();

  if (!normalizedLogin) {
    return false;
  }

  if (getAdminGithubLogins().includes(normalizedLogin)) {
    return true;
  }

  if (!isDatabaseConfigured() || !db) {
    return false;
  }

  const rows = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.githubLogin, normalizedLogin))
    .limit(1);

  return rows.length > 0;
}

export async function hasSeededAdminAccess(): Promise<boolean> {
  if (getAdminGithubLogins().length > 0) {
    return true;
  }

  if (!isDatabaseConfigured() || !db) {
    return false;
  }

  const rows = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  return rows.length > 0;
}
