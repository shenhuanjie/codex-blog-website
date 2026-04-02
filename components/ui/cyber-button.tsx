import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/utils";

type CyberButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "glitch";

type CyberButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: CyberButtonVariant;
  href?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variants: Record<CyberButtonVariant, string> = {
  default:
    "border-2 border-accent bg-transparent text-accent hover:bg-accent/10 hover:text-accent hover:shadow-[var(--box-shadow-neon-sm)]",
  secondary:
    "border-2 border-accentSecondary bg-transparent text-accentSecondary hover:bg-accentSecondary/10 hover:text-accentSecondary hover:shadow-[var(--box-shadow-neon-secondary)]",
  outline:
    "border border-border text-foreground hover:border-accent hover:text-accent hover:shadow-[var(--box-shadow-neon-sm)]",
  ghost: "border border-transparent text-foreground hover:bg-accent/10 hover:text-accent",
  glitch:
    "border-2 border-accent bg-accent text-background hover:brightness-110 hover:shadow-[var(--box-shadow-neon)]",
};

const baseClassName =
  "cyber-chamfer-sm inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 font-sans text-sm leading-none font-semibold tracking-[0.04em] whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:tracking-[0.08em]";

export function CyberButton({
  children,
  className,
  variant = "default",
  href,
  ...buttonProps
}: CyberButtonProps) {
  const classes = cx(baseClassName, variants[variant], className);

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
