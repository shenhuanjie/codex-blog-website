import { CyberCard } from "@/components/ui/cyber-card";
import { CyberButton } from "@/components/ui/cyber-button";
import { getDraftPostCount, getPublishedPostCount } from "@/lib/admin/posts";
import { hasAdminWhitelistConfigured, isAuthConfigured, isGiscusConfigured, isRedisConfigured } from "@/lib/env";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getSiteStats } from "@/lib/content";
import { siteConfig } from "@/lib/site";
import { getTotalViewCount } from "@/lib/views";

export default async function AdminPage() {
  const [publishedCount, draftCount, siteStats, totalViews] = await Promise.all([
    getPublishedPostCount(),
    getDraftPostCount(),
    getSiteStats(),
    getTotalViewCount(),
  ]);
  const hasDb = isDatabaseConfigured();
  const hasAuth = isAuthConfigured();
  const hasWhitelist = hasAdminWhitelistConfigured();
  const hasGiscus = isGiscusConfigured();
  const hasRedis = isRedisConfigured();
  const callbackUrl = `${siteConfig.url}/api/auth/callback/github`;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <CyberCard className="space-y-2">
          <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
            Published
          </p>
          <p className="font-heading text-3xl text-accent">{publishedCount}</p>
        </CyberCard>
        <CyberCard className="space-y-2">
          <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
            Drafts
          </p>
          <p className="font-heading text-3xl text-accentSecondary">{draftCount}</p>
        </CyberCard>
        <CyberCard className="space-y-2">
          <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
            Tags
          </p>
          <p className="font-heading text-3xl text-accentTertiary">{siteStats.totalTags}</p>
        </CyberCard>
        <CyberCard className="space-y-2">
          <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
            Total Views
          </p>
          <p className="font-heading text-3xl text-accent">
            {typeof totalViews === "number" ? totalViews : "--"}
          </p>
        </CyberCard>
      </div>

      <CyberCard variant="terminal" className="space-y-4">
        <p className="font-heading text-xl uppercase tracking-[0.14em] text-foreground">
          快速操作
        </p>
        <div className="flex flex-wrap gap-3">
          <CyberButton href="/admin/posts/new" variant="glitch">
            新建文章
          </CyberButton>
          <CyberButton href="/admin/posts" variant="outline">
            管理文章
          </CyberButton>
          <CyberButton href="/admin/tags" variant="outline">
            管理标签
          </CyberButton>
          <CyberButton href="/admin/admins" variant="outline">
            管理管理员
          </CyberButton>
        </div>
      </CyberCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <CyberCard hoverEffect className="space-y-3">
          <p className="font-heading text-lg uppercase tracking-[0.14em] text-foreground">
            Posts Control
          </p>
          <p className="text-sm text-mutedForeground">
            管理草稿、发布状态、文章内容和 slug。
          </p>
          <CyberButton href="/admin/posts" variant="outline" className="w-full">
            Open Posts
          </CyberButton>
        </CyberCard>

        <CyberCard hoverEffect className="space-y-3">
          <p className="font-heading text-lg uppercase tracking-[0.14em] text-foreground">
            Tags Control
          </p>
          <p className="text-sm text-mutedForeground">
            查看标签使用情况，清理未使用标签，保持内容结构干净。
          </p>
          <CyberButton href="/admin/tags" variant="outline" className="w-full">
            Open Tags
          </CyberButton>
        </CyberCard>

        <CyberCard hoverEffect className="space-y-3">
          <p className="font-heading text-lg uppercase tracking-[0.14em] text-foreground">
            Admin Access
          </p>
          <p className="text-sm text-mutedForeground">
            管理 GitHub 登录白名单与数据库管理员记录。
          </p>
          <CyberButton href="/admin/admins" variant="outline" className="w-full">
            Open Admins
          </CyberButton>
        </CyberCard>
      </div>

      <CyberCard variant="terminal" className="space-y-5">
        <div className="space-y-2">
          <p className="font-heading text-xl uppercase tracking-[0.14em] text-foreground">
            Service Status
          </p>
          <p className="text-sm text-mutedForeground">
            这里显示生产环境关键能力是否已接好，方便继续打通 GitHub OAuth、评论和阅读量。
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="cyber-chamfer border border-border bg-background/40 p-4">
            <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
              Database
            </p>
            <p className="mt-2 font-heading text-lg text-foreground">
              {hasDb ? "Connected" : "Missing POSTGRES_URL"}
            </p>
          </div>

          <div className="cyber-chamfer border border-border bg-background/40 p-4">
            <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
              GitHub Auth
            </p>
            <p className="mt-2 font-heading text-lg text-foreground">
              {hasAuth ? "Configured" : "Missing AUTH_*"}
            </p>
            <p className="mt-2 text-xs text-mutedForeground">
              Callback: {callbackUrl}
            </p>
          </div>

          <div className="cyber-chamfer border border-border bg-background/40 p-4">
            <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
              Admin Access
            </p>
            <p className="mt-2 font-heading text-lg text-foreground">
              {hasWhitelist ? "Whitelist Ready" : "DB-only / Missing ADMIN_GITHUB_LOGINS"}
            </p>
          </div>

          <div className="cyber-chamfer border border-border bg-background/40 p-4">
            <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
              Giscus Comments
            </p>
            <p className="mt-2 font-heading text-lg text-foreground">
              {hasGiscus ? "Configured" : "Missing NEXT_PUBLIC_GISCUS_*"}
            </p>
          </div>

          <div className="cyber-chamfer border border-border bg-background/40 p-4">
            <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
              Upstash Views
            </p>
            <p className="mt-2 font-heading text-lg text-foreground">
              {hasRedis ? "Configured" : "Missing UPSTASH_REDIS_*"}
            </p>
          </div>

          <div className="cyber-chamfer border border-border bg-background/40 p-4">
            <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">
              Canonical URL
            </p>
            <p className="mt-2 break-all font-mono text-sm text-accent">
              {siteConfig.url}
            </p>
          </div>
        </div>
      </CyberCard>
    </div>
  );
}
