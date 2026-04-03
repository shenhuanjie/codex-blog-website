import Link from "next/link";
import type { ReactNode } from "react";

import { PostMeta } from "@/components/blog/post-meta";
import { CyberCard } from "@/components/ui/cyber-card";
import { TagChip } from "@/components/ui/tag-chip";
import type { PostMeta as PostMetaType } from "@/lib/content";
import { slugifyTag } from "@/lib/utils";

type PostCardProps = {
  post: PostMetaType;
  highlightQuery?: string;
};

function highlightText(text: string, query?: string): ReactNode {
  const keyword = query?.trim();

  if (!keyword) {
    return text;
  }

  const pattern = new RegExp(
    `(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const segments = text.split(pattern);

  return segments.map((segment, index) =>
    segment.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={`${segment}-${index}`} className="bg-accent/20 px-1 text-accent">
        {segment}
      </mark>
    ) : (
      <span key={`${segment}-${index}`}>{segment}</span>
    )
  );
}

export function PostCard({ post, highlightQuery }: PostCardProps) {
  return (
    <CyberCard variant="terminal" hoverEffect className="group flex h-full flex-col justify-between">
      <div className="space-y-4">
        <PostMeta post={post} />
        <h3 className="font-heading text-xl font-bold uppercase tracking-[0.06em] text-foreground transition-colors group-hover:text-accent sm:text-2xl sm:tracking-[0.08em]">
          <Link href={`/blog/${post.slug}`}>{highlightText(post.title, highlightQuery)}</Link>
        </h3>
        <p className="text-sm leading-relaxed text-mutedForeground">
          {highlightText(post.summary, highlightQuery)}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <TagChip key={tag} tag={tag} href={`/blog/tag/${slugifyTag(tag)}`} />
        ))}
      </div>
    </CyberCard>
  );
}
