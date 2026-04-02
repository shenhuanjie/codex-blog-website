import type { ReactNode } from "react";

import { cx } from "@/lib/utils";

type CyberCardVariant = "default" | "terminal" | "holographic";

type CyberCardProps = {
  children: ReactNode;
  className?: string;
  variant?: CyberCardVariant;
  hoverEffect?: boolean;
  glow?: boolean;
};

const variants: Record<CyberCardVariant, string> = {
  default: "border-border bg-card",
  terminal: "border-border bg-background",
  holographic:
    "border-accent/40 bg-muted/30 backdrop-blur supports-[backdrop-filter]:bg-muted/20",
};

export function CyberCard({
  children,
  className,
  variant = "default",
  hoverEffect = false,
  glow = false,
}: CyberCardProps) {
  return (
    <article
      className={cx(
        "cyber-chamfer relative border p-5 transition-all duration-150",
        variants[variant],
        hoverEffect && "hover:-translate-y-1 hover:border-accent hover:shadow-[var(--box-shadow-neon-sm)]",
        glow && "shadow-[var(--box-shadow-neon-sm)]",
        className
      )}
    >
      {variant === "terminal" ? (
        <div className="mb-4 flex items-center gap-2 border-b border-border/70 pb-3">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          <span className="h-2 w-2 rounded-full bg-accentSecondary" />
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="ml-auto text-xs uppercase tracking-[0.2em] text-mutedForeground">
            terminal
          </span>
        </div>
      ) : null}

      {variant === "holographic" ? (
        <>
          <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-accent/60" />
          <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-accent/60" />
          <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-accent/60" />
          <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-accent/60" />
        </>
      ) : null}

      {children}
    </article>
  );
}
