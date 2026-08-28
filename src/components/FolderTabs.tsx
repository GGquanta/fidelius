import { CATEGORIES } from "../templates";
import { CategoryIcon, type CategoryId } from "./CategoryIcon";
import { Skeleton } from "./Skeleton";

export function FolderTabs({
  active,
  counts,
  countsReady = true,
  onSelect,
}: {
  active: CategoryId;
  counts: Record<string, number>;
  countsReady?: boolean;
  onSelect: (id: CategoryId) => void;
}) {
  return (
    <div className="folder-tabs" role="tablist" aria-label="分类">
      {CATEGORIES.map((item) => {
        const selected = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(item.id)}
            onMouseDown={(event) => event.preventDefault()}
            className={`folder-tab ${selected ? "is-active" : ""}`}
          >
            <CategoryIcon category={item.id} size={20} />
            <span className="min-w-0 flex-1 truncate text-left text-[12px] leading-none">{item.short}</span>
            {countsReady ? (
              <span className="font-metric text-[12px] leading-none text-tertiary">{counts[item.id] ?? 0}</span>
            ) : (
              <Skeleton className="inline-block h-3 w-5 shrink-0 rounded-sm" />
            )}
          </button>
        );
      })}
    </div>
  );
}
