import { Redis } from "@upstash/redis";

import { isRedisConfigured } from "@/lib/env";

const TOTAL_VIEWS_KEY = "pageviews:__total__";
const VIEW_DEDUPE_WINDOW_SECONDS = 60 * 60;

export type ViewCountResult = {
  views: number | null;
  enabled: boolean;
};

export type ViewMutationResult = ViewCountResult & {
  deduped: boolean;
};

function getRedisClient(): Redis | null {
  if (!isRedisConfigured()) {
    return null;
  }

  return Redis.fromEnv();
}

function getPostViewsKey(slug: string): string {
  return `pageviews:${slug}`;
}

function getViewDedupeKey(slug: string, fingerprint: string): string {
  return `pageviews:dedupe:${slug}:${fingerprint}`;
}

export async function getViewCount(slug: string): Promise<ViewCountResult> {
  const redis = getRedisClient();

  if (!redis) {
    return {
      views: null,
      enabled: false,
    };
  }

  try {
    const count = await redis.get<number>(getPostViewsKey(slug));

    return {
      views: typeof count === "number" ? count : 0,
      enabled: true,
    };
  } catch (error) {
    console.error("[views] failed to read page views", { slug, error });

    return {
      views: null,
      enabled: false,
    };
  }
}

export async function incrementViewCount(
  slug: string,
  fingerprint: string
): Promise<ViewMutationResult> {
  const redis = getRedisClient();

  if (!redis) {
    return {
      views: null,
      enabled: false,
      deduped: false,
    };
  }

  try {
    const dedupeResult = await redis.set(
      getViewDedupeKey(slug, fingerprint),
      "1",
      {
        nx: true,
        ex: VIEW_DEDUPE_WINDOW_SECONDS,
      }
    );

    if (dedupeResult !== "OK") {
      const current = await getViewCount(slug);

      return {
        views: current.views,
        enabled: current.enabled,
        deduped: true,
      };
    }

    const nextValue = await redis.incr(getPostViewsKey(slug));
    await redis.incr(TOTAL_VIEWS_KEY);

    return {
      views: nextValue,
      enabled: true,
      deduped: false,
    };
  } catch (error) {
    console.error("[views] failed to increment page views", { slug, error });

    return {
      views: null,
      enabled: false,
      deduped: false,
    };
  }
}

export async function getTotalViewCount(): Promise<number | null> {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  const count = await redis.get<number>(TOTAL_VIEWS_KEY);
  return typeof count === "number" ? count : 0;
}
