import { Check } from "@phosphor-icons/react";
import { createContext, useContext, useEffect, useState } from "react";
import { prefersReducedMotion } from "./fx";

export function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("fidelius-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("fidelius-theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark((v) => !v) };
}

const ToastContext = createContext<(text: string) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [text, setText] = useState("");
  return (
    <ToastContext.Provider value={setText}>
      {children}
      {text ? <Toast text={text} onDone={() => setText("")} /> : null}
    </ToastContext.Provider>
  );
}

function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const fade = prefersReducedMotion() ? 0 : 180;
    const start = window.setTimeout(() => setExiting(true), 1600);
    const end = window.setTimeout(onDone, 1600 + fade);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(end);
    };
  }, [onDone]);

  return (
    <div
      className={`fx-toast fixed bottom-6 left-1/2 z-40 flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm text-canvas shadow-elev-3 ${
        exiting ? "is-exit" : ""
      }`}
    >
      <Check size={14} />
      {text}
    </div>
  );
}
