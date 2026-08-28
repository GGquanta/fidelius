import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import { Button } from "../components/Button";
import { OtpBoxes } from "../components/OtpBoxes";
import { RecoveryCodesCard } from "../components/RecoveryCodesCard";
import { SealMark } from "../components/SealMark";
import { errorMessage, useSession } from "../session";
import { totpQr } from "../totp-qr";

export function EnrollPage() {
  const { refresh, user } = useSession();
  const [otpauth, setOtpauth] = useState("");
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .enrollStart()
      .then(async (result) => {
        if (cancelled) return;
        setOtpauth(result.otpauth);
        setSecret(result.secret);
        setQr(await totpQr(result.otpauth, 220));
      })
      .catch((error) => {
        if (!cancelled) setErr(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirm(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const result = await api.enrollConfirm(code);
      setCodes(result.recoveryCodes);
    } catch (error) {
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (codes.length > 0) {
    return (
      <main className="mesh-glow relative min-h-[100dvh] overflow-hidden">
        <div className="rise mx-auto grid min-h-[100dvh] max-w-4xl items-center gap-10 px-6 py-16 md:grid-cols-2">
          <div>
            <SealMark size={40} />
            <h1 className="font-display mt-6 text-4xl tracking-tight">保存恢复码</h1>
            <p className="mt-3 max-w-[42ch] text-muted">
              请下载或复制这 10 条恢复码，放到离线安全的地方。之后无法再查看明文。
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-6 shadow-elev-3">
            <RecoveryCodesCard
              email={user?.email ?? ""}
              codes={codes}
              savedLabel="已保存"
              onSaved={() => void refresh()}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mesh-glow relative min-h-[100dvh] overflow-hidden">
      <div className="rise mx-auto grid min-h-[100dvh] max-w-4xl items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div>
          <SealMark size={40} />
          <h1 className="font-display mt-6 text-4xl tracking-tight">绑定验证器</h1>
          <p className="mt-3 max-w-[42ch] text-muted">
            用验证器扫描二维码，或手动输入密钥，然后填写当前 6 位验证码。
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-elev-3">
          {qr ? (
            <img src={qr} alt="验证器二维码" className="h-44 w-44 rounded-tile bg-canvas p-2" />
          ) : (
            <div className="h-44 w-44 rounded-tile bg-hover" />
          )}
          <p className="mt-4 break-all font-mono text-xs text-tertiary">{secret || otpauth}</p>
          <form onSubmit={(event) => void confirm(event)} className="mt-6">
            <p className="mb-3 text-xs text-muted">验证码</p>
            <OtpBoxes value={code} onChange={setCode} disabled={busy} />
            {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
            <Button type="submit" disabled={busy || code.length !== 6} className="mt-6">
              继续
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

export function GatePage({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <main className="mesh-glow mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-6">
      <SealMark size={40} />
      <h1 className="font-display mt-6 text-4xl tracking-tight">{title}</h1>
      <p className="mt-3 text-muted">{body}</p>
    </main>
  );
}
