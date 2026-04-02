import type { InputHTMLAttributes } from "react";

import { cx } from "@/lib/utils";

type CyberInputProps = InputHTMLAttributes<HTMLInputElement>;

export function CyberInput({ className, ...props }: CyberInputProps) {
  return (
    <label className="relative block w-full">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-accent">
        &gt;
      </span>
      <input
        className={cx(
          "cyber-chamfer-sm min-h-11 w-full border border-input bg-input py-2 pl-9 pr-3 text-sm text-accent placeholder:text-mutedForeground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:shadow-[var(--box-shadow-neon-sm)]",
          className
        )}
        {...props}
      />
    </label>
  );
}
