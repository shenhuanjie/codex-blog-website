"use client";

import { signOut } from "next-auth/react";

import { CyberButton } from "@/components/ui/cyber-button";

export function AdminSignOutButton() {
  return (
    <CyberButton
      type="button"
      variant="secondary"
      className="px-3 text-[11px] sm:text-xs"
      onClick={() => void signOut({ callbackUrl: "/" })}
    >
      Sign Out
    </CyberButton>
  );
}
