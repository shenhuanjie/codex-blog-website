import { ActionFeedback } from "@/components/admin/action-feedback";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard } from "@/components/ui/cyber-card";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { getAdminUsers } from "@/lib/admin/admin-users";

type AdminsPageProps = {
  searchParams?: Promise<{
    kind?: string;
    scope?: string;
    message?: string;
  }>;
};

export default async function AdminsPage({ searchParams }: AdminsPageProps) {
  const params = (await searchParams) ?? {};
  const admins = await getAdminUsers();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-heading text-2xl uppercase tracking-[0.14em] text-foreground">
            Admin Users
          </p>
          <p className="text-sm text-mutedForeground">
            管理数据库中的管理员账号，白名单和数据库记录会同时参与鉴权。
          </p>
        </div>
        <CyberButton href="/admin" variant="outline" className="w-full sm:w-auto">
          返回 Dashboard
        </CyberButton>
      </div>

      <CyberCard variant="holographic" className="space-y-3">
        <p className="font-label text-xs uppercase tracking-[0.24em] text-accent">
          Access Notes
        </p>
        <p className="text-sm text-mutedForeground">
          如果 `ADMIN_GITHUB_LOGINS` 已配置，它会作为快速白名单；数据库里的
          `admin_users` 记录也会参与登录权限判断。
        </p>
      </CyberCard>

      <ActionFeedback kind={params.kind} scope={params.scope} message={params.message} />

      <AdminUsersPanel admins={admins} />
    </div>
  );
}
