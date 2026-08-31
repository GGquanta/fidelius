import { UserAdd, UserMinus } from "reicon-react";
import { FormEvent, useEffect, useState } from "react";
import { api, type User, type Visitor } from "../api";
import { Button } from "../components/Button";
import { LoadingRegion, Skeleton } from "../components/Skeleton";
import { errorMessage, useSession } from "../session";
import { formatTime } from "../templates";
import { useToast } from "../ui";

export function UsersPage() {
  const toast = useToast();
  const { user } = useSession();
  const [users, setUsers] = useState<User[] | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [limit, setLimit] = useState(20);
  const [occupied, setOccupied] = useState(0);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [provisioningEmail, setProvisioningEmail] = useState<string | null>(null);
  const [disablingId, setDisablingId] = useState<string | null>(null);

  async function load() {
    const result = await api.users();
    setUsers(result.users as User[]);
    setVisitors(result.visitors ?? []);
    setLimit(result.limit ?? 20);
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
    <section className="mx-auto w-full max-w-[1200px] px-4 py-5 md:px-6 md:py-6">
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
                  className="mt-2 h-10 w-full rounded-box border border-line-strong bg-canvas px-3 text-sm leading-none outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-muted">显示名</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={creating}
                  className="mt-2 h-10 w-full rounded-box border border-line-strong bg-canvas px-3 text-sm leading-none outline-none focus:border-accent"
                />
              </div>
              <Button type="submit" busy={creating} className="h-10">
                <UserAdd size={16} />
                添加成员
              </Button>
            </form>
            {err ? <p className="mt-4 text-sm text-danger">{err}</p> : null}
            {visitors.length > 0 ? (
              <ul className="mt-8">
                {visitors.map((item) => (
                  <li
                    key={item.email}
                    className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-line py-4"
                  >
                    <span className="row-start-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-sm text-muted">
                      {item.email.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-2">
                      <p className="min-w-0 truncate font-mono text-sm">{item.email}</p>
                      <span className="inline-flex shrink-0 whitespace-nowrap rounded-box bg-sunken px-2 py-0.5 text-xs text-muted">
                        未开通
                      </span>
                    </div>
                    <Button
                      type="button"
                      tone="accent"
                      className="col-start-3 row-start-1 shrink-0 whitespace-nowrap !px-2 !py-1"
                      busy={provisioningEmail === item.email}
                      disabled={provisioningEmail !== null}
                      onClick={() => {
                        if (provisioningEmail) return;
                        setProvisioningEmail(item.email);
                        setErr("");
                        void api
                          .provisionUser(item.email)
                          .then(() => {
                            toast("已开通，等待对方绑定验证器");
                            return load();
                          })
                          .catch((error) => setErr(errorMessage(error)))
                          .finally(() => setProvisioningEmail(null));
                      }}
                    >
                      <UserAdd size={16} />
                      开通
                    </Button>
                    <p className="col-span-2 col-start-2 row-start-2 min-w-0 truncate font-mono text-xs text-tertiary">
                      首次访问 · {formatTime(item.firstSeenAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className={visitors.length > 0 ? "mt-0" : "mt-8"}>
              {(users ?? []).map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-line py-4"
                >
                  <span className="row-start-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm text-accent-ink">
                    {item.displayName.slice(0, 1)}
                  </span>
                  <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-2">
                    <p className="min-w-0 truncate">{item.displayName}</p>
                    <span
                      className={`inline-flex shrink-0 whitespace-nowrap rounded-box px-2 py-0.5 text-xs ${statusClass(item.status)}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  {item.status !== "disabled" && item.role !== "admin" ? (
                    <Button
                      type="button"
                      tone="tertiary"
                      className="col-start-3 row-start-1 shrink-0 whitespace-nowrap bg-sunken text-ink !px-2 !py-1"
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
                      <UserMinus size={16} />
                      停用
                    </Button>
                  ) : null}
                  <p className="col-span-2 col-start-2 row-start-2 min-w-0 truncate font-mono text-xs text-tertiary">
                    {item.email} · {formatTime(item.createdAt)}
                  </p>
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
        {Array.from({ length: 20 }, (_, index) => (
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
        <Skeleton className="block h-10 w-32 rounded-box" />
      </div>
      <ul className="mt-8">
        {Array.from({ length: 4 }, (_, index) => (
          <li
            key={index}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-line py-4"
          >
            <Skeleton className="row-start-1 h-9 w-9 shrink-0 rounded-full" />
            <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-2">
              <Skeleton className="block h-4 w-28 max-w-full rounded-sm" />
              <Skeleton className="h-5 w-12 shrink-0 rounded-box" />
            </div>
            <Skeleton className="col-span-2 col-start-2 row-start-2 block h-3 w-48 max-w-full rounded-sm" />
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
