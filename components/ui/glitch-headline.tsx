import type { ElementType } from "react";

import { cx } from "@/lib/utils";

type GlitchHeadlineProps = {
  text: string;
  as?: ElementType;
  className?: string;
};

export function GlitchHeadline({
  text,
  as: Component = "h1",
  className,
}: GlitchHeadlineProps) {
  return (
    <Component
      className={cx(
        "cyber-glitch font-heading text-4xl font-black uppercase leading-[1.02] tracking-[0.12em] text-foreground [text-wrap:balance] sm:text-5xl sm:tracking-[0.16em] lg:text-7xl xl:text-8xl",
        className
      )}
      data-text={text}
    >
      {text}
    </Component>
  );
}
