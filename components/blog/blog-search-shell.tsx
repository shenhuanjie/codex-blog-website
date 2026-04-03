"use client";

import { Document } from "flexsearch";
import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { PostList } from "@/components/blog/post-list";
import { CyberInput } from "@/components/ui/cyber-input";
import type { PostMeta, SearchDocument } from "@/lib/content";
import { cx, slugifyTag } from "@/lib/utils";

type BlogSearchShellProps = {
  posts: PostMeta[];
  tags: string[];
  documents: SearchDocument[];
};

type SearchField = "title" | "tags" | "summary";

const searchWeights: Record<SearchField, number> = {
  title: 10,
  tags: 6,
  summary: 3,
};

function buildSearchIndex(documents: SearchDocument[]) {
  const index = new Document<SearchDocument>({
    document: {
      id: "slug",
      index: [
        { field: "title", tokenize: "forward" },
        { field: "tags", tokenize: "forward" },
        { field: "summary", tokenize: "forward" },
      ],
      store: ["slug"],
    },
  });

  documents.forEach((doc) => index.add(doc));
  return index;
}

function getScoredResults(
  index: Document<SearchDocument>,
  query: string
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const [field, weight] of Object.entries(searchWeights) as Array<
    [SearchField, number]
  >) {
    const results = index.search(query, {
      index: field,
      enrich: true,
      limit: 50,
    }) as Array<{ result: Array<{ id: string }> }>;

    results.forEach((entry) => {
      entry.result.forEach((item, position) => {
        const current = scores.get(item.id) ?? 0;
        scores.set(item.id, current + weight - position * 0.01);
      });
    });
  }

  return scores;
}

export function BlogSearchShell({
  posts,
  tags,
  documents,
}: BlogSearchShellProps) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const deferredQuery = useDeferredValue(query);
  const [index] = useState(() => buildSearchIndex(documents));

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const tagFiltered =
    activeTag === "all"
      ? posts
      : posts.filter((post) =>
          post.tags.some((tag) => slugifyTag(tag) === activeTag)
        );
  const scores = normalizedQuery ? getScoredResults(index, normalizedQuery) : null;

  const visiblePosts = normalizedQuery
    ? tagFiltered
      .filter((post) => scores?.has(post.slug))
      .sort((left, right) => {
        const scoreDelta =
          (scores?.get(right.slug) ?? 0) - (scores?.get(left.slug) ?? 0);

        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        return right.dateTimestamp - left.dateTimestamp;
      })
    : tagFiltered;

  return (
    <div className="space-y-8">
      <div className="cyber-chamfer border border-border bg-card/70 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTag("all")}
            className={cx(
              "cyber-chamfer-sm inline-flex min-h-9 items-center border px-3 py-1 text-xs uppercase tracking-[0.2em] transition-all",
              activeTag === "all"
                ? "border-accent text-accent shadow-[var(--box-shadow-neon-sm)]"
                : "border-border text-mutedForeground hover:border-accent hover:text-accent"
            )}
          >
            全部
          </button>
          {tags.map((tag) => {
            const slug = slugifyTag(tag);

            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(slug)}
                className={cx(
                  "cyber-chamfer-sm inline-flex min-h-9 items-center border px-3 py-1 text-xs uppercase tracking-[0.2em] transition-all",
                  activeTag === slug
                    ? "border-accent text-accent shadow-[var(--box-shadow-neon-sm)]"
                    : "border-border text-mutedForeground hover:border-accent hover:text-accent"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <CyberInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题 / 摘要 / 标签"
            aria-label="搜索文章"
          />
          <div className="cyber-chamfer-sm flex min-h-11 items-center border border-border px-3 text-xs uppercase tracking-[0.18em] text-mutedForeground">
            {visiblePosts.length} results
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.16em] text-mutedForeground">
          <span>
            当前筛选:
            <span className="ml-2 text-accent">
              {activeTag === "all"
                ? "全部标签"
                : tags.find((tag) => slugifyTag(tag) === activeTag) ?? activeTag}
            </span>
          </span>
          {query ? (
            <button
              type="button"
              className="text-accentSecondary transition-colors hover:text-accent"
              onClick={() => setQuery("")}
            >
              清空关键词
            </button>
          ) : null}
          <Link href="/blog" className="transition-colors hover:text-accent">
            重置页面
          </Link>
        </div>
      </div>

      <PostList posts={visiblePosts} highlightQuery={deferredQuery.trim()} />
    </div>
  );
}
