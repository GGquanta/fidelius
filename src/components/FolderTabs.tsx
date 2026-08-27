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
    <div className="folder-tabs" role="tablist" aria-label="分类">
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
            className={`folder-tab ${selected ? "is-active" : ""}`}
            style={{ ["--tab-tint" as string]: tone.soft }}
          >
            <CategoryIcon category={item.id} size={32} />
            <span className="max-w-full truncate text-[12px] leading-none">{item.short}</span>
            <span className="font-mono text-[12px] leading-none text-tertiary">{counts[item.id] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
