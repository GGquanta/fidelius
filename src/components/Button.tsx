import type { ButtonHTMLAttributes } from "react";

type Tone = "primary" | "secondary" | "tertiary" | "danger";

const TONE: Record<Tone, string> = {
  primary: "btn-primary",
  secondary:
    "border border-line-strong bg-surface text-ink shadow-elev-1 hover:bg-hover",
  tertiary: "text-muted hover:bg-hover hover:text-ink",
  danger: "bg-danger text-white shadow-elev-1 hover:opacity-90",
};

export function Button({
  tone = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-box px-4 py-2 text-sm disabled:opacity-40 ${TONE[tone]} ${className}`}
    />
  );
}
