import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { AdminSignOutButton } from "@/components/admin/admin-sign-out-button";
import { GithubSignInButton } from "@/components/admin/github-sign-in-button";
import { LocalAdminSignInButton } from "@/components/admin/local-admin-sign-in-button";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard } from "@/components/ui/cyber-card";
import { hasSeededAdminAccess } from "@/lib/auth/admins";
import { getAdminSession } from "@/lib/auth/session";
import { hasAdminWhitelistConfigured, isAuthConfigured, isLocalAdminLoginEnabled } from "@/lib/env";
import { isDatabaseConfigured } from "@/lib/db/client";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const hasAuth = isAuthConfigured();
  const hasLocalAdminLogin = isLocalAdminLoginEnabled();
  const hasDb = isDatabaseConfigured();
  const hasAdminWhitelist = hasAdminWhitelistConfigured();
  const hasSeededAdmins = await hasSeededAdminAccess();
  const callbackUrl = `${siteConfig.url}/api/auth/callback/github`;
  const requiresSeededAdmins = !hasSeededAdmins && !hasLocalAdminLogin;

  if ((!hasAuth && !hasLocalAdminLogin) || !hasDb || requiresSeededAdmins) {
    return (
      <Section className="py-16">
        <Container>
          <CyberCard variant="terminal" className="max-w-3xl space-y-4">
            <p className="font-heading text-2xl uppercase tracking-[0.14em] text-accent">
              Admin Setup Required
            </p>
            <p className="text-mutedForeground">
              后台已经接入，但还需要补齐环境变量后才能使用。当前会检查 GitHub 登录和
              本地开发直登能力以及 Postgres 连接。
            </p>
            <ul className="space-y-2 text-sm text-mutedForeground">
              <li>`POSTGRES_URL`: {hasDb ? "ok" : "missing"}</li>
              <li>`AUTH_SECRET` / GitHub OAuth: {hasAuth ? "ok" : hasLocalAdminLogin ? "optional(local direct login enabled)" : "missing"}</li>
              <li>`ADMIN_GITHUB_LOGINS`: {hasAdminWhitelist ? "ok" : "optional"}</li>
              <li>`admin_users` seed: {hasSeededAdmins ? "ok" : hasLocalAdminLogin ? "optional(local direct login enabled)" : "missing"}</li>
            </ul>
            <p className="text-sm text-mutedForeground">
              GitHub OAuth 回调地址需要配置为 `{callbackUrl}`，本地开发则使用
              `http://localhost:3000/api/auth/callback/github`。
            </p>
          </CyberCard>
        </Container>
      </Section>
    );
  }

  const session = await getAdminSession();

  if (!session) {
    return (
      <Section className="py-16">
        <Container>
          <CyberCard variant="terminal" className="max-w-3xl space-y-4">
            <p className="font-heading text-2xl uppercase tracking-[0.14em] text-accent">
              Admin Access
            </p>
            <p className="text-mutedForeground">
              {hasLocalAdminLogin
                ? "本地环境可使用管理员直登按钮快速进入后台；线上仍建议使用 GitHub 白名单登录。"
                : "这个后台只对 GitHub 白名单管理员开放。登录后，我们会按 `ADMIN_GITHUB_LOGINS` 校验访问权限。"}
            </p>
            <div className="flex flex-wrap gap-3">
              {hasAuth ? <GithubSignInButton /> : null}
              {hasLocalAdminLogin ? <LocalAdminSignInButton /> : null}
            </div>
          </CyberCard>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="py-10">
      <Container className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-label text-xs uppercase tracking-[0.24em] text-accent">
              Admin Console
            </p>
            <p className="text-sm text-mutedForeground">
              {session.user?.login} 已登录，可以管理文章与查看统计。
            </p>
          </div>
          <div className="w-full overflow-x-auto pb-1 md:w-auto md:overflow-visible md:pb-0">
            <div className="flex min-w-max gap-2">
              <CyberButton href="/admin" variant="outline" className="px-3 text-[11px] sm:text-xs">
                Dashboard
              </CyberButton>
              <CyberButton href="/admin/posts" variant="outline" className="px-3 text-[11px] sm:text-xs">
                Posts
              </CyberButton>
              <CyberButton href="/admin/tags" variant="outline" className="px-3 text-[11px] sm:text-xs">
                Tags
              </CyberButton>
              <CyberButton href="/admin/tokens" variant="outline" className="px-3 text-[11px] sm:text-xs">
                Tokens
              </CyberButton>
              <CyberButton href="/admin/admins" variant="outline" className="px-3 text-[11px] sm:text-xs">
                Admins
              </CyberButton>
              <AdminSignOutButton />
            </div>
          </div>
        </div>
        {children}
      </Container>
    </Section>
  );
}
