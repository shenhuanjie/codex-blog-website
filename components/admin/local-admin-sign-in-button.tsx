"use client";

import { signIn } from "next-auth/react";

import { CyberButton } from "@/components/ui/cyber-button";

export function LocalAdminSignInButton() {
  return (
    <CyberButton
      type="button"
      variant="outline"
      onClick={async () => {
        const fallback = `/admin?local_login=${Date.now()}`;
        const result = await signIn("local-admin", {
          callbackUrl: fallback,
          redirect: false,
        });

        window.location.assign(result?.url ?? fallback);
      }}
    >
      管理员直登（开发环境）
    </CyberButton>
  );
}
