import type { PostMeta as PostMetaType } from "@/lib/content";
import { formatDate } from "@/lib/utils";

type PostMetaProps = {
  post: Pick<PostMetaType, "date" | "readingTime" | "tags">;
};

export function PostMeta({ post }: PostMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.16em] text-mutedForeground">
      <span className="inline-flex items-center gap-1.5">
        <span className="font-label text-accent">DT</span>
        {formatDate(post.date)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="font-label text-accent">TM</span>
        {post.readingTime}
      </span>
      <span className="text-accent">{post.tags.join(" / ")}</span>
    </div>
  );
}
