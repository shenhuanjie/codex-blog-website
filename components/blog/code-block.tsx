"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useRef, useState } from "react";

import { cx } from "@/lib/utils";

type CodeBlockProps = ComponentPropsWithoutRef<"pre"> & {
  language?: string;
};

export function CodeBlock({
  children,
  className,
  language,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const blockRef = useRef<HTMLPreElement>(null);

  async function handleCopy() {
    const codeNode = blockRef.current?.querySelector("code");
    const text = codeNode?.textContent ?? "";

    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="code-block-shell">
      <button
        type="button"
        onClick={handleCopy}
        className="cyber-chamfer-sm code-copy-button"
      >
        {copied ? "COPIED" : "COPY"}
      </button>
      <pre
        {...props}
        ref={blockRef}
        data-code-language={language ?? "text"}
        className={cx("code-block-pre", className)}
      >
        {children}
      </pre>
    </div>
  );
}
