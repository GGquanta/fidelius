import {
  CaretRight,
  ChevronDown,
  ChevronLeft,
  Magnifier,
  Moon,
  Sun,
  Users,
  Vault,
  Widget,
} from "reicon-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { VT } from "../fx";
import { useSession } from "../session";
import { CATEGORIES } from "../templates";
import { useTheme } from "../ui";
import { CategoryIcon, type CategoryId } from "./CategoryIcon";
import { ProfilePanel } from "./ProfilePanel";
import { SealMark } from "./SealMark";
import { Skeleton } from "./Skeleton";
import { Wordmark } from "./Wordmark";

function isSensitivePath(pathname: string) {
  return pathname.startsWith("/records/");
}

function itemClass(active: boolean) {
  return `fx-hover flex h-9 w-full items-center gap-2 rounded-box px-3 text-sm ${
    active ? "bg-accent-soft text-accent-ink" : "side-hit text-muted"
  }`;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, unlocked, doLock } = useSession();
  const { dark, toggle } = useTheme();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [vaultOpen, setVaultOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const category = (params.get("category") as CategoryId | null) ?? "all";
  const onVault = location.pathname === "/vault";
  const inVaultSection =
    onVault || location.pathname === "/new" || location.pathname.startsWith("/records/");

  useEffect(() => {
    if (!isSensitivePath(location.pathname) && unlocked) {
      void doLock();
    }
  }, [location.pathname, unlocked, doLock]);

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
    const search = next.toString();
    if (location.pathname === "/vault" && search === params.toString()) return;
    if (location.pathname !== "/vault") navigate({ pathname: "/vault", search }, VT);
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

  function selectCategory(id: CategoryId) {
    setVaultOpen(true);
    const next = new URLSearchParams();
    const q = params.get("q");
    if (q) next.set("q", q);
    if (id !== "all") next.set("category", id);
    navigate({ pathname: "/vault", search: next.toString() }, location.pathname === "/vault" ? undefined : VT);
  }

  return (
    <div className="h-[100dvh] md:grid md:grid-cols-[272px_1fr]">
      <aside className="vt-sidebar sidebar-frost flex h-auto flex-col border-b border-line md:h-[100dvh] md:border-b-0 md:border-r">
        <div className="brand-lockup mx-3 mt-4 mb-3 flex items-center gap-5 px-2">
          <SealMark size={30} />
          <Wordmark />
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[12px] tracking-[0.08em] text-tertiary">工作台</p>
          <NavLink to="/" end viewTransition className={({ isActive }) => itemClass(isActive)}>
            <Widget size={16} className="text-tertiary" />
            概览
          </NavLink>

          <div className="mt-6">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`fx-hover flex h-9 min-w-0 flex-1 items-center gap-2 rounded-box px-3 text-sm ${
                  inVaultSection && !onVault
                    ? "bg-accent-soft text-accent-ink"
                    : inVaultSection
                      ? "text-ink"
                      : "side-hit text-muted"
                }`}
                onClick={() => selectCategory("all")}
              >
                <Vault size={16} className="text-tertiary" />
                <span className="min-w-0 flex-1 text-left">保险库</span>
                {counts ? (
                  <span className="font-metric text-[12px] text-tertiary">{counts.all ?? 0}</span>
                ) : (
                  <Skeleton className="inline-block h-3 w-5 rounded-sm" />
                )}
              </button>
              <button
                type="button"
                className="side-hit rounded-box p-2 text-tertiary"
                aria-expanded={vaultOpen}
                aria-label={vaultOpen ? "收起分类" : "展开分类"}
                onClick={() => setVaultOpen((open) => !open)}
              >
                {vaultOpen ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>
            <div className={`side-tree-clip ${vaultOpen ? "is-open" : ""}`} inert={!vaultOpen || undefined}>
              <ul className="side-tree">
                {CATEGORIES.map((item) => {
                  const active = onVault && category === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => selectCategory(item.id)}
                        className={`fx-hover flex h-9 w-full items-center gap-2 rounded-box px-3 text-sm ${
                          active ? "bg-accent-soft text-accent-ink" : "side-hit text-muted"
                        }`}
                      >
                        <CategoryIcon category={item.id} size={20} />
                        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                        {counts ? (
                          <span className="font-metric text-[12px] text-tertiary">{counts[item.id] ?? 0}</span>
                        ) : (
                          <Skeleton className="inline-block h-3 w-5 rounded-sm" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {user?.role === "admin" ? (
            <>
              <p className="mt-6 px-3 pb-2 text-[12px] tracking-[0.08em] text-tertiary">管理</p>
              <NavLink to="/users" viewTransition className={({ isActive }) => itemClass(isActive)}>
                <Users size={16} className="text-tertiary" />
                团队
              </NavLink>
            </>
          ) : null}
        </nav>

        <div className="p-3">
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
            <button
              type="button"
              className="fx-hover flex min-w-0 flex-1 items-center gap-3 rounded-box px-2 py-2 text-left hover:bg-hover"
              onClick={() => setProfileOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={profileOpen}
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm text-accent-ink">
                {user?.displayName.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{user?.displayName}</span>
                <span className="block text-[12px] text-tertiary">{user?.role === "admin" ? "管理员" : "成员"}</span>
              </span>
              <CaretRight size={12} className="shrink-0 text-tertiary" />
            </button>
            <button
              type="button"
              onClick={toggle}
              className="fx-hover shrink-0 rounded-box p-2 text-muted hover:bg-hover hover:text-ink"
              aria-label="切换主题"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
        <ProfilePanel open={profileOpen} onClose={closeProfile} />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="flex h-16 shrink-0 items-center border-b border-line bg-surface px-6">
          <form onSubmit={search} className="relative w-full max-w-xl">
            <Magnifier size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题或描述"
              className="w-full rounded-box border border-line-strong bg-canvas py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
            />
          </form>
        </header>
        <main className="vt-paper mesh-glow flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
