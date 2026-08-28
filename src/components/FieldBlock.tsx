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
    <div className="space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-sm text-muted">{field.label}</h2>
        {sealed ? null : (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => void copy()}
              className="fx-hover rounded-box p-1.5 text-muted hover:bg-hover hover:text-ink"
              aria-label="复制"
            >
              {copied ? (
                <span className="fx-copy">
                  <Check size={16} />
                </span>
              ) : (
                <Copy size={16} />
              )}
            </button>
            {long && onDownload ? (
              <button
                type="button"
                onClick={() => onDownload(field.label, field.value)}
                className="fx-hover rounded-box p-1.5 text-muted hover:bg-hover hover:text-ink"
                aria-label="下载"
              >
                <DownloadSimple size={16} />
              </button>
            ) : null}
          </div>
        )}
      </div>
      {sealed ? (
        <div
          className={`rounded-box bg-sunken px-3 py-2.5 ${long ? "min-h-16" : ""}`}
          aria-hidden
        >
          <span className="fx-shimmer block h-4 max-w-[16rem] rounded-sm bg-hover" />
          {long ? <span className="fx-shimmer mt-2 block h-4 max-w-[12rem] rounded-sm bg-hover" /> : null}
        </div>
      ) : (
        <pre
          className={`fx-unmask rounded-box bg-sunken px-3 py-2.5 font-mono text-sm leading-relaxed whitespace-pre-wrap break-all ${
            long ? "min-h-16" : ""
          } ${field.value ? "" : "text-tertiary"}`}
        >
          {field.value || "无内容"}
        </pre>
      )}
    </div>
  );
}
