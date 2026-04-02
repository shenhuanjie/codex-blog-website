"use client";

import { useEffect, useState } from "react";

import { shouldShowServiceHints } from "@/lib/env";

type ViewCounterProps = {
  slug: string;
};

type ViewCountResponse = {
  slug: string;
  views: number | null;
  enabled: boolean;
  deduped?: boolean;
};

export function ViewCounter({ slug }: ViewCounterProps) {
  const [views, setViews] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const storageKey = `viewed:${slug}`;

    async function syncViews() {
      const initialResponse = await fetch(`/api/views/${slug}`, {
        method: "GET",
        cache: "no-store",
      });
      const initialData = (await initialResponse.json()) as ViewCountResponse;

      if (!cancelled) {
        setViews(initialData.views);
        setEnabled(initialData.enabled);
      }

      if (sessionStorage.getItem(storageKey)) {
        return;
      }

      const incrementResponse = await fetch(`/api/views/${slug}`, {
        method: "POST",
      });
      const incrementData = (await incrementResponse.json()) as ViewCountResponse;

      if (incrementResponse.ok) {
        sessionStorage.setItem(storageKey, "1");
      }

      if (!cancelled) {
        setViews(incrementData.views);
        setEnabled(incrementData.enabled);
      }
    }

    void syncViews().catch(() => {
      if (!cancelled) {
        setViews(null);
        setEnabled(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const showHints = shouldShowServiceHints();
  const displayValue = typeof views === "number" ? views : "--";
  const title = enabled
    ? "Page views"
    : showHints
      ? "Page views unavailable: Upstash Redis is not configured or the request failed."
      : "Page views unavailable";

  return (
    <span className="inline-flex items-center gap-1.5" title={title}>
      <span className="font-label text-accent">PV</span>
      {displayValue}
      {!enabled && showHints ? (
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-mutedForeground">
          off
        </span>
      ) : null}
    </span>
  );
}
