import { Certificate, Cube, HardDrives, Key, Vault } from "@phosphor-icons/react";
import type { Category } from "../api";

export type CategoryId = Category | "all";

const META: Record<CategoryId, { icon: typeof Vault; color: string; soft: string }> = {
  all: { icon: Vault, color: "var(--ink)", soft: "var(--hover)" },
  server: { icon: HardDrives, color: "var(--cat-server)", soft: "var(--cat-server-soft)" },
  ssl: { icon: Certificate, color: "var(--cat-ssl)", soft: "var(--cat-ssl-soft)" },
  login: { icon: Key, color: "var(--cat-login)", soft: "var(--cat-login-soft)" },
  generic: { icon: Cube, color: "var(--cat-generic)", soft: "var(--cat-generic-soft)" },
};

export function CategoryIcon({
  category,
  size = 36,
}: {
  category: CategoryId;
  size?: number;
}) {
  const meta = META[category];
  const Icon = meta.icon;
  const glyph = size >= 56 ? 28 : size <= 32 ? 16 : 20;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-tile"
      style={{ width: size, height: size, background: meta.soft, color: meta.color }}
      aria-hidden
    >
      <Icon size={glyph} />
    </span>
  );
}

export function categoryTone(category: CategoryId) {
  return META[category];
}
