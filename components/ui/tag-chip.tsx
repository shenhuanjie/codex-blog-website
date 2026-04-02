import Link from "next/link";

import { cx } from "@/lib/utils";

type TagChipProps = {
  tag: string;
  href?: string;
  active?: boolean;
};

export function TagChip({ tag, href, active = false }: TagChipProps) {
  const className = cx(
    "cyber-chamfer-sm inline-flex min-h-9 items-center border px-3 py-1 text-xs uppercase tracking-[0.2em] transition-all",
    active
      ? "border-accent text-accent shadow-[var(--box-shadow-neon-sm)]"
      : "border-border text-mutedForeground hover:border-accent hover:text-accent"
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {tag}
      </Link>
    );
  }

  return <span className={className}>{tag}</span>;
}
