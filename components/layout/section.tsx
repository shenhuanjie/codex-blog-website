import type { ReactNode } from "react";

import { cx } from "@/lib/utils";

type SectionProps = {
  id?: string;
  className?: string;
  children: ReactNode;
};

export function Section({ id, className, children }: SectionProps) {
  return (
    <section id={id} className={cx("relative py-16 md:py-24", className)}>
      {children}
    </section>
  );
}
