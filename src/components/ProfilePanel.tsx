import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import { errorMessage, useSession } from "../session";
import { useToast } from "../ui";
import { Button } from "./Button";

export function ProfilePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refresh } = useSession();
  const toast = useToast();
  const [name, setName] = useState(user?.displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setName(user?.displayName ?? "");
      setErr("");
      setBusy(false);
    }
  }, [open, user?.displayName]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setErr("");
    try {
      await api.updateMe(trimmed);
      await refresh();
      toast("已保存");
      onClose();
    } catch (error) {
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-ink/25 p-4" onClick={onClose}>
      <form
        onSubmit={(event) => void submit(event)}
        onClick={(event) => event.stopPropagation()}
        className="rise w-[min(92vw,380px)] rounded-xl border border-line bg-surface p-6 shadow-elev-5"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-sm text-accent-ink">
            {user.displayName.slice(0, 1)}
          </span>
          <div>
            <h2 className="text-base font-medium">个人资料</h2>
            <p className="text-sm text-muted">显示名会出现在分享与日志里</p>
          </div>
        </div>

        <label className="mt-6 block text-[12px] text-muted">显示名</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={32}
          autoFocus
          className="mt-2 w-full rounded-box border border-line-strong bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
        />

        <p className="mt-5 text-[12px] text-muted">邮箱</p>
        <p className="mt-1 font-mono text-sm">{user.email}</p>
        <p className="mt-1 text-[12px] text-tertiary">由 Access 绑定，不能在此修改</p>

        <p className="mt-5 text-[12px] text-muted">角色</p>
        <p className="mt-1 text-sm">{user.role === "admin" ? "管理员" : "成员"}</p>

        {err ? <p className="mt-4 text-sm text-danger">{err}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" tone="tertiary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={busy || !name.trim() || name.trim() === user.displayName}>
            保存
          </Button>
        </div>
      </form>
    </div>
  );
}
