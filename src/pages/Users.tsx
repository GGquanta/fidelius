import { FormEvent, useEffect, useState } from "react";
import { api, type User } from "../api";
import { Button } from "../components/Button";
import { LoadingRegion, Skeleton } from "../components/Skeleton";
import { errorMessage, useSession } from "../session";
import { formatTime } from "../templates";
import { useToast } from "../ui";

export function UsersPage() {
  const toast = useToast();
  const { user } = useSession();
  const [users, setUsers] = useState<User[] | null>(null);
  const [limit, setLimit] = useState(10);
  const [occupied, setOccupied] = useState(0);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [disablingId, setDisablingId] = useState<string | null>(null);

  async function load() {
    const result = await api.users();
    setUsers(result.users as User[]);
    setLimit(result.limit ?? 10);
    setOccupied(result.occupied ?? result.users.length);
  }

  useEffect(() => {
    void load().catch((error) => setErr(errorMessage(error)));
  }, [user?.displayName, user?.updatedAt]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setErr("");
    try {
      await api.createUser(email, displayName);
      setEmail("");
      setDisplayName("");
      await load();
      toast("已添加，等待对方绑定验证器");
    } catch (error) {
      setErr(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  const loading = users === null && !err;

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <div className="rounded-xl border border-line bg-surface px-6 py-6">
        {loading ? (
          <UsersSkeleton />
        ) : users === null ? (
          <>
            <h1 className="font-display text-3xl tracking-tight">团队</h1>
            {err ? <p className="mt-4 text-sm text-danger">{err}</p> : null}
          </>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4">
              <h1 className="font-display text-3xl tracking-tight">团队</h1>
              <p className="font-metric text-2xl">
                {occupied}
                <span className="text-lg text-muted">/{limit}</span>
              </p>
            </div>
            <div className="mt-4 flex gap-1">
              {Array.from({ length: limit }, (_, index) => (
                <span
                  key={index}
                  className={`h-2 flex-1 rounded-full ${index < occupied ? "bg-accent" : "bg-line"}`}
                />
              ))}
            </div>
            <form
              onSubmit={(event) => void create(event)}
              className="mt-8 grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <div>
                <label className="block text-xs text-muted">邮箱</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={creating}
                  className="mt-2 w-full rounded-box border border-line-strong bg-canvas px-3 py-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-muted">显示名</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={creating}
                  className="mt-2 w-full rounded-box border border-line-strong bg-canvas px-3 py-2 outline-none focus:border-accent"
                />
              </div>
              <Button type="submit" busy={creating}>
                添加成员
              </Button>
            </form>
            {err ? <p className="mt-4 text-sm text-danger">{err}</p> : null}
            <ul className="mt-8">
              {(users ?? []).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 border-t border-line py-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm text-accent-ink">
                      {item.displayName.slice(0, 1)}
                    </span>
                    <div>
                      <p>{item.displayName}</p>
                      <p className="mt-1 font-mono text-xs text-tertiary">
                        {item.email} · {formatTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-box px-2 py-0.5 text-xs ${statusClass(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                    {item.status !== "disabled" && item.role !== "admin" ? (
                      <Button
                        type="button"
                        tone="tertiary"
                        className="px-2 py-1"
                        busy={disablingId === item.id}
                        disabled={disablingId !== null}
                        onClick={() => {
                          if (disablingId) return;
                          setDisablingId(item.id);
                          void api
                            .disableUser(item.id)
                            .then(() => load())
                            .catch((error) => setErr(errorMessage(error)))
                            .finally(() => setDisablingId(null));
                        }}
                      >
                        停用
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function UsersSkeleton() {
  return (
    <LoadingRegion>
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl tracking-tight">团队</h1>
        <Skeleton className="inline-block h-8 w-16 rounded-md" />
      </div>
      <div className="mt-4 flex gap-1">
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} className="h-2 flex-1 rounded-full bg-line" />
        ))}
      </div>
      <div className="mt-8 grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
        <div>
          <p className="text-xs text-muted">邮箱</p>
          <Skeleton className="mt-2 block h-10 w-full rounded-box" />
        </div>
        <div>
          <p className="text-xs text-muted">显示名</p>
          <Skeleton className="mt-2 block h-10 w-full rounded-box" />
        </div>
        <Skeleton className="block h-10 w-24 rounded-box" />
      </div>
      <ul className="mt-8">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 border-t border-line py-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="block h-4 w-28 rounded-sm" />
              <Skeleton className="mt-2 block h-3 w-48 rounded-sm" />
            </div>
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

function statusLabel(status: User["status"]): string {
  if (status === "active") return "已绑定";
  if (status === "pending_enroll") return "待绑定";
  return "已停用";
}

function statusClass(status: User["status"]): string {
  if (status === "active") return "bg-accent-soft text-accent-ink";
  if (status === "pending_enroll") return "bg-peach-soft text-peach-ink";
  return "bg-danger-soft text-danger-ink";
}
