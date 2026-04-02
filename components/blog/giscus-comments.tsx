"use client";

import Giscus from "@giscus/react";

import { isGiscusConfigured } from "@/lib/env";
import { shouldShowServiceHints } from "@/lib/env";

type GiscusCommentsProps = {
  term: string;
};

export function GiscusComments({ term }: GiscusCommentsProps) {
  const showHints = shouldShowServiceHints();

  if (!isGiscusConfigured()) {
    if (!showHints) {
      return null;
    }

    return (
      <div className="mt-10 border-t border-border pt-8">
        <div className="cyber-chamfer border border-border bg-card/70 px-4 py-4 text-sm text-mutedForeground">
          Comments unavailable: configure Giscus env vars to enable the discussion panel.
        </div>
      </div>
    );
  }

  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO as `${string}/${string}`;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID ?? "";
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? "";
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? "";

  return (
    <div className="mt-10 border-t border-border pt-8">
      <Giscus
        id="comments"
        repo={repo}
        repoId={repoId}
        category={category}
        categoryId={categoryId}
        mapping="specific"
        term={term}
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme="dark_dimmed"
        lang="zh-CN"
        loading="lazy"
      />
    </div>
  );
}
