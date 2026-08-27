import { Plus } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { CategoryIcon, type CategoryId } from "./CategoryIcon";

export function EmptyState({ category }: { category: CategoryId }) {
  return (
    <div className="rise flex min-h-[320px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative">
        <CategoryIcon category={category} size={64} />
      </div>
      <p className="mt-6 max-w-[36ch] text-muted">还没有记录。从一份服务器、证书或登录口令开始。</p>
      <Link
        to="/new"
        className="mt-6 inline-flex items-center gap-2 rounded-box bg-accent px-4 py-2 text-sm text-white dark:text-stone-900"
      >
        <Plus size={16} />
        新建
      </Link>
    </div>
  );
}
