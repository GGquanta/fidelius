import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type RecordMeta } from "../api";
import { TopBar } from "../components/TopBar";
import { errorMessage } from "../session";
import { CATEGORIES, CATEGORY_LABEL, formatTime } from "../templates";
import { Toast } from "../ui";

export function VaultPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "all";
  const [records, setRecords] = useState<RecordMeta[] | null>(null);
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setRecords(null);
    void api
      .records(category === "all" ? undefined : { category })
      .then((result) => setRecords(result.records))
      .catch((error) => setErr(errorMessage(error)));
  }, [category]);

  const empty = records && records.length === 0;

  const title = useMemo(
    () => (category === "all" ? "保险库" : CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL] ?? "保险库"),
    [category],
  );

  return (
    <div className="relative min-h-[100dvh]">
      <TopBar onToast={setToast} />
      <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-[160px_1fr]">
        <aside className="border-b border-line px-6 py-6 md:border-b-0 md:border-r">
          <nav className="flex flex-wrap gap-3 md:flex-col md:gap-2">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setParams(item.id === "all" ? {} : { category: item.id })}
                className={`text-left text-sm ${category === item.id ? "text-ink" : "text-muted hover:text-ink"}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
        <section className="px-6 py-6">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl tracking-[-0.04em]">{title}</h1>
            <Link to="/new" className="bg-ink px-3 py-1.5 text-sm text-canvas">
              新建
            </Link>
          </div>
          {err ? <p className="mt-6 text-sm text-danger">{err}</p> : null}
          {records === null && !err ? (
            <div className="mt-8 space-y-3">
              <div className="h-10 bg-surface" />
              <div className="h-10 bg-surface" />
              <div className="h-10 bg-surface" />
            </div>
          ) : null}
          {empty ? (
            <p className="mt-16 max-w-[36ch] text-muted">还没有记录。从一份服务器、证书或登录口令开始。</p>
          ) : null}
          <ul className="mt-8">
            {records?.map((record) => (
              <li key={record.id} className="border-t border-line">
                <Link to={`/records/${record.id}`} className="flex items-baseline justify-between gap-4 py-4">
                  <div>
                    <p className="text-ink">{record.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {CATEGORY_LABEL[record.category]}
                      {record.access === "shared" ? " / 分享给我" : ""}
                      {record.sharedWith.length > 0 && record.access === "owner" ? " / 已分享" : ""}
                    </p>
                  </div>
                  <time className="font-mono text-xs text-muted">{formatTime(record.updatedAt)}</time>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </div>
  );
}
