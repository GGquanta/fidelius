import {
  AwardCertificate,
  Cloud,
  Code,
  Database,
  Fingerprint,
  FolderOpen,
  Globe,
  HardDrive,
  Lifebuoy,
  ThreeDCube,
  Wifi,
  type IconComponent,
} from "reicon-react";
import type { Category } from "../api";

export type CategoryId = Category | "all";

const META: Record<
  CategoryId,
  { icon: IconComponent; color: string; soft: string; ink: string }
> = {
  all: { icon: FolderOpen, color: "var(--cat-all)", soft: "var(--cat-all-soft)", ink: "var(--cat-all-ink)" },
  server: {
    icon: HardDrive,
    color: "var(--cat-server)",
    soft: "var(--cat-server-soft)",
    ink: "var(--cat-server-ink)",
  },
  database: {
    icon: Database,
    color: "var(--cat-database)",
    soft: "var(--cat-database-soft)",
    ink: "var(--cat-database-ink)",
  },
  ssl: { icon: AwardCertificate, color: "var(--cat-ssl)", soft: "var(--cat-ssl-soft)", ink: "var(--cat-ssl-ink)" },
  apikey: { icon: Code, color: "var(--cat-apikey)", soft: "var(--cat-apikey-soft)", ink: "var(--cat-apikey-ink)" },
  login: {
    icon: Fingerprint,
    color: "var(--cat-login)",
    soft: "var(--cat-login-soft)",
    ink: "var(--cat-login-ink)",
  },
  cloud: { icon: Cloud, color: "var(--cat-cloud)", soft: "var(--cat-cloud-soft)", ink: "var(--cat-cloud-ink)" },
  domain: { icon: Globe, color: "var(--cat-domain)", soft: "var(--cat-domain-soft)", ink: "var(--cat-domain-ink)" },
  network: {
    icon: Wifi,
    color: "var(--cat-network)",
    soft: "var(--cat-network-soft)",
    ink: "var(--cat-network-ink)",
  },
  recovery: {
    icon: Lifebuoy,
    color: "var(--cat-recovery)",
    soft: "var(--cat-recovery-soft)",
    ink: "var(--cat-recovery-ink)",
  },
  generic: { icon: ThreeDCube, color: "var(--cat-generic)", soft: "var(--cat-generic-soft)", ink: "var(--cat-generic-ink)" },
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
