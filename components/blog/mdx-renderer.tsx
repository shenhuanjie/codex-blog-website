import { compileMDX } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import type { ReactNode } from "react";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "@/components/blog/code-block";
import { cx } from "@/lib/utils";

type MDXRendererProps = {
  source: string;
  className?: string;
};

function nodeToText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((item) => nodeToText(item)).join("");
  }

  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return nodeToText(props?.children ?? "");
  }

  return "";
}

function headingId(node: ReactNode): string {
  return nodeToText(node)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-\u4e00-\u9fa5]/g, "");
}

export async function MDXRenderer({ source, className }: MDXRendererProps) {
  const { content } = await compileMDX({
    source,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          [
            rehypePrettyCode,
            {
              theme: "github-dark-dimmed",
              keepBackground: false,
              defaultLang: {
                block: "plaintext",
                inline: "plaintext",
              },
              onVisitLine(node: { children: Array<unknown> }) {
                if (node.children.length === 0) {
                  node.children = [{ type: "text", value: " " }];
                }
              },
            },
          ],
        ],
      },
    },
    components: {
      h1: ({ children, id, ...props }) => (
        <h1
          {...props}
          id={typeof id === "string" ? id : headingId(children)}
          className="mt-10 scroll-mt-28 font-heading text-4xl font-bold uppercase tracking-[0.12em] text-foreground"
        >
          {children}
        </h1>
      ),
      h2: ({ children, id, ...props }) => (
        <h2
          {...props}
          id={typeof id === "string" ? id : headingId(children)}
          className="mt-10 scroll-mt-28 border-l-2 border-accent pl-4 font-heading text-3xl font-semibold uppercase tracking-[0.1em] text-foreground"
        >
          {children}
        </h2>
      ),
      h3: ({ children, id, ...props }) => (
        <h3
          {...props}
          id={typeof id === "string" ? id : headingId(children)}
          className="mt-8 scroll-mt-28 font-heading text-2xl font-semibold uppercase tracking-[0.08em] text-foreground"
        >
          {children}
        </h3>
      ),
      p: (props) => <p {...props} className="mt-5 text-base leading-relaxed text-foreground/95" />,
      a: (props) => (
        <a
          {...props}
          className="text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-accentSecondary"
        />
      ),
      ul: (props) => <ul {...props} className="mt-5 list-disc space-y-2 pl-6 text-foreground/95" />,
      ol: (props) => <ol {...props} className="mt-5 list-decimal space-y-2 pl-6 text-foreground/95" />,
      blockquote: (props) => (
        <blockquote
          {...props}
          className="mt-6 border-l-2 border-accentSecondary bg-muted/40 px-4 py-3 text-mutedForeground"
        />
      ),
      figure: (props) => (
        <figure
          {...props}
          className="code-figure mt-6 overflow-hidden border border-border bg-[#090a10] shadow-[var(--box-shadow-neon-sm)]"
        />
      ),
      code: (props) => {
        const { className: codeClassName, ...rest } = props;
        const isBlock = Boolean(codeClassName?.includes("language-"));

        if (isBlock) {
          return <code className={codeClassName} {...rest} />;
        }

        return (
          <code
            className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-sm text-accent"
            {...rest}
          />
        );
      },
      pre: ({ className: preClassName, ...props }) => (
        <CodeBlock
          {...props}
          language={typeof props["data-language"] === "string" ? props["data-language"] : undefined}
          className={cx(
            "overflow-x-auto p-4 text-sm",
            preClassName
          )}
        />
      ),
    },
  });

  return <article className={cx("mdx-content", className)}>{content}</article>;
}
