"use client";

import { signIn } from "next-auth/react";

import { CyberButton } from "@/components/ui/cyber-button";

export function GithubSignInButton() {
  return (
    <CyberButton
      type="button"
      variant="default"
      onClick={() => void signIn("github", { callbackUrl: "/admin" })}
    >
      使用 GitHub 登录
    </CyberButton>
  );
}
