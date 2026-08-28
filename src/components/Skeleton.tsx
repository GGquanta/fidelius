import type { HTMLAttributes, ReactNode } from "react";

export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={`fx-shimmer ${className}`} aria-hidden />;
}

export function LoadingRegion({
  children,
  label = "加载中",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
