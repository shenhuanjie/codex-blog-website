"use client";

import { useEffect, useId, useState } from "react";

type MermaidBlockProps = {
  source: string;
};

function normalizeMermaidSource(source: string): string {
  return source.replace(/^\s+|\s+$/g, "");
}

function formatMermaidError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Failed to render Mermaid diagram.";
}

export function MermaidBlock({ source }: MermaidBlockProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/:/g, "");
  const normalizedSource = normalizeMermaidSource(source);

  useEffect(() => {
    let cancelled = false;

    async function renderMermaidDiagram() {
      if (!normalizedSource) {
        setSvg("");
        setError("Empty Mermaid diagram. Add Mermaid syntax inside the fenced code block.");
        return;
      }

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "strict",
          fontFamily: "var(--font-body), monospace",
        });
        await mermaid.parse(normalizedSource, { suppressErrors: false });

        const rendered = await mermaid.render(`mermaid-${id}`, normalizedSource);

        if (!cancelled) {
          setSvg(rendered.svg);
          setError(null);
        }
      } catch (renderError) {
        if (!cancelled) {
          setSvg("");
          setError(formatMermaidError(renderError));
        }
      }
    }

    void renderMermaidDiagram();

    return () => {
      cancelled = true;
    };
  }, [id, normalizedSource]);

  if (error) {
    return (
      <figure className="mermaid-shell">
        <p className="mermaid-error">Mermaid render failed: {error}</p>
        <pre className="mermaid-fallback">{normalizedSource}</pre>
      </figure>
    );
  }

  return (
    <figure className="mermaid-shell">
      {svg ? (
        <div
          className="mermaid-inner"
          // Mermaid returns trusted SVG generated from local content.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p className="mermaid-loading" aria-live="polite">
          Rendering Mermaid diagram...
        </p>
      )}
    </figure>
  );
}
