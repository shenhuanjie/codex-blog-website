import type { ReactNode } from "react";

import { cx } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  action?: ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  action,
}: SectionHeadingProps) {
  return (
    <header className={cx("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="space-y-3">
        {eyebrow ? (
          <p className="font-label text-xs uppercase tracking-[0.28em] text-accent terminal-cursor">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-heading text-3xl font-bold uppercase tracking-[0.14em] text-foreground sm:text-4xl">
          {title}
        </h2>
        {description ? <p className="max-w-2xl text-mutedForeground">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}
