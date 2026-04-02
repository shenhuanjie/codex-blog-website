import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getViewCount, incrementViewCount } from "@/lib/views";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function sanitizeSlug(slug: string): string {
  return slug.trim().replace(/[^a-z0-9-_/]/gi, "");
}

function getRequestFingerprint(request: Request, slug: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  return createHash("sha256")
    .update(`${slug}:${ip}:${userAgent}`)
    .digest("hex")
    .slice(0, 24);
}

export async function GET(_: Request, context: RouteContext) {
  const { slug } = await context.params;
  const safeSlug = sanitizeSlug(slug);
  const result = await getViewCount(safeSlug);

  return NextResponse.json({
    slug: safeSlug,
    views: result.views,
    enabled: result.enabled,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const safeSlug = sanitizeSlug(slug);
  const fingerprint = getRequestFingerprint(request, safeSlug);
  const result = await incrementViewCount(safeSlug, fingerprint);

  return NextResponse.json({
    slug: safeSlug,
    views: result.views,
    enabled: result.enabled,
    deduped: result.deduped,
  });
}
