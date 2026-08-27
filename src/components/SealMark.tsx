import { Shield } from "@phosphor-icons/react";

export function SealMark({ size = 28 }: { size?: number }) {
  const icon = Math.round(size * 0.55);
  return (
    <span
      className="inline-flex items-center justify-center rounded-tile text-white shadow-elev-1"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(180deg, var(--violet-500), var(--violet-600))",
        boxShadow: "inset 0 1px 0 hsl(270, 80%, 74%)",
      }}
      aria-hidden
    >
      <Shield size={icon} />
    </span>
  );
}
