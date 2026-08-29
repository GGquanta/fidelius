import { Loader } from "reicon-react";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { Link } from "react-router-dom";

type Tone = "primary" | "secondary" | "tertiary" | "danger" | "accent" | "peach" | "danger-soft";

const TONE: Record<Tone, string> = {
  primary: "btn-primary",
  secondary:
    "border border-line-strong bg-surface text-ink shadow-elev-1 hover:bg-hover",
  tertiary: "text-muted hover:bg-hover hover:text-ink",
  danger: "bg-danger text-white shadow-elev-1 hover:opacity-90",
  accent: "bg-accent-soft text-accent-ink hover:opacity-90",
  peach: "bg-peach-soft text-peach-ink hover:opacity-90",
  "danger-soft": "bg-danger-soft text-danger-ink hover:opacity-90",
};

function btnClass(tone: Tone, className: string) {
  return `fx-hover fx-press inline-flex items-center justify-center gap-1.5 rounded-box px-4 py-2 font-sans text-sm font-normal leading-none disabled:opacity-40 ${TONE[tone]} ${className}`;
}

export function Button({
  tone = "primary",
  className = "",
  busy = false,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; busy?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={btnClass(tone, className)}
    >
      {busy ? <Loader size={16} className="fx-spin shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  tone = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { tone?: Tone }) {
  return <Link {...props} className={btnClass(tone, className)} />;
}
