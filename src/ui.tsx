import { useEffect, useState } from "react";

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

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 1600);
    return () => window.clearTimeout(id);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-box bg-ink px-4 py-2 text-sm text-canvas">
      {text}
    </div>
  );
}
