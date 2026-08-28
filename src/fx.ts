import { useEffect, useState } from "react";

export const VT = { viewTransition: true } as const;

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useExitPresence(open: boolean, ms = 200) {
  const [shown, setShown] = useState(open);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setShown(true);
      setExiting(false);
      return;
    }
    if (!shown) return;
    const duration = prefersReducedMotion() ? 0 : ms;
    if (duration === 0) {
      setShown(false);
      setExiting(false);
      return;
    }
    setExiting(true);
    const id = window.setTimeout(() => {
      setShown(false);
      setExiting(false);
    }, duration);
    return () => window.clearTimeout(id);
  }, [open, ms, shown]);

  return { shown, exiting };
}
