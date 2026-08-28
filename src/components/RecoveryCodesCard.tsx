import { Check, Copy, DownloadSimple, Lifebuoy } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "./Button";

function downloadCodes(email: string, codes: string[]) {
  const body = [
    "Fidelius 恢复码",
    `账号：${email}`,
    "",
    "每条恢复码只能使用一次。请离线保存，不要发到聊天软件。",
    "",
    ...codes,
    "",
  ].join("\n");
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = "fidelius-recovery-codes.txt";
  anchor.click();
  URL.revokeObjectURL(href);
}

export function RecoveryCodesCard({
  email,
  codes,
  onSaved,
  savedLabel = "已保存",
  headingId,
}: {
  email: string;
  codes: string[];
  onSaved: () => void;
  savedLabel?: string;
  headingId?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-tile bg-accent-soft text-accent">
          <Lifebuoy size={20} />
        </span>
        <div>
          <p id={headingId} className="text-base font-medium">
            保存恢复码
          </p>
          <p className="text-sm text-muted">无法使用验证器时，用其中一条开锁。每条只能用一次。</p>
        </div>
      </div>
      <ol className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2 font-mono text-sm sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button type="button" tone="secondary" onClick={() => downloadCodes(email, codes)}>
          <DownloadSimple size={16} />
          下载
        </Button>
        <Button type="button" tone="secondary" onClick={() => void copy()}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "已复制" : "复制"}
        </Button>
        <Button type="button" onClick={onSaved}>
          {savedLabel}
        </Button>
      </div>
    </div>
  );
}
