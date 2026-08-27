import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type AuditEntry, type RecordMeta, type RevealedRecord } from "../api";
import { BackLink } from "../components/BackLink";
import { Button } from "../components/Button";
import { CategoryIcon } from "../components/CategoryIcon";
import { FieldBlock } from "../components/FieldBlock";
import { SensitiveUnlock } from "../components/UnlockPanel";
import { errorMessage, useSession } from "../session";
import { CATEGORY_LABEL, formatTime } from "../templates";
import { useToast } from "../ui";

const ACTION_LABEL: Record<string, string> = {
  create: "创建",
  update: "修改",
  share: "分享",
  unshare: "收回",
  delete: "删除",
  reveal: "揭开",
};

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
    return (
      <div className="mx-auto max-w-[960px] px-6 py-8">
        <BackLink to="/vault" label="返回保险库" />
        <p className="mt-6 text-danger">{err}</p>
      </div>
    );
  }

  const fields = revealed?.fields ?? record?.fieldMeta.map((f) => ({ ...f, value: "" })) ?? [];
  const owner = record?.access === "owner";
  const shareable = people.filter((person) => person.id !== user?.id && !record?.sharedWith.includes(person.id));

  return (
    <article className="mx-auto max-w-[960px] px-6 py-6">
      <BackLink to="/vault" label="返回保险库" />

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface shadow-elev-2">
        <header className="flex flex-col gap-4 border-b border-line px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {record ? <CategoryIcon category={record.category} size={44} /> : null}
            <div className="min-w-0">
              <p className="text-[12px] text-muted">
                {record ? CATEGORY_LABEL[record.category] : ""}
                {record?.access === "shared" ? " · 只读分享" : ""}
              </p>
              <h1 className="font-display mt-1 text-3xl tracking-tight">{record?.title ?? "…"}</h1>
              {record?.description ? (
                <p className="mt-2 max-w-[34em] text-sm leading-relaxed text-muted">{record.description}</p>
              ) : null}
            </div>
          </div>
          {owner ? (
            <div className="flex shrink-0 items-center gap-2 sm:pt-1">
              <Link
                to={`/records/${id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-box border border-line-strong bg-surface px-3 py-2 text-sm shadow-elev-1 hover:bg-hover"
              >
                <PencilSimple size={14} />
                编辑
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-box px-3 py-2 text-sm text-muted hover:bg-hover hover:text-danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash size={14} />
                删除
              </button>
            </div>
          ) : null}
        </header>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="px-6 py-5">
            <SensitiveUnlock onToast={toast} />
            <div className="divide-y divide-line">
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
            {err ? <p className="mt-4 text-sm text-danger">{err}</p> : null}
          </div>

          <aside className="space-y-8 border-t border-line px-5 py-5 lg:border-t-0 lg:border-l">
            <section>
              <h2 className="text-[12px] tracking-[0.08em] text-tertiary">时间</h2>
              <p className="mt-3 text-sm">创建 {record ? formatTime(record.createdAt) : ""}</p>
              <p className="mt-1 text-sm">修改 {record ? formatTime(record.updatedAt) : ""}</p>
            </section>
            {owner ? (
              <section>
                <h2 className="text-[12px] tracking-[0.08em] text-tertiary">分享</h2>
                <div className="mt-3 space-y-2">
                  <select
                    value={shareId}
                    onChange={(e) => setShareId(e.target.value)}
                    className="w-full rounded-box border border-line-strong bg-canvas px-3 py-2 text-sm outline-none"
                  >
                    <option value="">选择同事</option>
                    {shareable.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.displayName}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    tone="secondary"
                    className="w-full"
                    disabled={!shareId}
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
                  </Button>
                </div>
                <ul className="mt-4 space-y-3">
                  {record.sharedWith.length === 0 ? <li className="text-sm text-tertiary">尚未分享</li> : null}
                  {record.sharedWith.map((uid) => {
                    const person = people.find((p) => p.id === uid);
                    return (
                      <li key={uid} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] text-accent-ink">
                            {(person?.displayName ?? "?").slice(0, 1)}
                          </span>
                          <span className="truncate text-sm">{person?.displayName ?? uid}</span>
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-sm text-muted hover:text-ink"
                          onClick={() => void api.unshare(id, uid).then(() => load())}
                        >
                          收回
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
            <section>
              <h2 className="text-[12px] tracking-[0.08em] text-tertiary">修改日志</h2>
              <ul className="mt-3 space-y-3">
                {audit.length === 0 ? <li className="text-sm text-tertiary">暂无记录</li> : null}
                {audit.map((entry, index) => (
                  <li key={`${entry.at}-${index}`}>
                    <p className="text-sm">{ACTION_LABEL[entry.action] ?? entry.action}</p>
                    <p className="mt-0.5 font-mono text-[12px] text-tertiary">
                      {formatTime(entry.at)} · {entry.actorEmail}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>

      {confirmDelete ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-ink/25 p-4">
          <div className="w-[min(90vw,360px)] rounded-xl border border-line bg-surface p-6 shadow-elev-5">
            <p>删除后无法恢复。确定删除这条记录？</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" tone="tertiary" onClick={() => setConfirmDelete(false)}>
                取消
              </Button>
              <Button
                type="button"
                tone="danger"
                onClick={() => {
                  void api.deleteRecord(id).then(() => navigate("/vault"));
                }}
              >
                删除
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
