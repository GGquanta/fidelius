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
    <div
      className={`grid grid-cols-1 gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:gap-4 ${
        long ? "sm:items-start" : "sm:items-center"
      }`}
    >
      <h2 className="text-sm text-muted">{field.label}</h2>
      {sealed ? (
        <span className="block h-4 max-w-[16rem] rounded-sm bg-hover" aria-hidden />
      ) : (
        <pre className={`overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm leading-relaxed ${long ? "min-h-16" : ""}`}>
          {field.value || "无内容"}
        </pre>
      )}
      {sealed ? (
        <span className="hidden sm:block" />
      ) : (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => void copy()}
            className="rounded-box p-1.5 text-muted hover:bg-hover hover:text-ink"
            aria-label="复制"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          {long && onDownload ? (
            <button
              type="button"
              onClick={() => onDownload(field.label, field.value)}
              className="rounded-box p-1.5 text-muted hover:bg-hover hover:text-ink"
              aria-label="下载"
            >
              <DownloadSimple size={16} />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
