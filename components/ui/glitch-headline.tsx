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
        "cyber-glitch font-heading text-5xl font-black uppercase leading-none tracking-[0.2em] text-foreground sm:text-6xl lg:text-7xl xl:text-8xl",
        className
      )}
      data-text={text}
    >
      {text}
    </Component>
  );
}
