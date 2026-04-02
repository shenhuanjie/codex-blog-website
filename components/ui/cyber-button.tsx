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
    "border-2 border-accent text-accent hover:bg-accent hover:text-background hover:shadow-[var(--box-shadow-neon)]",
  secondary:
    "border-2 border-accentSecondary text-accentSecondary hover:bg-accentSecondary hover:text-background hover:shadow-[var(--box-shadow-neon-secondary)]",
  outline:
    "border border-border text-foreground hover:border-accent hover:text-accent hover:shadow-[var(--box-shadow-neon-sm)]",
  ghost: "border border-transparent text-foreground hover:bg-accent/10 hover:text-accent",
  glitch:
    "border-2 border-accent bg-accent text-background hover:brightness-110 hover:shadow-[var(--box-shadow-neon)]",
};

const baseClassName =
  "cyber-chamfer-sm inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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
        className={cx(classes, variant === "glitch" && "cyber-glitch")}
        data-text={typeof children === "string" ? children : undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cx(classes, variant === "glitch" && "cyber-glitch")}
      data-text={typeof children === "string" ? children : undefined}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
