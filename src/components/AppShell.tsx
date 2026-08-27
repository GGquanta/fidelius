import {
  LockSimple,
  LockSimpleOpen,
  MagnifyingGlass,
  Moon,
  SquaresFour,
  Sun,
  Users,
  Vault,
} from "@phosphor-icons/react";
import { FormEvent, useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useSession } from "../session";
import { useTheme } from "../ui";
import { Button } from "./Button";
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
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [unlockOpen, setUnlockOpen] = useState(false);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  function applySearch(value: string, replace = true) {
    const next = new URLSearchParams(params);
    const trimmed = value.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    const search = next.toString();
    if (location.pathname === "/vault" && search === params.toString()) return;
    if (location.pathname !== "/vault") navigate({ pathname: "/vault", search });
    else setParams(next, { replace });
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      const trimmed = query.trim();
      const current = params.get("q") ?? "";
      if (trimmed === current && location.pathname === "/vault") return;
      if (!trimmed && location.pathname !== "/vault") return;
      applySearch(query);
    }, 180);
    return () => window.clearTimeout(id);
  }, [query]);

  function search(event: FormEvent) {
    event.preventDefault();
    applySearch(query, false);
  }

  const nav = [
    { to: "/", label: "概览", icon: SquaresFour, end: true },
    { to: "/vault", label: "保险库", icon: Vault, end: false },
    ...(user?.role === "admin" ? [{ to: "/users", label: "团队", icon: Users, end: false }] : []),
  ];

  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-b border-line bg-surface md:border-b-0 md:border-r">
        <Link to="/" className="flex h-16 items-center gap-2.5 px-5">
          <SealMark />
          <span className="font-medium tracking-[-0.04em]">Fidelius</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-box px-3 py-2 text-sm ${
                  isActive ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-hover hover:text-ink"
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t border-line p-4">
          {unlocked ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg bg-accent-soft px-3 py-2.5 text-left text-sm text-accent-ink"
              onClick={() => void doLock().then(() => onToast("已封存"))}
            >
              <LockSimpleOpen size={16} />
              封存
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm"
              onClick={() => setUnlockOpen(true)}
            >
              <LockSimple size={16} />
              开锁
            </button>
          )}
          <div className="flex items-center justify-between text-sm text-muted">
            <span className="truncate">{user?.displayName}</span>
            <button type="button" onClick={toggle} className="rounded-box p-2 hover:bg-hover hover:text-ink" aria-label="切换主题">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur-sm">
          <form onSubmit={search} className="relative min-w-0 flex-1">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题或描述"
              className="w-full rounded-box border border-line-strong bg-canvas py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
            />
          </form>
          {unlocked ? (
            <Button tone="secondary" onClick={() => void doLock().then(() => onToast("已封存"))} className="hidden sm:inline-flex">
              <LockSimpleOpen size={14} />
              封存
            </Button>
          ) : (
            <Button onClick={() => setUnlockOpen(true)} className="hidden sm:inline-flex">
              <LockSimple size={14} />
              开锁
            </Button>
          )}
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <UnlockPanel open={unlockOpen} onClose={() => setUnlockOpen(false)} onToast={onToast} />
    </div>
  );
}
