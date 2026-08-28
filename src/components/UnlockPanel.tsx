import { LockSimple, LockSimpleOpen } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useExitPresence } from "../fx";
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
  const { shown, exiting } = useExitPresence(open, 280);
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(0);
  const [done, setDone] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    if (!open) {
      setMode("totp");
      setCode("");
      setRecoveryCode("");
      setErr("");
      setBusy(false);
      setDone(false);
      submitted.current = false;
    }
  }, [open]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (submitted.current) return;
    if (mode === "totp" && code.length !== 6) return;
    if (mode === "recovery" && !recoveryCode.trim()) return;
    submitted.current = true;
    setBusy(true);
    setErr("");
    try {
      await doUnlock(mode === "totp" ? { code } : { recoveryCode: recoveryCode.trim() });
      setDone(true);
      onToast("已开锁");
      window.setTimeout(() => onClose(), 480);
    } catch (error) {
      submitted.current = false;
      setErr(errorMessage(error));
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (open && mode === "totp" && code.length === 6 && !busy && !done) {
      void submit();
    }
  }, [code, open, mode]);

  if (!shown) return null;

  return (
    <div
      className={`fx-overlay fixed inset-0 z-30 grid place-items-center bg-ink/25 p-4 ${exiting ? "is-exit" : ""}`}
      onClick={onClose}
    >
      <form
        onSubmit={(event) => void submit(event)}
        onClick={(event) => event.stopPropagation()}
        className={`${exiting ? "fx-exit" : "rise"} w-[min(92vw,380px)] rounded-xl border border-line bg-surface p-6 shadow-elev-5`}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-tile bg-accent-soft text-accent">
            {done ? <LockSimpleOpen size={20} /> : <LockSimple size={20} />}
          </span>
          <div>
            <h2 className="text-base font-medium">{done ? "已开锁" : "开锁"}</h2>
            <p className="text-sm text-muted">
              {done
                ? "敏感字段已显示"
                : mode === "totp"
                  ? "请输入验证器中的 6 位验证码"
                  : "请输入一条未使用的恢复码"}
            </p>
          </div>
        </div>
        <div className="mt-6">
          {mode === "totp" ? (
            <OtpBoxes
              key={shake}
              value={code}
              onChange={setCode}
              disabled={busy || done}
              invalid={Boolean(err)}
              autoFocus
            />
          ) : (
            <input
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              autoComplete="off"
              autoFocus
              spellCheck={false}
              disabled={busy || done}
              className={`w-full rounded-box border bg-canvas px-3 py-2 font-mono text-sm outline-none focus:border-accent ${
                err ? "border-danger" : "border-line-strong"
              }`}
            />
          )}
        </div>
        {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
        {!done ? (
          <button
            type="button"
            className="fx-hover mt-4 text-sm text-muted hover:text-ink"
            onClick={() => {
              setMode(mode === "totp" ? "recovery" : "totp");
              setErr("");
              submitted.current = false;
            }}
          >
            {mode === "totp" ? "无法使用验证器？" : "改用验证码"}
          </button>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" tone="tertiary" onClick={onClose}>
            取消
          </Button>
          <Button
            type="submit"
            busy={busy}
            disabled={done || (mode === "totp" ? code.length !== 6 : !recoveryCode.trim())}
          >
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
  const [locking, setLocking] = useState(false);

  if (unlocked) {
    return (
      <div key="open" className="fx-unmask mb-5 flex items-center justify-between gap-3 border-b border-line pb-4">
        <p className="flex items-center gap-2 text-sm text-muted">
          <LockSimpleOpen size={16} className="shrink-0 text-accent" />
          已开锁，离开本页会自动封存
        </p>
        <Button
          type="button"
          tone="peach"
          busy={locking}
          onClick={() => {
            if (locking) return;
            setLocking(true);
            void doLock()
              .then(() => onToast("已封存"))
              .finally(() => setLocking(false));
          }}
        >
          <LockSimple size={16} />
          封存
        </Button>
      </div>
    );
  }

  return (
    <>
      <div key="sealed" className="mb-5 flex items-center gap-3 rounded-box bg-peach-soft px-4 py-3">
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
