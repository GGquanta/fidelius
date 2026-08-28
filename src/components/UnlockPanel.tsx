import { LockSimple, LockSimpleOpen } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { errorMessage, useSession } from "../session";
import { Button } from "./Button";
import { OtpBoxes } from "./OtpBoxes";

export function UnlockPanel({
  open,
  onClose,
  onToast,
}: {
  open: boolean;
  onClose: () => void;
  onToast: (text: string) => void;
}) {
  const { doUnlock } = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    if (!open) {
      setCode("");
      setErr("");
      setBusy(false);
      setDone(false);
      submitted.current = false;
    }
  }, [open]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (submitted.current || code.length !== 6) return;
    submitted.current = true;
    setBusy(true);
    setErr("");
    try {
      await doUnlock(code);
      setDone(true);
      onToast("已开锁");
      window.setTimeout(() => onClose(), 480);
    } catch (error) {
      submitted.current = false;
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (open && code.length === 6 && !busy && !done) {
      void submit();
    }
  }, [code, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-ink/25 p-4" onClick={onClose}>
      <form
        onSubmit={(event) => void submit(event)}
        onClick={(event) => event.stopPropagation()}
        className="rise w-[min(92vw,380px)] rounded-xl border border-line bg-surface p-6 shadow-elev-5"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-tile bg-accent-soft text-accent">
            {done ? <LockSimpleOpen size={20} /> : <LockSimple size={20} />}
          </span>
          <div>
            <h2 className="text-base font-medium">{done ? "已开锁" : "开锁"}</h2>
            <p className="text-sm text-muted">{done ? "敏感字段已显示" : "请输入验证器中的 6 位验证码"}</p>
          </div>
        </div>
        <div className="mt-6">
          <OtpBoxes value={code} onChange={setCode} disabled={busy || done} />
        </div>
        {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" tone="tertiary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={busy || done || code.length !== 6}>
            开锁
          </Button>
        </div>
      </form>
    </div>
  );
}

export function SensitiveUnlock({ onToast }: { onToast: (text: string) => void }) {
  const { unlocked, doLock } = useSession();
  const [open, setOpen] = useState(false);

  if (unlocked) {
    return (
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-line pb-4">
        <p className="flex items-center gap-2 text-sm text-muted">
          <LockSimpleOpen size={16} />
          已开锁，离开本页会自动封存
        </p>
        <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => void doLock().then(() => onToast("已封存"))}>
          封存
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-3 rounded-box bg-peach-soft px-4 py-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-tile bg-surface text-peach-ink">
          <LockSimple size={16} />
        </span>
        <p className="min-w-0 flex-1 text-sm text-peach-ink">敏感内容已封存，开锁后可查看。</p>
        <Button type="button" onClick={() => setOpen(true)}>
          开锁
        </Button>
      </div>
      <UnlockPanel open={open} onClose={() => setOpen(false)} onToast={onToast} />
    </>
  );
}
