import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useExitPresence } from "../fx";

export function Modal({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const openedAt = useRef(0);
  const { shown, exiting } = useExitPresence(open, 280);

  useEffect(() => {
    if (!shown) return;
    openedAt.current = Date.now();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [shown, onClose]);

  if (!shown) return null;

  function dismiss() {
    if (Date.now() - openedAt.current < 320) return;
    onClose();
  }

  return createPortal(
    <div
      className={`fx-overlay fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 ${exiting ? "is-exit" : ""}`}
      onClick={dismiss}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
        className={`${exiting ? "fx-exit" : "rise"} max-h-[min(88dvh,720px)] w-[min(92vw,420px)] overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-elev-5`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
