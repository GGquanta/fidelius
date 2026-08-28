import { Plus } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { CategoryIcon, type CategoryId } from "./CategoryIcon";

export function EmptyState({ category }: { category: CategoryId }) {
  return (
    <div className="rise flex min-h-[320px] flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <CategoryIcon category={category} size={64} />
      <p className="mt-6 max-w-[36ch] text-muted">此分类暂无记录。可新建服务器、证书或登录账号。</p>
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
