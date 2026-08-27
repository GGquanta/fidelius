import { ShareNetwork } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import type { RecordMeta } from "../api";
import { CATEGORY_LABEL, formatTime } from "../templates";
import { CategoryIcon, categoryTone } from "./CategoryIcon";

export function RecordRow({ record }: { record: RecordMeta }) {
  const tone = categoryTone(record.category);
  return (
    <Link
      to={`/records/${record.id}`}
      className="flex h-14 items-center gap-3 rounded-box px-2 hover:bg-hover"
    >
      <CategoryIcon category={record.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate">{record.title}</p>
        <p className="truncate text-xs text-muted">
          {record.description || (record.access === "shared" ? "只读分享" : "我的记录")}
        </p>
      </div>
      <span
        className="hidden shrink-0 rounded-box px-1.5 py-0.5 text-[11px] sm:inline"
        style={{ background: tone.soft, color: tone.color }}
      >
        {CATEGORY_LABEL[record.category]}
      </span>
      {record.sharedWith.length > 0 && record.access === "owner" ? (
        <ShareNetwork size={14} className="text-muted" />
      ) : null}
      <time className="hidden font-mono text-xs text-muted sm:block">{formatTime(record.updatedAt)}</time>
    </Link>
  );
}
