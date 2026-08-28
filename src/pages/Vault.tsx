import { Plus } from "reicon-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type RecordMeta } from "../api";
import type { CategoryId } from "../components/CategoryIcon";
import { EmptyState } from "../components/EmptyState";
import { FolderTabs } from "../components/FolderTabs";
import { RecordCard } from "../components/RecordCard";
import { LoadingRegion, Skeleton } from "../components/Skeleton";
import { errorMessage } from "../session";
import { CATEGORIES, CATEGORY_LABEL, newRecordPath } from "../templates";

export function VaultPage() {
  const [params, setParams] = useSearchParams();
  const category = (params.get("category") as CategoryId | null) ?? "all";
  const q = params.get("q") ?? "";
  const [all, setAll] = useState<RecordMeta[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    void api
      .records()
      .then((result) => setAll(result.records))
      .catch((error) => setErr(errorMessage(error)));
  }, []);

  const records = useMemo(() => {
    if (!all) return null;
    const needle = q.trim().toLowerCase();
    return all.filter((record) => {
      if (category !== "all" && record.category !== category) return false;
      if (needle) {
        const hay = `${record.title} ${record.description}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [all, category, q]);

  const counts = useMemo(() => {
    const list = all ?? [];
    const next: Record<string, number> = { all: list.length };
    for (const record of list) {
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
        <Link to={newRecordPath(category)} viewTransition className="btn-primary fx-hover fx-press inline-flex items-center gap-1.5 rounded-box px-4 py-2 text-sm">
          <Plus size={16} />
          新建
        </Link>
      </div>
      {err ? <p className="mt-6 text-sm text-danger">{err}</p> : null}
      <div className="folder-cabinet mt-6">
        <FolderTabs active={category} counts={counts} countsReady={all !== null} onSelect={selectCategory} />
        <div className="folder-sheet px-6 py-6">
          {records === null && !err ? (
            <LoadingRegion>
              <ul className="record-grid">
                <li>
                  <Skeleton className="block h-28 w-full rounded-lg" />
                </li>
                <li>
                  <Skeleton className="block h-28 w-full rounded-lg" />
                </li>
                <li>
                  <Skeleton className="block h-28 w-full rounded-lg" />
                </li>
                <li>
                  <Skeleton className="block h-28 w-full rounded-lg" />
                </li>
              </ul>
            </LoadingRegion>
          ) : null}
          {records && records.length === 0 ? <EmptyState category={category} query={q} /> : null}
          {records && records.length > 0 ? (
            <ul className="record-grid rise" key={`${category}-${q}`}>
              {records.map((record) => (
                <li key={record.id}>
                  <RecordCard record={record} flush />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
