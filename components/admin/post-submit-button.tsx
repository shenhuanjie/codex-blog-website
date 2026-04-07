"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

import { cx } from "@/lib/utils";

type PostSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  idleLabel: string;
  pendingLabel: string;
  matchIntent?: "draft" | "publish";
};

export function PostSubmitButton({
  idleLabel,
  pendingLabel,
  matchIntent,
  className,
  disabled,
  ...props
}: PostSubmitButtonProps) {
  const { pending, data } = useFormStatus();
  const rawIntent = data?.get("_intent");
  const submittedIntent = typeof rawIntent === "string" ? rawIntent : "";
  const isMatchingAction = matchIntent
    ? submittedIntent === matchIntent
    : submittedIntent.length === 0;
  const isDisabled = Boolean(disabled) || pending;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={cx(
        className,
        isDisabled ? "cursor-wait opacity-70" : undefined
      )}
    >
      {pending && isMatchingAction ? pendingLabel : idleLabel}
    </button>
  );
}
