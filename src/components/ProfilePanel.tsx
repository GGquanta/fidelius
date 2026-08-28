import { DeviceMobile } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { errorMessage, useSession } from "../session";
import { totpQr } from "../totp-qr";
import { useToast } from "../ui";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { OtpBoxes } from "./OtpBoxes";
import { RecoveryCodesCard } from "./RecoveryCodesCard";

type Step = "profile" | "verify" | "setup" | "issue" | "codes";

export function ProfilePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, recoveryRemaining, refresh } = useSession();
  const toast = useToast();
  const [name, setName] = useState(user?.displayName ?? "");
  const [step, setStep] = useState<Step>("profile");
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [codesFromReset, setCodesFromReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submitted = useRef(false);

  useEffect(() => {
    if (open) {
      setName(user?.displayName ?? "");
      setStep("profile");
      setMode("totp");
      setCode("");
      setRecoveryCode("");
      setSecret("");
      setQr("");
      setCodes([]);
      setCodesFromReset(false);
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
    if (submitted.current || busy) return;
    if (mode === "totp" && code.length !== 6) return;
    if (mode === "recovery" && !recoveryCode.trim()) return;
    submitted.current = true;
    setBusy(true);
    setErr("");
    try {
      const result = await api.resetEnrollStart(
        mode === "totp" ? { code } : { recoveryCode: recoveryCode.trim() },
      );
      setSecret(result.secret);
      setQr(await totpQr(result.otpauth, 176));
      setCode("");
      setRecoveryCode("");
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
      const result = await api.resetEnrollConfirm(code);
      setCodes(result.recoveryCodes);
      setCodesFromReset(true);
      setStep("codes");
      submitted.current = false;
    } catch (error) {
      submitted.current = false;
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function issueCodes(event?: FormEvent) {
    event?.preventDefault();
    if (submitted.current || code.length !== 6 || busy) return;
    submitted.current = true;
    setBusy(true);
    setErr("");
    try {
      const result = await api.regenerateRecovery(code);
      setCodes(result.recoveryCodes);
      setCodesFromReset(false);
      setStep("codes");
      submitted.current = false;
    } catch (error) {
      submitted.current = false;
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open || busy) return;
    if (step === "verify" && mode === "totp" && code.length === 6) void startReset();
    if (step === "setup" && code.length === 6) void confirmReset();
    if (step === "issue" && code.length === 6) void issueCodes();
  }, [code, open, step, mode]);

  if (!user) return null;

  const title =
    step === "verify"
      ? "验证当前验证器"
      : step === "setup"
        ? "绑定新验证器"
        : step === "issue"
          ? recoveryRemaining > 0
            ? "重新生成恢复码"
            : "生成恢复码"
          : step === "codes"
            ? "保存恢复码"
            : "个人资料";

  return (
    <Modal open={open} onClose={onClose} labelledBy="profile-title">
      {step === "codes" ? (
        <RecoveryCodesCard
          headingId="profile-title"
          email={user.email}
          codes={codes}
          onSaved={() => {
            void refresh().then(() => {
              toast(codesFromReset ? "验证器已更新" : "已保存");
              onClose();
            });
          }}
        />
      ) : (
        <>
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
                  ? mode === "totp"
                    ? "请输入当前验证器中的 6 位验证码"
                    : "请输入一条未使用的恢复码"
                  : step === "setup"
                    ? "扫描二维码，或手动输入密钥"
                    : step === "issue"
                      ? "生成后旧恢复码立即作废。请输入当前验证码。"
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
                <p className="text-[12px] text-muted">恢复码</p>
                <p className="mt-1 text-sm text-tertiary">
                  {recoveryRemaining > 0 ? `剩余 ${recoveryRemaining} 条` : "尚未生成恢复码"}
                </p>
                <Button
                  type="button"
                  tone="secondary"
                  className="mt-3"
                  onClick={() => {
                    setErr("");
                    setCode("");
                    submitted.current = false;
                    setStep("issue");
                  }}
                >
                  {recoveryRemaining > 0 ? "重新生成恢复码" : "生成恢复码"}
                </Button>
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <p className="text-[12px] text-muted">验证器</p>
                <p className="mt-1 text-sm text-tertiary">
                  更换设备前请先验证当前验证码或一条恢复码。新密钥生效后，旧密钥与旧恢复码立即失效。
                </p>
                <Button
                  type="button"
                  tone="secondary"
                  className="mt-3"
                  onClick={() => {
                    setErr("");
                    setCode("");
                    setRecoveryCode("");
                    setMode("totp");
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
                <Button type="submit" busy={busy} disabled={!name.trim() || name.trim() === user.displayName}>
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
                {mode === "totp" ? (
                  <OtpBoxes value={code} onChange={setCode} disabled={busy} invalid={Boolean(err)} />
                ) : (
                  <input
                    value={recoveryCode}
                    onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={busy}
                    className="w-full rounded-box border border-line-strong bg-canvas px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                  />
                )}
              </div>
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
              {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  tone="tertiary"
                  onClick={() => {
                    setStep("profile");
                    setCode("");
                    setRecoveryCode("");
                    setErr("");
                    submitted.current = false;
                  }}
                >
                  返回
                </Button>
                <Button
                  type="submit"
                  busy={busy}
                  disabled={mode === "totp" ? code.length !== 6 : !recoveryCode.trim()}
                >
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
                <div className="fx-shimmer mt-6 h-44 w-44 rounded-tile" />
              )}
              <p className="mt-4 break-all font-mono text-xs text-tertiary">{secret}</p>
              <p className="mt-5 mb-3 text-[12px] text-muted">验证码</p>
              <OtpBoxes value={code} onChange={setCode} disabled={busy} invalid={Boolean(err)} />
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
                <Button type="submit" busy={busy} disabled={code.length !== 6}>
                  完成绑定
                </Button>
              </div>
            </form>
          ) : null}

          {step === "issue" ? (
            <form onSubmit={(event) => void issueCodes(event)}>
              <div className="mt-6">
                <OtpBoxes value={code} onChange={setCode} disabled={busy} invalid={Boolean(err)} />
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
                <Button type="submit" busy={busy} disabled={code.length !== 6}>
                  {recoveryRemaining > 0 ? "重新生成恢复码" : "生成恢复码"}
                </Button>
              </div>
            </form>
          ) : null}
        </>
      )}
    </Modal>
  );
}
