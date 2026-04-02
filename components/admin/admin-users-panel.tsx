import { addAdminUserAction, deleteAdminUserAction } from "@/app/admin/actions";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard } from "@/components/ui/cyber-card";
import { CyberInput } from "@/components/ui/cyber-input";
import type { AdminUserRecord } from "@/lib/admin/admin-users";

type AdminUsersPanelProps = {
  admins: AdminUserRecord[];
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminUsersPanel({ admins }: AdminUsersPanelProps) {
  return (
    <div className="space-y-6">
      <CyberCard variant="terminal" className="space-y-5">
        <div className="space-y-2">
          <p className="font-heading text-xl uppercase tracking-[0.14em] text-foreground">
            添加管理员
          </p>
          <p className="text-sm text-mutedForeground">
            输入 GitHub login，不要输入昵称。系统会自动转为小写并去重。
          </p>
        </div>

        <form action={addAdminUserAction} className="flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            <CyberInput
              name="githubLogin"
              placeholder="octocat"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>
          <CyberButton type="submit" className="sm:min-w-32">
            添加
          </CyberButton>
        </form>
      </CyberCard>

      <CyberCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-heading text-xl uppercase tracking-[0.14em] text-foreground">
              当前管理员
            </p>
            <p className="text-sm text-mutedForeground">
              共 {admins.length} 位管理员，按创建时间排序。
            </p>
          </div>
        </div>

        {admins.length === 0 ? (
          <p className="text-sm text-mutedForeground">
            当前没有任何数据库管理员记录。可以先通过上方表单添加一个。
          </p>
        ) : (
          <div className="grid gap-3">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex flex-col gap-3 border border-border bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-mono text-sm text-accent">@{admin.githubLogin}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-mutedForeground">
                    {formatDate(admin.createdAt)}
                  </p>
                </div>
                <form action={deleteAdminUserAction}>
                  <input type="hidden" name="id" value={admin.id} />
                  <CyberButton type="submit" variant="secondary">
                    删除
                  </CyberButton>
                </form>
              </div>
            ))}
          </div>
        )}
      </CyberCard>
    </div>
  );
}
