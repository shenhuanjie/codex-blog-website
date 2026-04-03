import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ReactNode } from "react";

import { cx } from "@/lib/utils";

type CyberButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "glitch";

type CyberButtonBaseProps = {
  children: ReactNode;
  className?: string;
  variant?: CyberButtonVariant;
};

type CyberButtonLinkProps = CyberButtonBaseProps & {
  href: string;
} & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "children" | "className">;

type CyberButtonElementProps = CyberButtonBaseProps & {
  href?: undefined;
} & ButtonHTMLAttributes<HTMLButtonElement>;

type CyberButtonProps = CyberButtonLinkProps | CyberButtonElementProps;

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
  "cyber-chamfer-sm inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-center font-sans text-sm leading-tight font-semibold tracking-[0.04em] whitespace-normal transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:tracking-[0.08em] md:whitespace-nowrap";

export function CyberButton(props: CyberButtonProps) {
  if ("href" in props && typeof props.href === "string") {
    return renderLinkButton(props as CyberButtonLinkProps);
  }

  return renderElementButton(props as CyberButtonElementProps);
}

function renderLinkButton({
  href,
  children,
  className,
  variant = "default",
  ...linkProps
}: CyberButtonLinkProps) {
  const classes = cx(baseClassName, variants[variant], className);

  return (
    <Link
      href={href}
      className={classes}
      {...linkProps}
    >
      {children}
    </Link>
  );
}

function renderElementButton({
  children,
  className,
  variant = "default",
  type = "button",
  formAction,
  name,
  value,
  ...buttonProps
}: CyberButtonElementProps) {
  const classes = cx(baseClassName, variants[variant], className);

  return (
    <button
      type={type}
      formAction={formAction}
      name={name}
      value={value}
      className={classes}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
