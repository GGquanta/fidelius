import { Plus } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type RecordMeta } from "../api";
import type { CategoryId } from "../components/CategoryIcon";
import { EmptyState } from "../components/EmptyState";
import { FolderTabs } from "../components/FolderTabs";
import { RecordCard } from "../components/RecordCard";
import { errorMessage } from "../session";
import { CATEGORIES, CATEGORY_LABEL } from "../templates";

export function VaultPage() {
  const [params, setParams] = useSearchParams();
  const category = (params.get("category") as CategoryId | null) ?? "all";
  const q = params.get("q") ?? "";
  const [records, setRecords] = useState<RecordMeta[] | null>(null);
  const [all, setAll] = useState<RecordMeta[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    void api
      .records()
      .then((result) => setAll(result.records))
      .catch((error) => setErr(errorMessage(error)));
  }, []);

  useEffect(() => {
    setRecords(null);
    void api
      .records({
        category: category === "all" ? undefined : category,
        q: q || undefined,
      })
      .then((result) => setRecords(result.records))
      .catch((error) => setErr(errorMessage(error)));
  }, [category, q]);

  const counts = useMemo(() => {
    const next: Record<string, number> = { all: all.length };
    for (const record of all) {
      next[record.category] = (next[record.category] ?? 0) + 1;
    }
    return next;
  }, [all]);

  const title = useMemo(() => {
    if (q) return `搜索「${q}」`;
    if (category === "all") return "保险库";
    return CATEGORY_LABEL[category] ?? CATEGORIES.find((c) => c.id === category)?.label ?? "保险库";
  }, [category, q]);

  function selectCategory(id: CategoryId) {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("category");
    else next.set("category", id);
    setParams(next);
  }

  return (
    <section className="flex min-h-full flex-1 flex-col px-6 py-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] tracking-[0.08em] text-tertiary">记录</p>
          <h1 className="font-display mt-1 text-3xl tracking-tight">{title}</h1>
        </div>
        <Link to="/new" className="btn-primary inline-flex items-center gap-1.5 rounded-box px-4 py-2 text-sm">
          <Plus size={16} />
          新建
        </Link>
      </div>
      {err ? <p className="mt-6 text-sm text-danger">{err}</p> : null}
      <div className="folder-cabinet mt-6">
        <FolderTabs active={category} counts={counts} onSelect={selectCategory} />
        <div className="folder-sheet px-6 py-6">
          {records === null && !err ? (
            <ul className="record-grid">
              <li className="h-28 rounded-lg bg-hover" />
              <li className="h-28 rounded-lg bg-hover" />
              <li className="h-28 rounded-lg bg-hover" />
              <li className="h-28 rounded-lg bg-hover" />
            </ul>
          ) : null}
          {records && records.length === 0 ? <EmptyState category={category} /> : null}
          <ul className="record-grid">
            {records?.map((record) => (
              <li key={record.id}>
                <RecordCard record={record} flush />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
