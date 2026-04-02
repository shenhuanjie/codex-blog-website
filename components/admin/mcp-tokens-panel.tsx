"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createMcpTokenAction, revokeMcpTokenAction, type CreateMcpTokenActionState } from "@/app/admin/actions";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard } from "@/components/ui/cyber-card";
import { CyberInput } from "@/components/ui/cyber-input";
import type { McpTokenEventRecord, McpTokenRecord } from "@/lib/admin/mcp-tokens";

type McpTokensPanelProps = {
  tokens: McpTokenRecord[];
  events: McpTokenEventRecord[];
};

const initialState: CreateMcpTokenActionState = {
  kind: "idle",
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function McpTokensPanel({ tokens, events }: McpTokensPanelProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createMcpTokenAction, initialState);

  useEffect(() => {
    if (state.kind === "success") {
      router.refresh();
    }
  }, [router, state.kind]);

  return (
    <div className="space-y-6">
      <CyberCard variant="terminal" className="space-y-5">
        <div className="space-y-2">
          <p className="font-heading text-xl uppercase tracking-[0.14em] text-foreground">
            生成 MCP Token
          </p>
          <p className="text-sm text-mutedForeground">
            为本地 MCP 客户端生成一个一次性可见的 token。数据库只会保存 hash，不会保存明文。
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            <CyberInput
              name="label"
              placeholder="Claude Desktop / Local Writer"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>
          <select
            name="scope"
            defaultValue="write"
            className="cyber-chamfer-sm min-h-11 border border-input bg-input px-3 text-sm text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-40"
          >
            <option value="write">write</option>
            <option value="read">read</option>
          </select>
          <CyberButton type="submit" className="sm:min-w-36" disabled={isPending}>
            {isPending ? "生成中..." : "生成 Token"}
          </CyberButton>
        </form>

        {state.kind !== "idle" ? (
          <CyberCard className={state.kind === "success" ? "border border-accent/40 bg-accent/10" : "border border-destructive/40 bg-destructive/10"}>
            <div className="space-y-3">
              <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
                {state.kind === "success" ? "token-created" : "token-error"}
              </p>
              <p className="text-sm text-foreground">{state.message}</p>
              {state.token ? (
                <div className="space-y-2">
                  <p className="font-mono break-all text-sm text-accent">{state.token}</p>
                  <pre className="overflow-x-auto border border-border bg-background/60 p-3 text-xs text-mutedForeground">
{`"env": {\n  "BLOG_MCP_TOKEN": "${state.token}"\n}`}
                  </pre>
                  <p className="text-xs text-mutedForeground">
                    这是唯一一次展示明文 token。请立即复制到本地 MCP 客户端配置里。
                    {state.scope === "read" ? " 只读 token 只能执行查询/预览工具。" : " write token 可以执行发布和修改操作。"}
                  </p>
                </div>
              ) : null}
            </div>
          </CyberCard>
        ) : null}
      </CyberCard>

      <CyberCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-heading text-xl uppercase tracking-[0.14em] text-foreground">
              已发放 Token
            </p>
            <p className="text-sm text-mutedForeground">
              共 {tokens.length} 个 token，支持按需撤销。被撤销的 token 立即失效。
            </p>
          </div>
        </div>

        {tokens.length === 0 ? (
          <p className="text-sm text-mutedForeground">
            还没有任何 MCP token。先生成一个，再把它放到本地 MCP 客户端的 `BLOG_MCP_TOKEN` 环境变量里。
          </p>
        ) : (
          <div className="grid gap-3">
            {tokens.map((token) => {
              const revoked = Boolean(token.revokedAt);

              return (
                <div
                  key={token.id}
                  className="flex flex-col gap-4 border border-border bg-background/40 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm text-accent">{token.tokenPrefix}...</p>
                      <span className="text-xs uppercase tracking-[0.16em] text-accentSecondary">
                        {token.scope}
                      </span>
                      <span className={`text-xs uppercase tracking-[0.16em] ${revoked ? "text-destructive" : "text-accentSecondary"}`}>
                        {revoked ? "revoked" : "active"}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{token.label}</p>
                    <div className="space-y-1 text-xs uppercase tracking-[0.14em] text-mutedForeground">
                      <p>created by @{token.createdBy}</p>
                      <p>created {formatDate(token.createdAt)}</p>
                      <p>usage count {token.usageCount}</p>
                      <p>last used {formatDate(token.lastUsedAt)}</p>
                      <p>last tool {token.lastUsedTool ?? "—"}</p>
                      {revoked ? <p>revoked {formatDate(token.revokedAt)}</p> : null}
                    </div>
                  </div>

                  {revoked ? null : (
                    <form action={revokeMcpTokenAction}>
                      <input type="hidden" name="id" value={token.id} />
                      <CyberButton type="submit" variant="secondary">
                        撤销 Token
                      </CyberButton>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CyberCard>

      <CyberCard className="space-y-4">
        <div>
          <p className="font-heading text-xl uppercase tracking-[0.14em] text-foreground">
            最近调用
          </p>
          <p className="text-sm text-mutedForeground">
            这里记录最近的 token 使用结果，方便确认哪些工具被执行过，以及拒绝是不是来自 scope 或撤销。
          </p>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-mutedForeground">
            还没有 MCP token 使用记录。等本地客户端启动并调用工具后，这里会开始出现事件。
          </p>
        ) : (
          <div className="grid gap-3">
            {events.map((event) => (
              <div key={event.id} className="border border-border bg-background/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs uppercase tracking-[0.16em] ${event.result === "allowed" ? "text-accent" : "text-destructive"}`}>
                    {event.result}
                  </span>
                  <span className="text-xs uppercase tracking-[0.16em] text-accentSecondary">
                    {event.requiredScope}
                  </span>
                  <span className="font-mono text-xs text-mutedForeground">
                    {event.tokenPrefix ?? "unknown-token"}
                  </span>
                </div>
                <p className="mt-2 font-mono text-sm text-foreground">{event.toolName}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-mutedForeground">
                  {formatDate(event.createdAt)}
                </p>
                {event.detail ? (
                  <p className="mt-2 text-sm text-mutedForeground">{event.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CyberCard>
    </div>
  );
}
