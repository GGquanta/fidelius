import { DownloadSimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type AuditEntry, type RecordMeta, type RevealedRecord } from "../api";
import { TopBar } from "../components/TopBar";
import { errorMessage, useSession } from "../session";
import { CATEGORY_LABEL, formatTime } from "../templates";
import { Toast } from "../ui";

export function RecordDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { unlocked, user } = useSession();
  const [record, setRecord] = useState<RecordMeta | null>(null);
  const [revealed, setRevealed] = useState<RevealedRecord | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [people, setPeople] = useState<Array<{ id: string; displayName: string; email: string }>>([]);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareId, setShareId] = useState("");

  async function load() {
    const result = await api.record(id);
    setRecord(result.record);
    const log = await api.audit(id);
    setAudit(log.entries);
    if (result.record.access === "owner") {
      const directory = await api.users();
      setPeople(
        directory.users.map((item) => ({
          id: item.id,
          displayName: item.displayName,
          email: "email" in item ? item.email : "",
        })),
      );
    }
  }

  useEffect(() => {
    void load().catch((error) => setErr(errorMessage(error)));
  }, [id]);

  useEffect(() => {
    if (!unlocked || !id) {
      setRevealed(null);
      return;
    }
    void api
      .reveal(id)
      .then(async (result) => {
        setRevealed(result.record);
        const log = await api.audit(id);
        setAudit(log.entries);
      })
      .catch((error) => setErr(errorMessage(error)));
  }, [unlocked, id]);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setToast("已复制");
  }

  function download(label: string, value: string) {
    const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${record?.title ?? "record"}-${label}.txt`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  if (err && !record) {
    return (
      <div>
        <TopBar onToast={setToast} />
        <p className="px-6 py-10 text-danger">{err}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh]">
      <TopBar onToast={setToast} />
      <article className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-muted">
          {record ? CATEGORY_LABEL[record.category] : ""}
          {record?.access === "shared" ? " / 只读分享" : ""}
        </p>
        <h1 className="mt-2 text-3xl tracking-[-0.05em]">{record?.title ?? "…"}</h1>
        {record?.description ? <p className="mt-4 max-w-[60ch] text-muted">{record.description}</p> : null}
        <p className="mt-3 font-mono text-xs text-muted">
          创建 {record ? formatTime(record.createdAt) : ""} / 修改 {record ? formatTime(record.updatedAt) : ""}
        </p>
        <div className="mt-10 divide-y divide-line border-y border-line">
          {(revealed?.fields ?? record?.fieldMeta.map((f) => ({ ...f, value: "" })) ?? []).map((field) => {
            const sealed = !revealed;
            const long = field.type === "multiline";
            return (
              <div key={field.key} className="py-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-sm text-muted">{field.label}</h2>
                  {revealed ? (
                    <div className="flex gap-3 text-sm">
                      <button type="button" onClick={() => void copy(field.value)} className="hover:text-pine">
                        复制
                      </button>
                      {long ? (
                        <button
                          type="button"
                          onClick={() => download(field.label, field.value)}
                          className="inline-flex items-center gap-1 hover:text-pine"
                        >
                          <DownloadSimple size={14} />
                          下载
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <pre
                  className={`mt-3 overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm transition duration-200 ${
                    sealed ? "blur-[3px] select-none text-muted" : "blur-0 text-ink"
                  }`}
                >
                  {sealed ? "••••••••••••••••" : field.value || "（空）"}
                </pre>
              </div>
            );
          })}
        </div>
        {!unlocked ? <p className="mt-4 text-sm text-muted">开锁后显示敏感内容。</p> : null}
        {record?.access === "owner" ? (
          <section className="mt-12">
            <h2 className="text-sm text-muted">分享</h2>
            <div className="mt-3 flex gap-2">
              <select
                value={shareId}
                onChange={(e) => setShareId(e.target.value)}
                className="flex-1 border-b border-line bg-transparent py-2 outline-none"
              >
                <option value="">选择同事</option>
                {people
                  .filter((person) => person.id !== user?.id && !record.sharedWith.includes(person.id))
                  .map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className="text-sm"
                onClick={() => {
                  if (!shareId) return;
                  void api
                    .share(id, shareId)
                    .then(() => load())
                    .then(() => setShareId(""))
                    .catch((error) => setErr(errorMessage(error)));
                }}
              >
                分享
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {record.sharedWith.map((uid) => {
                const person = people.find((p) => p.id === uid);
                return (
                  <li key={uid} className="flex items-center justify-between text-sm">
                    <span>{person?.displayName ?? uid}</span>
                    <button
                      type="button"
                      className="text-muted hover:text-ink"
                      onClick={() => void api.unshare(id, uid).then(() => load())}
                    >
                      收回
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 flex gap-4 text-sm">
              <Link to={`/records/${id}/edit`} className="hover:text-pine">
                编辑
              </Link>
              <button type="button" className="text-danger" onClick={() => setConfirmDelete(true)}>
                删除
              </button>
            </div>
          </section>
        ) : null}
        <section className="mt-12">
          <h2 className="text-sm text-muted">修改日志</h2>
          <ul className="mt-4 space-y-2">
            {audit.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="font-mono text-xs text-muted">
                {formatTime(entry.at)} {entry.actorEmail} {entry.action} {entry.detail}
              </li>
            ))}
          </ul>
        </section>
        {err ? <p className="mt-6 text-sm text-danger">{err}</p> : null}
      </article>
      {confirmDelete ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-ink/30">
          <div className="w-[min(90vw,360px)] bg-canvas p-6">
            <p>删除后无法恢复。确定删除这条记录？</p>
            <div className="mt-6 flex justify-end gap-3 text-sm">
              <button type="button" onClick={() => setConfirmDelete(false)}>
                取消
              </button>
              <button
                type="button"
                className="text-danger"
                onClick={() => {
                  void api.deleteRecord(id).then(() => navigate("/"));
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </div>
  );
}
