import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type AuditEntry, type RecordMeta, type RevealedRecord } from "../api";
import { CategoryIcon } from "../components/CategoryIcon";
import { FieldBlock } from "../components/FieldBlock";
import { errorMessage, useSession } from "../session";
import { CATEGORY_LABEL, formatTime } from "../templates";
import { useToast } from "../ui";

export function RecordDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { unlocked, user } = useSession();
  const [record, setRecord] = useState<RecordMeta | null>(null);
  const [revealed, setRevealed] = useState<RevealedRecord | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [people, setPeople] = useState<Array<{ id: string; displayName: string; email: string }>>([]);
  const [err, setErr] = useState("");
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
    return <p className="px-6 py-10 text-danger">{err}</p>;
  }

  const fields = revealed?.fields ?? record?.fieldMeta.map((f) => ({ ...f, value: "" })) ?? [];

  return (
    <article className="grid gap-8 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div className="flex items-start gap-3">
          {record ? <CategoryIcon category={record.category} size={44} /> : null}
          <div>
            <p className="text-sm text-muted">
              {record ? CATEGORY_LABEL[record.category] : ""}
              {record?.access === "shared" ? " · 只读分享" : ""}
            </p>
            <h1 className="mt-1 text-2xl tracking-[-0.04em]">{record?.title ?? "…"}</h1>
            {record?.description ? <p className="mt-2 text-muted">{record.description}</p> : null}
          </div>
        </div>
        <div className="mt-8 space-y-3">
          {fields.map((field) => (
            <FieldBlock
              key={field.key}
              field={field}
              sealed={!revealed}
              onCopy={(value) => {
                void navigator.clipboard.writeText(value);
                toast("已复制");
              }}
              onDownload={download}
            />
          ))}
        </div>
        {!unlocked ? <p className="mt-4 text-sm text-muted">开锁后显示敏感内容。</p> : null}
        {err ? <p className="mt-4 text-sm text-danger">{err}</p> : null}
      </div>
      <aside className="space-y-6">
        <section className="rounded-box border border-line bg-surface p-4">
          <p className="text-sm text-muted">时间</p>
          <p className="mt-2 font-mono text-xs">
            创建 {record ? formatTime(record.createdAt) : ""}
            <br />
            修改 {record ? formatTime(record.updatedAt) : ""}
          </p>
        </section>
        {record?.access === "owner" ? (
          <section className="rounded-box border border-line bg-surface p-4">
            <p className="text-sm text-muted">分享</p>
            <div className="mt-3 flex gap-2">
              <select
                value={shareId}
                onChange={(e) => setShareId(e.target.value)}
                className="flex-1 rounded-box border border-line bg-canvas px-2 py-2 text-sm outline-none"
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
                className="rounded-box bg-accent px-3 py-2 text-sm text-white dark:text-stone-900"
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
            <ul className="mt-3 space-y-2">
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
            <div className="mt-4 flex gap-2">
              <Link
                to={`/records/${id}/edit`}
                className="inline-flex items-center gap-1 rounded-box px-2 py-1.5 text-sm hover:bg-hover"
              >
                <PencilSimple size={14} />
                编辑
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-box px-2 py-1.5 text-sm text-danger hover:bg-danger-soft"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash size={14} />
                删除
              </button>
            </div>
          </section>
        ) : null}
        <section className="rounded-box border border-line bg-surface p-4">
          <p className="text-sm text-muted">修改日志</p>
          <ul className="mt-3 space-y-2">
            {audit.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="font-mono text-xs text-muted">
                {formatTime(entry.at)} {entry.actorEmail} {entry.action}
              </li>
            ))}
          </ul>
        </section>
      </aside>
      {confirmDelete ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-ink/25 p-4">
          <div className="w-[min(90vw,360px)] rounded-box border border-line bg-surface p-6">
            <p>删除后无法恢复。确定删除这条记录？</p>
            <div className="mt-6 flex justify-end gap-3 text-sm">
              <button type="button" onClick={() => setConfirmDelete(false)}>
                取消
              </button>
              <button
                type="button"
                className="rounded-box bg-danger px-3 py-1.5 text-white"
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
    </article>
  );
}
