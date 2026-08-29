import { Plus } from "reicon-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type RecordMeta } from "../api";
import { CategoryIcon, categoryTone, type CategoryId } from "../components/CategoryIcon";
import { DonutRing, StackedBar, WeekBars } from "../components/charts";
import { RecordCard } from "../components/RecordCard";
import { LoadingRegion, Skeleton } from "../components/Skeleton";
import { StatCard } from "../components/StatCard";
import { errorMessage, useSession } from "../session";
import { CATEGORIES, formatTime } from "../templates";

function weekBuckets(records: RecordMeta[]): number[] {
  const now = Date.now();
  const buckets = Array.from({ length: 12 }, () => 0);
  for (const record of records) {
    const age = now - new Date(record.updatedAt).getTime();
    const week = Math.floor(age / (7 * 24 * 60 * 60 * 1000));
    if (week >= 0 && week < 12) buckets[11 - week] += 1;
  }
  return buckets;
}

function QuotaCard({ occupied, limit }: { occupied: number; limit: number }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-5 shadow-elev-1">
      <h2 className="text-sm text-muted">成员名额</h2>
      <p className="font-metric mt-3 text-4xl leading-none">
        {occupied}
        <span className="text-xl text-muted">/{limit}</span>
      </p>
      <div className="mt-4 flex gap-1">
        {Array.from({ length: limit }, (_, index) => (
          <span
            key={index}
            className={`h-2 flex-1 rounded-full ${index < occupied ? "bg-accent" : "bg-line"}`}
          />
        ))}
      </div>
      <Link to="/users" viewTransition className="fx-hover mt-4 inline-block text-sm text-accent-ink">
        管理成员
      </Link>
    </article>
  );
}

function QuotaSkeleton() {
  return (
    <article className="rounded-xl border border-line bg-surface p-5 shadow-elev-1">
      <h2 className="text-sm text-muted">成员名额</h2>
      <Skeleton className="mt-3 block h-10 w-24 rounded-md" />
      <div className="mt-4 flex gap-1">
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} className="h-2 flex-1 rounded-full bg-line" />
        ))}
      </div>
      <Skeleton className="mt-4 block h-4 w-16 rounded-sm" />
    </article>
  );
}

