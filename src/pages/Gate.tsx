import { FormEvent, useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "../api";
import { errorMessage, useSession } from "../session";

export function EnrollPage() {
  const { refresh } = useSession();
  const [otpauth, setOtpauth] = useState("");
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api
      .enrollStart()
      .then(async (result) => {
        setOtpauth(result.otpauth);
        setSecret(result.secret);
        setQr(await QRCode.toDataURL(result.otpauth, { margin: 1, width: 220, color: { dark: "#1C1B19", light: "#F3F2EF" } }));
      })
      .catch((error) => setErr(errorMessage(error)));
  }, []);

  async function confirm(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api.enrollConfirm(code);
      await refresh();
    } catch (error) {
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm text-muted">Fidelius</p>
      <h1 className="mt-3 text-3xl tracking-[-0.05em]">把验证器写入这把钥匙</h1>
      <p className="mt-3 max-w-[42ch] text-muted">
        用认证器扫描二维码，或手动输入密钥，再填写当前 6 位数字以确认设备已就绪。
      </p>
      {qr ? (
        <img src={qr} alt="TOTP 二维码" className="mt-8 h-44 w-44 border border-line bg-canvas p-2" />
      ) : (
        <div className="mt-8 h-44 w-44 border border-line bg-surface" />
      )}
      <p className="mt-4 break-all font-mono text-xs text-muted">{secret || otpauth}</p>
      <form onSubmit={(event) => void confirm(event)} className="mt-8">
        <label className="text-xs text-muted">确认码</label>
        <input
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="mt-2 block w-40 border-b border-line bg-transparent py-2 font-mono text-xl tracking-[0.4em] outline-none"
        />
        {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="mt-6 bg-ink px-5 py-2 text-sm text-canvas disabled:opacity-40"
        >
          完成编排
        </button>
      </form>
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
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-6">
      <p className="text-sm text-muted">Fidelius</p>
      <h1 className="mt-3 text-3xl tracking-[-0.05em]">{title}</h1>
      <p className="mt-3 text-muted">{body}</p>
    </main>
  );
}
