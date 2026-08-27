import {
  LockSimple,
  LockSimpleOpen,
  MagnifyingGlass,
  Moon,
  Sun,
  Users,
} from "@phosphor-icons/react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useSession } from "../session";
import { CATEGORIES } from "../templates";
import { useTheme } from "../ui";
import { CategoryIcon, type CategoryId } from "./CategoryIcon";
import { SealMark } from "./SealMark";
import { UnlockPanel } from "./UnlockPanel";

export function AppShell({
  children,
  onToast,
}: {
  children: React.ReactNode;
  onToast: (text: string) => void;
}) {
  const { user, unlocked, doLock } = useSession();
  const { dark, toggle } = useTheme();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const category = (params.get("category") as CategoryId | null) ?? "all";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [counts, setCounts] = useState<Record<string, number>>({ all: 0 });
  const [unlockOpen, setUnlockOpen] = useState(false);

  useEffect(() => {
    void api.records().then((result) => {
      const next: Record<string, number> = { all: result.records.length };
      for (const record of result.records) {
        next[record.category] = (next[record.category] ?? 0) + 1;
      }
      setCounts(next);
    });
  }, [location.pathname]);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  function applySearch(value: string, replace = true) {
    const next = new URLSearchParams(params);
    const trimmed = value.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    if (next.toString() === params.toString() && location.pathname === "/") return;
    if (location.pathname !== "/") navigate({ pathname: "/", search: next.toString() });
    else setParams(next, { replace });
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      const trimmed = query.trim();
      const current = params.get("q") ?? "";
      if (trimmed === current && location.pathname === "/") return;
      if (!trimmed && location.pathname !== "/") return;
      applySearch(query);
    }, 180);
    return () => window.clearTimeout(id);
  }, [query]);

  function search(event: FormEvent) {
    event.preventDefault();
    applySearch(query, false);
  }

  function selectCategory(id: CategoryId) {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("category");
    else next.set("category", id);
    if (location.pathname !== "/") navigate({ pathname: "/", search: next.toString() });
    else setParams(next);
  }

  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[220px_1fr]">
      <aside className="flex flex-col border-b border-line bg-surface md:border-b-0 md:border-r">
        <Link to="/" className="flex h-16 items-center gap-2.5 px-4">
          <SealMark />
          <span className="font-medium tracking-[-0.04em]">Fidelius</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
          {CATEGORIES.map((item) => {
            const active = location.pathname === "/" && category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectCategory(item.id)}
                className={`flex items-center gap-2 rounded-box px-2 py-2 text-sm ${
                  active ? "bg-accent-soft text-accent" : "text-muted hover:bg-hover hover:text-ink"
                }`}
              >
                <CategoryIcon category={item.id} size={28} />
                <span className="whitespace-nowrap">{item.label}</span>
                <span className="ml-auto font-mono text-xs">{counts[item.id] ?? 0}</span>
              </button>
            );
          })}
        </nav>
        <p className="hidden px-4 py-4 text-xs text-muted md:block">封缄之后，各安其位</p>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-line px-4">
          <form onSubmit={search} className="relative min-w-0 flex-1">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题或描述"
              className="w-full rounded-box border border-line bg-canvas py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
            />
          </form>
          <div className="flex items-center gap-2 text-sm text-muted">
            {user?.role === "admin" ? (
              <Link
                to="/users"
                className={`rounded-box p-2 hover:bg-hover hover:text-ink ${location.pathname === "/users" ? "text-accent" : ""}`}
                aria-label="用户"
              >
                <Users size={16} />
              </Link>
            ) : null}
            <button type="button" onClick={toggle} className="rounded-box p-2 hover:bg-hover hover:text-ink" aria-label="切换主题">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span className="hidden max-w-24 truncate sm:inline">{user?.displayName}</span>
            {unlocked ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-box bg-accent-soft px-2.5 py-1.5 text-accent"
                onClick={() => void doLock().then(() => onToast("已封存"))}
              >
                <LockSimpleOpen size={14} />
                封存
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-box bg-accent px-2.5 py-1.5 text-white dark:text-stone-900"
                onClick={() => setUnlockOpen(true)}
              >
                <LockSimple size={14} />
                开锁
              </button>
            )}
          </div>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <UnlockPanel open={unlockOpen} onClose={() => setUnlockOpen(false)} onToast={onToast} />
    </div>
  );
}
