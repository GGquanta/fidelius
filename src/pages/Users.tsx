import { FormEvent, useEffect, useState } from "react";
import { api, type User } from "../api";
import { TopBar } from "../components/TopBar";
import { errorMessage } from "../session";
import { formatTime } from "../templates";
import { Toast } from "../ui";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [limit, setLimit] = useState(10);
  const [occupied, setOccupied] = useState(0);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

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
      setToast("已创建，等待对方完成编排");
    } catch (error) {
      setErr(errorMessage(error));
    }
  }

  return (
    <div className="relative min-h-[100dvh]">
      <TopBar onToast={setToast} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl tracking-[-0.04em]">用户</h1>
          <p className="font-mono text-sm text-muted">
            {occupied}/{limit}
          </p>
        </div>
        <form onSubmit={(event) => void create(event)} className="mt-8 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            className="border-b border-line bg-transparent py-2 outline-none"
          />
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="显示名"
            className="border-b border-line bg-transparent py-2 outline-none"
          />
          <button type="submit" className="bg-ink px-4 py-2 text-sm text-canvas">
            添加
          </button>
        </form>
        {err ? <p className="mt-4 text-sm text-danger">{err}</p> : null}
        <ul className="mt-10">
          {users.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 border-t border-line py-4">
              <div>
                <p>{item.displayName}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {item.email} / {item.role} / {statusLabel(item.status)} / {formatTime(item.createdAt)}
                </p>
              </div>
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
            </li>
          ))}
        </ul>
      </main>
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </div>
  );
}

function statusLabel(status: User["status"]): string {
  if (status === "active") return "已编排";
  if (status === "pending_enroll") return "待编排";
  return "已停用";
}
