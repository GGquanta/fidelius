import { ShareNetwork } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import type { RecordMeta } from "../api";
import { CATEGORY_LABEL, formatTime } from "../templates";
import { CategoryIcon, categoryTone } from "./CategoryIcon";

export function RecordCard({ record, flush }: { record: RecordMeta; flush?: boolean }) {
  const tone = categoryTone(record.category);
  return (
    <Link
      to={`/records/${record.id}`}
      viewTransition
      className={`fx-hover relative block overflow-hidden rounded-lg border border-line p-4 ${
        flush ? "bg-canvas shadow-none hover:bg-hover" : "bg-surface shadow-elev-1 hover:bg-hover"
      }`}
      style={{ ["--ear" as string]: tone.soft }}
    >
      <span className="card-ear" aria-hidden />
      <div className="flex items-start gap-3">
        <CategoryIcon category={record.category} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{record.title}</p>
          <p className="mt-1 truncate text-sm text-muted">
            {record.description || (record.access === "shared" ? "只读分享" : "我的记录")}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[12px]">
        <span className="rounded-box px-2 py-0.5" style={{ background: tone.soft, color: tone.ink }}>
          {CATEGORY_LABEL[record.category]}
        </span>
        {record.sharedWith.length > 0 && record.access === "owner" ? (
          <ShareNetwork size={14} className="text-tertiary" />
        ) : null}
        <time className="ml-auto font-mono text-tertiary">{formatTime(record.updatedAt)}</time>
      </div>
    </Link>
  );
}
