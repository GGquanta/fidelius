import {
  CaretRight,
  ChevronDown,
  ChevronLeft,
  Magnifier,
  Menu,
  Moon,
  Setting,
  Sun,
  Users,
  Vault,
  Widget,
} from "reicon-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useExitPresence, VT } from "../fx";
import { useSession } from "../session";
import { CATEGORIES } from "../templates";
import { useTheme } from "../ui";
import { CategoryIcon, type CategoryId } from "./CategoryIcon";
import { ProfilePanel } from "./ProfilePanel";
import { SealMark } from "./SealMark";
import { SettingsPanel } from "./SettingsPanel";
import { Skeleton } from "./Skeleton";
import { Wordmark } from "./Wordmark";

const DESKTOP_QUERY = "(min-width: 768px)";

function isSensitivePath(pathname: string) {
  return pathname.startsWith("/records/");
}

function itemClass(active: boolean) {
  return `fx-hover flex h-9 w-full items-center gap-2 rounded-box px-3 text-sm ${
    active ? "bg-accent-soft text-accent-ink" : "side-hit text-muted"
  }`;
}

function useDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(DESKTOP_QUERY).matches : true,
  );

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    function sync() {
      setDesktop(media.matches);
    }
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return desktop;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, unlocked, doLock } = useSession();
  const { dark, toggle } = useTheme();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const desktop = useDesktop();
  const menuRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const wasNavOpen = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [vaultOpen, setVaultOpen] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { shown: navShown, exiting: navExiting } = useExitPresence(navOpen, 280);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const category = (params.get("category") as CategoryId | null) ?? "all";
  const onVault = location.pathname === "/vault";
  const drawerActive = navOpen && !desktop;
  const searchExpanded = searchOpen && !desktop;
  const searchArmed = searchExpanded || Boolean(query.trim());

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

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (desktop) {
      setNavOpen(false);
      setSearchOpen(false);
    }
  }, [desktop]);

  useEffect(() => {
    if (!drawerActive && !searchExpanded) return;
    const previous = document.body.style.overflow;
    if (drawerActive) document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (drawerActive) closeNav();
      else if (searchExpanded) setSearchOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerActive, searchExpanded, closeNav]);

  useEffect(() => {
    if (searchExpanded) searchRef.current?.focus();
  }, [searchExpanded]);

  useEffect(() => {
    if (drawerActive) {
      asideRef.current?.focus();
    } else if (wasNavOpen.current && !desktop) {
      menuRef.current?.focus();
    }
    wasNavOpen.current = drawerActive;
  }, [drawerActive]);

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
    closeNav();
    const next = new URLSearchParams();
    const q = params.get("q");
    if (q) next.set("q", q);
    if (id !== "all") next.set("category", id);
    navigate({ pathname: "/vault", search: next.toString() }, location.pathname === "/vault" ? undefined : VT);
  }

  return (
    <div className="flex h-[100dvh] flex-col md:grid md:grid-cols-[272px_1fr]">
      {navShown && !desktop ? (
        <div
          className={`fx-overlay fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-40 bg-ink/40 md:hidden ${navExiting ? "is-exit" : ""}`}
          onClick={closeNav}
          role="presentation"
        />
      ) : null}
      <aside
        ref={asideRef}
        id="app-sidebar"
        tabIndex={-1}
        aria-label="导航"
        role={drawerActive ? "dialog" : undefined}
        aria-modal={drawerActive || undefined}
        aria-hidden={!desktop && !navOpen ? true : undefined}
        inert={!desktop && !navOpen ? true : undefined}
        className={`vt-sidebar sidebar-frost fx-drawer flex h-[100dvh] flex-col outline-none max-md:fixed max-md:top-[calc(4rem+env(safe-area-inset-top))] max-md:bottom-0 max-md:left-0 max-md:z-40 max-md:h-auto max-md:w-[min(272px,calc(100vw-48px))] md:relative md:border-r md:border-line ${
          navOpen ? "is-open" : ""
        } ${navShown && !desktop ? "border-r border-line shadow-elev-4" : ""} ${
          !desktop && !navOpen ? "pointer-events-none" : ""
        }`}
      >
        <div className="brand-lockup mx-3 mt-4 mb-3 hidden items-center gap-5 px-2 md:flex">
          <SealMark size={30} />
          <Wordmark />
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[12px] tracking-[0.08em] text-tertiary">工作台</p>
          <NavLink
            to="/"
            end
            viewTransition
            onClick={closeNav}
            className={({ isActive }) => itemClass(isActive)}
          >
            <Widget size={16} className="text-tertiary" />
            概览
          </NavLink>

          <div className="mt-6">
            <p className="px-3 pb-2 text-[12px] tracking-[0.08em] text-tertiary">保险库</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`fx-hover flex h-9 min-w-0 flex-1 items-center gap-2 rounded-box px-3 text-sm ${
                  onVault && category === "all" ? "bg-accent-soft text-accent-ink" : "side-hit text-muted"
                }`}
                onClick={() => selectCategory("all")}
              >
                <Vault size={16} className="text-tertiary" />
                <span className="min-w-0 flex-1 text-left">全部</span>
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
                {CATEGORIES.filter((item) => item.id !== "all").map((item) => {
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
              <NavLink to="/users" viewTransition onClick={closeNav} className={({ isActive }) => itemClass(isActive)}>
                <Users size={16} className="text-tertiary" />
                团队
              </NavLink>
            </>
          ) : null}
        </nav>

        <div className="p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
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
          </div>
        </div>
        <ProfilePanel open={profileOpen} onClose={closeProfile} />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="relative z-50 shrink-0 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
          <div className="flex h-16 items-center gap-3 px-4 md:gap-4 md:px-6">
            <button
              ref={menuRef}
              type="button"
              className={`fx-hover fx-press inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-box md:hidden ${
                navOpen ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-hover hover:text-ink"
              }`}
              aria-expanded={navOpen}
              aria-controls="app-sidebar"
              aria-label={navOpen ? "关闭导航" : "打开导航"}
              onClick={() => {
                setSearchOpen(false);
                setNavOpen((open) => !open);
              }}
            >
              <Menu size={16} />
            </button>
            {searchExpanded ? null : (
              <div className="brand-lockup flex min-w-0 flex-1 items-center gap-3 md:hidden">
                <SealMark size={30} />
                <Wordmark />
              </div>
            )}
            <form
              onSubmit={search}
              className={`relative min-w-0 ${searchExpanded ? "flex-1" : "hidden"} md:block md:w-full md:max-w-xl`}
            >
              <Magnifier size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={desktop ? "搜索标题或描述" : "搜索"}
                className="w-full rounded-box border border-line-strong bg-canvas py-2 pl-9 pr-3 text-base outline-none focus:border-accent md:text-sm"
              />
            </form>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button
                type="button"
                className={`fx-hover fx-press inline-flex h-10 w-10 items-center justify-center rounded-box md:hidden ${
                  searchArmed ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-hover hover:text-ink"
                }`}
                aria-expanded={searchExpanded}
                aria-label={searchExpanded ? "收起搜索" : "搜索"}
                onClick={() => {
                  closeNav();
                  setSearchOpen((open) => !open);
                }}
              >
                <Magnifier size={16} />
              </button>
              <button
                type="button"
                onClick={toggle}
                className="fx-hover fx-press inline-flex h-10 w-10 items-center justify-center rounded-box text-muted hover:bg-hover hover:text-ink"
                aria-label="切换主题"
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className={`fx-hover fx-press inline-flex h-10 w-10 items-center justify-center rounded-box ${
                  settingsOpen ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-hover hover:text-ink"
                }`}
                aria-label="设置"
                aria-haspopup="dialog"
                aria-expanded={settingsOpen}
              >
                <Setting size={16} />
              </button>
            </div>
          </div>
        </header>
        <SettingsPanel open={settingsOpen} onClose={closeSettings} />
        <main className="vt-paper mesh-glow flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
