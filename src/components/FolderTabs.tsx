import { CATEGORIES } from "../templates";
import { CategoryIcon, categoryTone, type CategoryId } from "./CategoryIcon";

export function FolderTabs({
  active,
  counts,
  onSelect,
}: {
  active: CategoryId;
  counts: Record<string, number>;
  onSelect: (id: CategoryId) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-0" role="tablist" aria-label="分类">
      {CATEGORIES.map((item) => {
        const selected = active === item.id;
        const tone = categoryTone(item.id);
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(item.id)}
            className={`folder-tab ${selected ? "is-active min-w-[140px]" : "min-w-12"}`}
            style={{ ["--tab-tint" as string]: tone.soft }}
          >
            <CategoryIcon category={item.id} size={28} />
            {selected ? <span className="text-sm">{item.label}</span> : null}
            <span className="font-mono text-xs text-tertiary">{counts[item.id] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
