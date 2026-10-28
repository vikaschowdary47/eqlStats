"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action";
import { Button, FormMessage, cx, type ButtonVariant } from "./ui";

export function SubmitButton({ children, pending, variant = "primary", size = "md", className }: { children: ReactNode; pending?: string; variant?: ButtonVariant; size?: "sm" | "md"; className?: string }) {
  const status = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={status.pending} aria-busy={status.pending} className={className}>
      {status.pending ? (pending ?? "Working…") : children}
    </Button>
  );
}

/** Wraps a server action that returns ActionState and shows its message. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div className="mt-3 empty:hidden">
        <FormMessage state={state} />
      </div>
      {state?.url ? <CopyField value={state.url} /> : null}
    </form>
  );
}

export function CopyButton({ value, getValue, label = "Copy link", variant = "secondary" }: { value?: string; getValue?: () => Promise<string | null>; label?: string; variant?: ButtonVariant }) {
  const [copied, setCopied] = useState<"idle" | "done" | "error">("idle");
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      onClick={async () => {
        try {
          const v = value ?? (await getValue?.());
          if (!v) throw new Error("no value");
          await navigator.clipboard.writeText(v);
          setCopied("done");
        } catch {
          setCopied("error");
        }
        setTimeout(() => setCopied("idle"), 1800);
      }}
    >
      {copied === "done" ? "Copied" : copied === "error" ? "Couldn't copy" : label}
    </Button>
  );
}

export function CopyField({ value }: { value: string }) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg bg-sunk p-1.5 pl-3 ring-1 ring-inset ring-line">
      <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink-2">{value}</code>
      <CopyButton value={value} />
    </div>
  );
}

/** A button that asks before submitting a destructive form. */
export function ConfirmButton({ children, message, className, variant = "ghost" }: { children: ReactNode; message: string; className?: string; variant?: ButtonVariant }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={variant}
      disabled={pending}
      className={cx(className)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
