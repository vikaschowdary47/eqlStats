import type { ComponentProps, ReactNode } from "react";
import type { Status } from "@/lib/types";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

// Buttons ---------------------------------------------------------------------

const BUTTON = {
  primary: "bg-ink text-bg hover:opacity-90",
  secondary: "bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-sunk",
  ghost: "text-ink-2 hover:bg-sunk hover:text-ink",
  danger: "bg-down text-white hover:opacity-90",
  plate: "bg-plate-2 text-plate-ink ring-1 ring-inset ring-white/10 hover:bg-white/10",
} as const;

export type ButtonVariant = keyof typeof BUTTON;

export function buttonClass(variant: ButtonVariant = "primary", size: "sm" | "md" = "md") {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
    BUTTON[variant],
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return <button className={cx(buttonClass(variant, size), className)} {...props} />;
}

// Form fields -----------------------------------------------------------------

export const inputClass =
  "block w-full rounded-lg bg-surface px-3 py-2 text-[15px] text-ink ring-1 ring-inset ring-line-strong placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-[var(--focus)]";

export function Field({ label, help, children, htmlFor }: { label: string; help?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {help ? <p className="text-[13px] text-ink-3">{help}</p> : null}
    </div>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(inputClass, "min-h-24", props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, "appearance-none pr-8", props.className)} />;
}

export function FormMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={cx("text-sm", state.error ? "text-down" : "text-ok")}>
      {state.error ?? state.ok}
    </p>
  );
}

// Status ------------------------------------------------------------------------

export const STATUS_LABEL: Record<Status, string> = {
  ok: "Healthy",
  warn: "Needs attention",
  down: "Failing",
  unknown: "Not checked",
};

export function Lamp({ status, size = 10, index }: { status: Status; size?: number; index?: number }) {
  return (
    <span
      className="lamp"
      data-status={status}
      role="img"
      aria-label={STATUS_LABEL[status]}
      style={{ ["--size" as string]: `${size}px`, ["--i" as string]: index ?? 0 }}
    />
  );
}

// Layout ------------------------------------------------------------------------

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold sm:text-[32px]">{title}</h1>
        {description ? <p className="mt-1 max-w-[62ch] text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({ title, description, children, className, actions }: { title?: ReactNode; description?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cx("rounded-xl bg-surface ring-1 ring-line", className)}>
      {title ? (
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[17px] font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-[13px] text-ink-3">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 0) {
    const d = Math.ceil(-s / 86400);
    return d <= 1 ? "within a day" : `in ${d} days`;
  }
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
