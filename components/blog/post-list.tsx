import type { PostMeta as PostMetaType } from "@/lib/content";

import { PostCard } from "@/components/blog/post-card";

type PostListProps = {
  posts: PostMetaType[];
  highlightQuery?: string;
};

export function PostList({ posts, highlightQuery }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="cyber-chamfer border border-border bg-card p-8 text-center text-mutedForeground">
        暂无文章，信号源正在编译。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.slug} post={post} highlightQuery={highlightQuery} />
      ))}
    </div>
  );
}
