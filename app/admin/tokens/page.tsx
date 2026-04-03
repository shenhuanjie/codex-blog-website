import { ActionFeedback } from "@/components/admin/action-feedback";
import { McpTokensPanel } from "@/components/admin/mcp-tokens-panel";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard } from "@/components/ui/cyber-card";
import { getMcpTokens, getRecentMcpTokenEvents } from "@/lib/admin/mcp-tokens";

type TokensPageProps = {
  searchParams?: Promise<{
    kind?: string;
    scope?: string;
    message?: string;
  }>;
};

export default async function TokensPage({ searchParams }: TokensPageProps) {
  const params = (await searchParams) ?? {};
  const [tokens, events] = await Promise.all([
    getMcpTokens(),
    getRecentMcpTokenEvents(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-heading text-2xl uppercase tracking-[0.14em] text-foreground">
            MCP Tokens
          </p>
          <p className="text-sm text-mutedForeground">
            管理本地 MCP 客户端的发布凭证。生成后仅展示一次明文，之后只能撤销，不能回看。
          </p>
        </div>
        <CyberButton href="/admin" variant="outline" className="w-full sm:w-auto">
          返回 Dashboard
        </CyberButton>
      </div>

      <CyberCard variant="holographic" className="space-y-3">
        <p className="font-label text-xs uppercase tracking-[0.24em] text-accent">
          Token Policy
        </p>
        <p className="text-sm text-mutedForeground">
          本地 MCP server 现在要求 `BLOG_MCP_TOKEN`。后台生成的是一次性可见 opaque token，数据库只存 hash。
          撤销后，已经配置了该 token 的 MCP 客户端会在下一次调用时立即失效。现在还支持区分 `read`
          和 `write` scope。
        </p>
        <p className="text-sm text-mutedForeground">
          `read` token 只能执行查询和预览工具，例如 `list_posts`、`get_post`、`preview_markdown_article`。
          `write` token 额外允许创建、更新、发布、删除等写操作。
        </p>
      </CyberCard>

      <ActionFeedback kind={params.kind} scope={params.scope} message={params.message} />

      <McpTokensPanel tokens={tokens} events={events} />
    </div>
  );
}
