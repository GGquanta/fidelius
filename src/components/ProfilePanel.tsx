import { DeviceMobile } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api } from "../api";
import { errorMessage, useSession } from "../session";
import { useToast } from "../ui";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { OtpBoxes } from "./OtpBoxes";

type Step = "profile" | "verify" | "setup";

async function totpQr(otpauth: string): Promise<string> {
  const styles = getComputedStyle(document.documentElement);
  const dark = styles.getPropertyValue("--accent").trim() || "#8F49DF";
  const light = styles.getPropertyValue("--canvas").trim() || "#FFFEFC";
  return QRCode.toDataURL(otpauth, {
    margin: 1,
    width: 176,
    color: { dark, light },
  });
}

export function ProfilePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refresh } = useSession();
  const toast = useToast();
  const [name, setName] = useState(user?.displayName ?? "");
  const [step, setStep] = useState<Step>("profile");
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submitted = useRef(false);

  useEffect(() => {
    if (open) {
      setName(user?.displayName ?? "");
      setStep("profile");
      setCode("");
      setSecret("");
      setQr("");
      setErr("");
      setBusy(false);
      submitted.current = false;
    }
  }, [open, user?.displayName]);

  async function saveName(event: FormEvent) {
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

  async function startReset() {
    if (submitted.current || code.length !== 6 || busy) return;
    submitted.current = true;
    setBusy(true);
    setErr("");
    try {
      const result = await api.resetEnrollStart(code);
      setSecret(result.secret);
      setQr(await totpQr(result.otpauth));
      setCode("");
      setStep("setup");
      submitted.current = false;
    } catch (error) {
      submitted.current = false;
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset(event?: FormEvent) {
    event?.preventDefault();
    if (submitted.current || code.length !== 6 || busy) return;
    submitted.current = true;
    setBusy(true);
    setErr("");
    try {
      await api.resetEnrollConfirm(code);
      await refresh();
      toast("验证器已更新");
      onClose();
    } catch (error) {
      submitted.current = false;
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open || busy || code.length !== 6) return;
    if (step === "verify") void startReset();
    if (step === "setup") void confirmReset();
  }, [code, open, step]);

  if (!user) return null;

  const title =
    step === "verify" ? "验证当前验证器" : step === "setup" ? "绑定新验证器" : "个人资料";

  return (
    <Modal open={open} onClose={onClose} labelledBy="profile-title">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-sm text-accent-ink">
          {step === "profile" ? user.displayName.slice(0, 1) : <DeviceMobile size={20} />}
        </span>
        <div>
          <h2 id="profile-title" className="text-base font-medium">
            {title}
          </h2>
          <p className="text-sm text-muted">
            {step === "verify"
              ? "请输入当前验证器中的 6 位验证码"
              : step === "setup"
                ? "扫描二维码，或手动输入密钥"
                : "显示名会出现在分享和操作记录中"}
          </p>
        </div>
      </div>

      {step === "profile" ? (
        <form onSubmit={(event) => void saveName(event)}>
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
          <p className="mt-1 text-[12px] text-tertiary">由 Access 绑定，无法在此修改</p>

          <p className="mt-5 text-[12px] text-muted">角色</p>
          <p className="mt-1 text-sm">{user.role === "admin" ? "管理员" : "成员"}</p>

          <div className="mt-6 border-t border-line pt-5">
            <p className="text-[12px] text-muted">验证器</p>
            <p className="mt-1 text-sm text-tertiary">更换设备前请先验证当前验证码。新密钥生效后，旧密钥立即失效。</p>
            <Button
              type="button"
              tone="secondary"
              className="mt-3"
              onClick={() => {
                setErr("");
                setCode("");
                submitted.current = false;
                setStep("verify");
              }}
            >
              更换验证器
            </Button>
          </div>

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
      ) : null}

      {step === "verify" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void startReset();
          }}
        >
          <div className="mt-6">
            <OtpBoxes value={code} onChange={setCode} disabled={busy} />
          </div>
          {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              tone="tertiary"
              onClick={() => {
                setStep("profile");
                setCode("");
                setErr("");
                submitted.current = false;
              }}
            >
              返回
            </Button>
            <Button type="submit" disabled={busy || code.length !== 6}>
              继续
            </Button>
          </div>
        </form>
      ) : null}

      {step === "setup" ? (
        <form onSubmit={(event) => void confirmReset(event)}>
          {qr ? (
            <img src={qr} alt="验证器二维码" className="mt-6 h-44 w-44 rounded-tile bg-canvas p-2" />
          ) : (
            <div className="mt-6 h-44 w-44 rounded-tile bg-hover" />
          )}
          <p className="mt-4 break-all font-mono text-xs text-tertiary">{secret}</p>
          <p className="mt-5 mb-3 text-[12px] text-muted">验证码</p>
          <OtpBoxes value={code} onChange={setCode} disabled={busy} />
          {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              tone="tertiary"
              onClick={() => {
                setStep("profile");
                setCode("");
                setSecret("");
                setQr("");
                setErr("");
                submitted.current = false;
              }}
            >
              返回
            </Button>
            <Button type="submit" disabled={busy || code.length !== 6}>
              完成绑定
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
