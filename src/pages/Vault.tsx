import { Plus } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type RecordMeta } from "../api";
import { EmptyState } from "../components/EmptyState";
import { RecordRow } from "../components/RecordRow";
import { errorMessage } from "../session";
import { CATEGORY_LABEL } from "../templates";
import type { CategoryId } from "../components/CategoryIcon";

export function VaultPage() {
  const [params] = useSearchParams();
  const category = (params.get("category") as CategoryId | null) ?? "all";
  const q = params.get("q") ?? "";
  const [records, setRecords] = useState<RecordMeta[] | null>(null);
  const [err, setErr] = useState("");

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

  const title = useMemo(() => {
    if (q) return `搜索「${q}」`;
    if (category === "all") return "保险库";
    return CATEGORY_LABEL[category];
  }, [category, q]);

  return (
    <section className="px-5 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl tracking-[-0.04em]">{title}</h1>
        <Link
          to="/new"
          className="inline-flex items-center gap-1.5 rounded-box bg-accent px-3 py-2 text-sm text-white dark:text-stone-900"
        >
          <Plus size={16} />
          新建
        </Link>
      </div>
      {err ? <p className="mt-6 text-sm text-danger">{err}</p> : null}
      {records === null && !err ? (
        <div className="mt-6 space-y-2">
          <div className="h-14 rounded-box bg-hover" />
          <div className="h-14 rounded-box bg-hover" />
          <div className="h-14 rounded-box bg-hover" />
        </div>
      ) : null}
      {records && records.length === 0 ? <EmptyState category={category} /> : null}
      <ul className="mt-4">
        {records?.map((record) => (
          <li key={record.id}>
            <RecordRow record={record} />
          </li>
        ))}
      </ul>
    </section>
  );
}
