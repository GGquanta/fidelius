import { Check, Copy, DownloadSimple } from "@phosphor-icons/react";
import { useState } from "react";
import type { RecordField } from "../api";

export function FieldBlock({
  field,
  sealed,
  onCopy,
  onDownload,
}: {
  field: RecordField;
  sealed: boolean;
  onCopy: (value: string) => void;
  onDownload?: (label: string, value: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const long = field.type === "multiline";

  async function copy() {
    onCopy(field.value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="group rounded-box border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm text-muted">{field.label}</h2>
        {sealed ? null : (
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => void copy()}
              className="rounded-box p-1.5 text-muted hover:bg-hover hover:text-accent"
              aria-label="复制"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            {long && onDownload ? (
              <button
                type="button"
                onClick={() => onDownload(field.label, field.value)}
                className="rounded-box p-1.5 text-muted hover:bg-hover hover:text-accent"
                aria-label="下载"
              >
                <DownloadSimple size={16} />
              </button>
            ) : null}
          </div>
        )}
      </div>
      <pre
        className={`mt-3 overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm transition duration-200 ${
          sealed ? "select-none text-muted blur-[3px]" : "text-ink blur-0"
        }`}
      >
        {sealed ? "••••••••••••••••" : field.value || "（空）"}
      </pre>
    </div>
  );
}
