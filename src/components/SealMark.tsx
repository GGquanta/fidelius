import { Shield } from "@phosphor-icons/react";

export function SealMark({ size = 28 }: { size?: number }) {
  const icon = Math.round(size * 0.55);
  return (
    <span
      className="inline-flex items-center justify-center rounded-tile bg-accent text-white dark:text-stone-900"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Shield size={icon} />
    </span>
  );
}
