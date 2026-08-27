import { Moon, Sun } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage, useSession } from "../session";
import { useTheme } from "../ui";

export function TopBar({
  onToast,
}: {
  onToast: (text: string) => void;
}) {
  const { user, unlocked, doUnlock, doLock } = useSession();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await doUnlock(code);
      setCode("");
      setOpen(false);
      onToast("已开锁");
    } catch (error) {
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="relative flex h-16 items-center justify-between border-b border-line px-6">
      <Link to="/" className="font-medium tracking-[-0.04em]">
        Fidelius
      </Link>
      <div className="flex items-center gap-5 text-sm text-muted">
        {user?.role === "admin" ? (
          <Link to="/users" className="hover:text-ink">
            用户
          </Link>
        ) : null}
        <button type="button" onClick={toggle} className="hover:text-ink" aria-label="切换主题">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <span>{user?.displayName}</span>
        {unlocked ? (
          <button
            type="button"
            className="text-pine hover:text-ink"
            onClick={() => void doLock().then(() => onToast("已封存"))}
          >
            封存
          </button>
        ) : (
          <button type="button" className="text-ink hover:text-pine" onClick={() => setOpen((v) => !v)}>
            开锁
          </button>
        )}
      </div>
      {open && !unlocked ? (
        <form
          onSubmit={(event) => void submit(event)}
          className="absolute right-6 top-16 z-10 w-64 border border-line bg-surface p-4"
        >
          <label className="block text-xs text-muted">6 位验证码</label>
          <input
            autoFocus
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mt-2 w-full border-b border-line bg-transparent py-2 font-mono tracking-[0.4em] outline-none"
          />
          {err ? <p className="mt-2 text-xs text-danger">{err}</p> : null}
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="mt-3 w-full bg-ink py-2 text-sm text-canvas disabled:opacity-40"
          >
            开锁
          </button>
        </form>
      ) : null}
    </header>
  );
}