export function DashboardPage() {
  const { user } = useSession();
  const [records, setRecords] = useState<RecordMeta[] | null>(null);
  const [occupied, setOccupied] = useState<number | null>(null);
  const [limit, setLimit] = useState(10);
  const [err, setErr] = useState("");
  const admin = user?.role === "admin";
  const loading = records === null && !err;

  useEffect(() => {
    void api
      .records()
      .then((result) => setRecords(result.records))
      .catch((error) => setErr(errorMessage(error)));
    if (user?.role === "admin") {
      void api.users().then((result) => {
        setLimit(result.limit ?? 10);
        setOccupied(result.occupied ?? result.users.length);
      });
    }
  }, [user?.role]);

  const stats = useMemo(() => {
    const list = records ?? [];
    const mine = list.filter((r) => r.access === "owner");
    const received = list.filter((r) => r.access === "shared");
    const sharedOut = mine.filter((r) => r.sharedWith.length > 0);
    const counts: Record<string, number> = {};
    const latest: Record<string, string> = {};
    const fields = { text: 0, secret: 0, multiline: 0 };
    for (const record of list) {
      counts[record.category] = (counts[record.category] ?? 0) + 1;
      if (!latest[record.category] || record.updatedAt > latest[record.category]) {
        latest[record.category] = record.updatedAt;
      }
      for (const field of record.fieldMeta) {
        fields[field.type] += 1;
      }
    }
    return {
      total: list.length,
      mine: mine.length,
      received: received.length,
      sharedOut: sharedOut.length,
      counts,
      latest,
      fields,
      recent: list.slice(0, 5),
      weeks: weekBuckets(list),
    };
  }, [records]);

  const hour = new Date().getHours();
  const hello = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";

  return (
    <section className="px-4 py-5 md:px-6 md:py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {hello}，{user?.displayName}
          </p>
          <h1 className="font-display mt-1 text-3xl tracking-tight">概览</h1>
        </div>
        <Link to="/new" viewTransition className="btn-primary fx-hover fx-press inline-flex items-center gap-1.5 rounded-box px-4 py-2 text-sm">
          <Plus size={16} />
          新建
        </Link>
      </div>

      {err ? <p className="mt-6 text-sm text-danger">{err}</p> : null}

      {loading ? (
        <LoadingRegion className="mt-6">
          <DashboardSkeleton admin={admin} occupied={occupied} limit={limit} />
        </LoadingRegion>
      ) : records ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <StatCard label="全部" value={stats.total} hint="可见记录" />
            <StatCard label="我的" value={stats.mine} hint="我创建的" />
            <StatCard label="他人分享" value={stats.received} hint="只读" />
            <StatCard label="我分享的" value={stats.sharedOut} hint="已分享给他人" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <article className="rounded-xl border border-line bg-surface p-5 shadow-elev-1">
              <h2 className="text-sm text-muted">分类分布</h2>
              <div className="mt-4">
                <StackedBar
                  segments={CATEGORIES.filter((c) => c.id !== "all").map((item) => ({
                    id: item.id,
                    label: item.short,
                    value: stats.counts[item.id] ?? 0,
                    color: categoryTone(item.id as CategoryId).color,
                  }))}
                />
              </div>
            </article>
            <article className="rounded-xl border border-line bg-surface p-5 shadow-elev-1">
              <h2 className="text-sm text-muted">字段类型</h2>
              <div className="mt-4">
                <DonutRing
                  segments={[
                    { id: "text", label: "文本", value: stats.fields.text, color: "var(--accent)" },
                    { id: "secret", label: "敏感", value: stats.fields.secret, color: "var(--peach)" },
                    { id: "multiline", label: "多行", value: stats.fields.multiline, color: "var(--cat-ssl)" },
                  ]}
                />
              </div>
            </article>
          </div>

          <div className="mt-6">
            <h2 className="text-sm text-muted">按分类浏览</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {CATEGORIES.filter((c) => c.id !== "all").map((item) => {
                const tone = categoryTone(item.id);
                const count = stats.counts[item.id] ?? 0;
                const updatedAt = stats.latest[item.id];
                return (
                  <Link
                    key={item.id}
                    to={`/vault?category=${item.id}`}
                    viewTransition
                    className="paper-face fx-hover relative flex items-center gap-3 overflow-hidden rounded-lg border border-line p-4 shadow-elev-1"
                    style={{ ["--cat-tint" as string]: tone.soft, ["--ear" as string]: tone.soft }}
                  >
                    <span className="card-ear" aria-hidden />
                    <CategoryIcon category={item.id} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{item.label}</p>
                      <p className="mt-1 text-xs text-tertiary">
                        {updatedAt ? formatTime(updatedAt) : "暂无记录"}
                      </p>
                    </div>
                    <p className="font-metric shrink-0 self-center text-4xl leading-none tracking-tight">{count}</p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <article className="rounded-xl border border-line bg-surface p-5 shadow-elev-1">
              <h2 className="text-sm text-muted">最近更新</h2>
              <div className="mt-4 space-y-2">
                {stats.recent.length === 0 ? <p className="text-sm text-tertiary">暂无记录</p> : null}
                {stats.recent.map((record) => (
                  <RecordCard key={record.id} record={record} flush />
                ))}
              </div>
            </article>
            <div className="space-y-4">
              <article className="rounded-xl border border-line bg-surface p-5 shadow-elev-1">
                <h2 className="text-sm text-muted">更新趋势</h2>
                <p className="mt-1 text-xs text-tertiary">近 12 周</p>
                <div className="mt-4">
                  <WeekBars values={stats.weeks} />
                </div>
              </article>
              {admin ? (
                occupied === null ? (
                  <QuotaSkeleton />
                ) : (
                  <QuotaCard occupied={occupied} limit={limit} />
                )
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function DashboardSkeleton({
  admin,
  occupied,
  limit,
}: {
  admin: boolean;
  occupied: number | null;
  limit: number;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="全部" value={0} hint="可见记录" loading />
        <StatCard label="我的" value={0} hint="我创建的" loading />
        <StatCard label="他人分享" value={0} hint="只读" loading />
        <StatCard label="我分享的" value={0} hint="已分享给他人" loading />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <article className="rounded-xl border border-line bg-surface p-5 shadow-elev-1">
          <h2 className="text-sm text-muted">分类分布</h2>
          <Skeleton className="mt-4 block h-3 w-full rounded-full" />
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {CATEGORIES.filter((c) => c.id !== "all").map((item) => (
              <span key={item.id} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-line" aria-hidden />
                <span className="text-muted">{item.short}</span>
                <Skeleton className="inline-block h-3 w-5 rounded-sm" />
              </span>
            ))}
          </div>
        </article>
        <article className="rounded-xl border border-line bg-surface p-5 shadow-elev-1">
          <h2 className="text-sm text-muted">字段类型</h2>
          <div className="mt-4 flex items-center gap-5">
            <Skeleton className="h-40 w-40 shrink-0 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="block h-4 w-24 rounded-sm" />
              <Skeleton className="block h-4 w-20 rounded-sm" />
              <Skeleton className="block h-4 w-28 rounded-sm" />
            </div>
          </div>
        </article>
      </div>
      <div className="mt-6">
        <h2 className="text-sm text-muted">按分类浏览</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {CATEGORIES.filter((c) => c.id !== "all").map((item) => {
            const tone = categoryTone(item.id);
            return (
              <div
                key={item.id}
                className="paper-face relative flex items-center gap-3 overflow-hidden rounded-lg border border-line p-4 shadow-elev-1"
                style={{ ["--cat-tint" as string]: tone.soft, ["--ear" as string]: tone.soft }}
              >
                <span className="card-ear" aria-hidden />
                <CategoryIcon category={item.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.label}</p>
                  <Skeleton className="mt-1 block h-3 w-16 rounded-sm" />
                </div>
                <Skeleton className="h-9 w-10 shrink-0 self-center rounded-md" />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <article className="rounded-xl border border-line bg-surface p-5 shadow-elev-1">
          <h2 className="text-sm text-muted">最近更新</h2>
          <div className="mt-4 space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="block h-24 w-full rounded-lg" />
            ))}
          </div>
        </article>
        <div className="space-y-4">
          <article className="rounded-xl border border-line bg-surface p-5 shadow-elev-1">
            <h2 className="text-sm text-muted">更新趋势</h2>
            <p className="mt-1 text-xs text-tertiary">近 12 周</p>
            <div className="mt-4 flex h-24 items-end gap-1.5">
              {Array.from({ length: 12 }, (_, index) => (
                <Skeleton key={index} className="block h-8 flex-1 rounded-sm" />
              ))}
            </div>
          </article>
          {admin ? (
            occupied === null ? (
              <QuotaSkeleton />
            ) : (
              <QuotaCard occupied={occupied} limit={limit} />
            )
          ) : null}
        </div>
      </div>
    </>
  );
}
