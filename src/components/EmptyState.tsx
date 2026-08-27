import { Plus } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { CategoryIcon, type CategoryId } from "./CategoryIcon";

export function EmptyState({ category }: { category: CategoryId }) {
  return (
    <div className="rise flex min-h-[320px] flex-col items-center justify-center px-6 py-16 text-center">
      <CategoryIcon category={category} size={64} />
      <p className="mt-6 max-w-[36ch] text-muted">这个抽屉还是空的。放进一条服务器、证书或登录口令吧。</p>
      <Link
        to="/new"
        className="btn-primary mt-6 inline-flex items-center gap-2 rounded-box px-4 py-2 text-sm"
      >
        <Plus size={16} />
        新建
      </Link>
    </div>
  );
}
