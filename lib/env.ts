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
    process.env.AUTH_SECRET &&
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
