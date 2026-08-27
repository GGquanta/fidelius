import { FormEvent, useEffect, useState } from "react";
import { api, type User } from "../api";
import { errorMessage } from "../session";
import { formatTime } from "../templates";
import { useToast } from "../ui";

export function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [limit, setLimit] = useState(10);
  const [occupied, setOccupied] = useState(0);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const result = await api.users();
    setUsers(result.users as User[]);
    setLimit(result.limit ?? 10);
    setOccupied(result.occupied ?? result.users.length);
  }

  useEffect(() => {
    void load().catch((error) => setErr(errorMessage(error)));
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setErr("");
    try {
      await api.createUser(email, displayName);
      setEmail("");
      setDisplayName("");
      await load();
      toast("已创建，等待对方完成编排");
    } catch (error) {
      setErr(errorMessage(error));
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl tracking-[-0.04em]">用户</h1>
        <p className="font-mono text-sm text-muted">
          {occupied}/{limit}
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
      <form onSubmit={(event) => void create(event)} className="mt-8 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          className="rounded-box border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
        />
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="显示名"
          className="rounded-box border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
        />
        <button type="submit" className="rounded-box bg-accent px-4 py-2 text-sm text-white dark:text-stone-900">
          添加
        </button>
      </form>
      {err ? <p className="mt-4 text-sm text-danger">{err}</p> : null}
      <ul className="mt-8">
        {users.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 border-t border-line py-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm text-accent">
                {item.displayName.slice(0, 1)}
              </span>
              <div>
                <p>{item.displayName}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {item.email} · {formatTime(item.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-box px-2 py-0.5 text-xs ${statusClass(item.status)}`}>
                {statusLabel(item.status)}
              </span>
              {item.status !== "disabled" && item.role !== "admin" ? (
                <button
                  type="button"
                  className="text-sm text-danger"
                  onClick={() => {
                    void api
                      .disableUser(item.id)
                      .then(() => load())
                      .catch((error) => setErr(errorMessage(error)));
                  }}
                >
                  停用
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

function statusLabel(status: User["status"]): string {
  if (status === "active") return "已编排";
  if (status === "pending_enroll") return "待编排";
  return "已停用";
}

function statusClass(status: User["status"]): string {
  if (status === "active") return "bg-accent-soft text-accent";
  if (status === "pending_enroll") return "bg-[var(--cat-login-soft)] text-[var(--cat-login)]";
  return "bg-danger-soft text-danger";
}
