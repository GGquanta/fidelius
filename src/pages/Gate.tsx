import { FormEvent, useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "../api";
import { Button } from "../components/Button";
import { OtpBoxes } from "../components/OtpBoxes";
import { SealMark } from "../components/SealMark";
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
        setQr(
          await QRCode.toDataURL(result.otpauth, {
            margin: 1,
            width: 220,
            color: { dark: "#8F49DF", light: "#FBFAF8" },
          }),
        );
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
    <main className="mesh-glow relative min-h-[100dvh] overflow-hidden">
      <div className="rise mx-auto grid min-h-[100dvh] max-w-4xl items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div>
          <SealMark size={40} />
          <h1 className="font-display mt-6 text-4xl tracking-tight">把验证器写入这把钥匙</h1>
          <p className="mt-3 max-w-[42ch] text-muted">
            用认证器扫描二维码，或手动输入密钥，再填写当前 6 位数字以确认设备已就绪。
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-elev-3">
          {qr ? (
            <img src={qr} alt="TOTP 二维码" className="h-44 w-44 rounded-tile bg-canvas p-2" />
          ) : (
            <div className="h-44 w-44 rounded-tile bg-hover" />
          )}
          <p className="mt-4 break-all font-mono text-xs text-tertiary">{secret || otpauth}</p>
          <form onSubmit={(event) => void confirm(event)} className="mt-6">
            <p className="mb-3 text-xs text-muted">确认码</p>
            <OtpBoxes value={code} onChange={setCode} disabled={busy} />
            {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
            <Button type="submit" disabled={busy || code.length !== 6} className="mt-6">
              完成编排
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
