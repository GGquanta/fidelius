import { LockSimple, LockSimpleOpen } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { errorMessage, useSession } from "../session";
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
        className="rise w-[min(92vw,380px)] rounded-box border border-line bg-surface p-6"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-tile bg-accent-soft text-accent">
            {done ? <LockSimpleOpen size={20} /> : <LockSimple size={20} />}
          </span>
          <div>
            <h2 className="text-base font-medium">{done ? "已开锁" : "开锁"}</h2>
            <p className="text-sm text-muted">{done ? "敏感字段已揭开" : "输入认证器中的 6 位数字"}</p>
          </div>
        </div>
        <div className="mt-6">
          <OtpBoxes value={code} onChange={setCode} disabled={busy || done} />
        </div>
        {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="px-3 py-2 text-sm text-muted" onClick={onClose}>
            取消
          </button>
          <button
            type="submit"
            disabled={busy || done || code.length !== 6}
            className="rounded-box bg-accent px-4 py-2 text-sm text-white disabled:opacity-40 dark:text-stone-900"
          >
            开锁
          </button>
        </div>
      </form>
    </div>
  );
}
