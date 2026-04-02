import type { ReactNode } from "react";

import { CyberCard } from "@/components/ui/cyber-card";
import { cx } from "@/lib/utils";

type TerminalPanelProps = {
  title: string;
  lines: string[];
  footer?: ReactNode;
  className?: string;
};

export function TerminalPanel({ title, lines, footer, className }: TerminalPanelProps) {
  return (
    <CyberCard variant="terminal" className={cx("space-y-3", className)}>
      <p className="font-label text-xs uppercase tracking-[0.2em] text-accentSecondary">{title}</p>
      <div className="space-y-2 font-mono text-sm text-foreground">
        {lines.map((line) => (
          <p key={line} className="break-words">
            <span className="mr-2 text-accent">$</span>
            {line}
          </p>
        ))}
      </div>
      {footer ? <div className="pt-2">{footer}</div> : null}
    </CyberCard>
  );
}
