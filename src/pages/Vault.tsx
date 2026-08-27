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
    <section className="px-5 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl tracking-tight">{title}</h1>
        <Link to="/new" className="btn-primary inline-flex items-center gap-1.5 rounded-box px-4 py-2 text-sm">
          <Plus size={16} />
          新建
        </Link>
      </div>
      {err ? <p className="mt-6 text-sm text-danger">{err}</p> : null}
      <div className="mt-6">
        <FolderTabs active={category} counts={counts} onSelect={selectCategory} />
        <div className="folder-stack">
          <div className="folder-sheet px-5 py-6">
            {records === null && !err ? (
              <div className="space-y-3">
                <div className="h-24 rounded-lg bg-hover" />
                <div className="h-24 rounded-lg bg-hover" />
              </div>
            ) : null}
            {records && records.length === 0 ? <EmptyState category={category} /> : null}
            <ul className="grid gap-3 sm:grid-cols-2">
              {records?.map((record) => (
                <li key={record.id}>
                  <RecordCard record={record} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
