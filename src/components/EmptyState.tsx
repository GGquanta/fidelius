import { Plus } from "reicon-react";
import { Link } from "react-router-dom";
import { EMPTY_COPY, newRecordPath } from "../templates";
import { CategoryIcon, type CategoryId } from "./CategoryIcon";

export function EmptyState({ category, query }: { category: CategoryId; query?: string }) {
  const copy = query?.trim()
    ? `没有与「${query.trim()}」匹配的记录。`
    : (EMPTY_COPY[category] ?? EMPTY_COPY.all);
  return (
    <div className="rise flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center md:py-16">
      <CategoryIcon category={category} size={64} />
      <p className="mt-6 max-w-[36ch] text-muted">{copy}</p>
      <Link
        to={newRecordPath(category)}
        viewTransition
        className="btn-primary fx-hover fx-press mt-6 inline-flex items-center gap-2 rounded-box px-4 py-2 text-sm"
      >
        <Plus size={16} />
        新建条目
      </Link>
    </div>
  );
}
