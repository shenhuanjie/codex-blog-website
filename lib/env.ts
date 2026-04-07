export function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || undefined;
}

export function getAdminGithubLogins(): string[] {
  return (process.env.ADMIN_GITHUB_LOGINS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function hasAdminWhitelistConfigured(): boolean {
  return getAdminGithubLogins().length > 0;
}

export function isAuthConfigured(): boolean {
  return Boolean(
    getAuthSecret() &&
      process.env.AUTH_GITHUB_ID &&
      process.env.AUTH_GITHUB_SECRET
  );
}

export function isGiscusConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_GISCUS_REPO &&
      process.env.NEXT_PUBLIC_GISCUS_REPO_ID &&
      process.env.NEXT_PUBLIC_GISCUS_CATEGORY &&
      process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID
  );
}

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export function shouldShowServiceHints(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function resolveLocalAdminLoginEnabled(
  rawValue: string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  if (nodeEnv !== "development") {
    return false;
  }

  const raw = rawValue?.trim().toLowerCase();

  if (!raw) {
    return true;
  }

  if (raw === "1" || raw === "true" || raw === "yes") {
    return true;
  }

  if (raw === "0" || raw === "false" || raw === "no") {
    return false;
  }

  return true;
}

export function isLocalAdminLoginEnabled(): boolean {
  return resolveLocalAdminLoginEnabled(process.env.LOCAL_ADMIN_DIRECT_LOGIN);
}

export function getLocalAdminLogin(): string {
  return (process.env.LOCAL_ADMIN_LOGIN ?? "local-admin").trim().toLowerCase();
}
