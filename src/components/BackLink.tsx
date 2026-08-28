import { ArrowLeft } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} viewTransition className="fx-hover inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-box border border-line bg-surface">
        <ArrowLeft size={16} />
      </span>
      {label}
    </Link>
  );
}
