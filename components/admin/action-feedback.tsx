import { CyberCard } from "@/components/ui/cyber-card";
import { cx } from "@/lib/utils";

type ActionFeedbackProps = {
  kind?: string;
  scope?: string;
  message?: string;
};

const variants: Record<string, string> = {
  success: "border-accent/40 bg-accent/10 text-foreground",
  error: "border-destructive/40 bg-destructive/10 text-foreground",
};

export function ActionFeedback({ kind, scope, message }: ActionFeedbackProps) {
  if (!kind || !message) {
    return null;
  }

  const variant = variants[kind] ?? "border-border bg-card text-foreground";

  return (
    <CyberCard className={cx("space-y-2 border", variant)}>
      <p className="font-label text-xs uppercase tracking-[0.24em] text-mutedForeground">
        {scope ?? "feedback"}
      </p>
      <p className="text-sm">{message}</p>
    </CyberCard>
  );
}
