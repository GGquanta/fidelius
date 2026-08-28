import { useEffect, useRef, useState } from "react";
import { api, type AuditEntry } from "../api";
import { errorMessage } from "../session";
import { formatTime } from "../templates";
import { Skeleton } from "./Skeleton";

const PAGE = 10;

const ACTION_LABEL: Record<string, string> = {
  create: "创建",
  update: "更新",
  share: "分享",
  unshare: "收回",
  delete: "删除",
  reveal: "查看",
};

export function AuditLog({ recordId, revision }: { recordId: string; revision: number }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const inflight = useRef(false);
  const loaded = useRef(0);
  const seq = useRef(0);
  const hasMore = entries.length < total;

  useEffect(() => {
    const token = ++seq.current;
    inflight.current = true;
    loaded.current = 0;
    setBusy(true);
    setErr("");
    setEntries([]);
    setTotal(0);
    void api
      .audit(recordId, { offset: 0, limit: PAGE })
      .then((log) => {
        if (token !== seq.current) return;
        setEntries(log.entries);
        setTotal(log.total);
        loaded.current = log.entries.length;
      })
      .catch((error) => {
        if (token !== seq.current) return;
        setErr(errorMessage(error));
      })
      .finally(() => {
        if (token !== seq.current) return;
        inflight.current = false;
        setBusy(false);
      });
  }, [recordId, revision]);

  useEffect(() => {
    const root = scrollerRef.current;
    const target = sentinelRef.current;
    if (!root || !target || !hasMore) return;

    const observer = new IntersectionObserver(
      (hits) => {
        if (!hits.some((hit) => hit.isIntersecting)) return;
        if (inflight.current || loaded.current >= total) return;
        const token = seq.current;
        inflight.current = true;
        setBusy(true);
        void api
          .audit(recordId, { offset: loaded.current, limit: PAGE })
          .then((log) => {
            if (token !== seq.current) return;
            setEntries((prev) => [...prev, ...log.entries]);
            setTotal(log.total);
            loaded.current += log.entries.length;
          })
          .catch((error) => {
            if (token !== seq.current) return;
            setErr(errorMessage(error));
          })
          .finally(() => {
            if (token !== seq.current) return;
            inflight.current = false;
            setBusy(false);
          });
      },
      { root, rootMargin: "48px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, entries.length, recordId, revision, total]);

  return (
    <section>
      <h2 className="text-[12px] tracking-[0.08em] text-tertiary">操作记录</h2>
      <div
        ref={scrollerRef}
        className="mt-3 max-h-[min(42vh,280px)] overflow-y-auto overscroll-contain pr-1"
        aria-busy={busy || undefined}
      >
        <ul className="space-y-3">
          {entries.length === 0 && busy ? (
            <li className="space-y-4" aria-hidden>
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="block h-4 w-16 rounded-sm" />
                  <Skeleton className="block h-3 w-40 rounded-sm" />
                </div>
              ))}
            </li>
          ) : null}
          {entries.length === 0 && !busy ? <li className="text-sm text-tertiary">暂无操作记录</li> : null}
          {entries.map((entry, index) => (
            <li key={`${entry.at}-${entry.action}-${index}`}>
              <p className="text-sm">{ACTION_LABEL[entry.action] ?? entry.action}</p>
              <p className="mt-0.5 font-mono text-[12px] text-tertiary">
                {formatTime(entry.at)} · {entry.actorEmail}
              </p>
            </li>
          ))}
          {hasMore ? <li ref={sentinelRef} className="h-4" aria-hidden /> : null}
          {busy && entries.length > 0 ? (
            <li aria-hidden>
              <Skeleton className="block h-4 w-16 rounded-sm" />
              <Skeleton className="mt-2 block h-3 w-40 rounded-sm" />
            </li>
          ) : null}
        </ul>
      </div>
      {err ? <p className="mt-2 text-sm text-danger">{err}</p> : null}
    </section>
  );
}
