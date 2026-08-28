import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type RecordMeta, type RevealedRecord } from "../api";
import { AuditLog } from "../components/AuditLog";
import { BackLink } from "../components/BackLink";
import { Button, ButtonLink } from "../components/Button";
import { CategoryIcon } from "../components/CategoryIcon";
import { FieldBlock } from "../components/FieldBlock";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { LoadingRegion, Skeleton } from "../components/Skeleton";
import { SensitiveUnlock } from "../components/UnlockPanel";
import { VT } from "../fx";
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
  const [auditRevision, setAuditRevision] = useState(0);
  const [people, setPeople] = useState<
    Array<{ id: string; displayName: string; email: string; status?: string }>
  >([]);
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareId, setShareId] = useState("");
  const [acting, setActing] = useState<"share" | "unshare" | "delete" | null>(null);

  async function load() {
    const [result, directory] = await Promise.all([
      api.record(id),
      api.users().catch(() => ({ users: [] })),
    ]);
    setRecord(result.record);
    if (result.record.access === "owner") {
      setPeople(
        directory.users.map((item) => ({
          id: item.id,
          displayName: item.displayName,
          email: "email" in item ? item.email : "",
          status: "status" in item ? item.status : "active",
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
    let cancelled = false;
    void api
      .reveal(id)
      .then((result) => {
        if (cancelled) return;
        setRevealed(result.record);
        setAuditRevision((n) => n + 1);
      })
      .catch((error) => {
        if (!cancelled) setErr(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
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

  if (!record) {
    return (
      <article className="mx-auto w-full max-w-[1200px] px-6 py-6">
        <BackLink to="/vault" label="返回保险库" />
        {err ? <p className="mt-6 text-danger">{err}</p> : <RecordDetailSkeleton />}
      </article>
    );
  }

  const fields = revealed?.fields ?? record.fieldMeta.map((f) => ({ ...f, value: "" }));
  const owner = record.access === "owner";
  const shareable = people.filter(
    (person) =>
      person.id !== user?.id &&
      !record.sharedWith.includes(person.id) &&
      person.status === "active",
  );

  return (
    <article className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <BackLink to="/vault" label="返回保险库" />

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface shadow-elev-2">
        <header className="flex flex-col gap-4 border-b border-line px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <CategoryIcon category={record.category} size={44} />
            <div className="min-w-0">
              <p className="text-[12px] text-muted">
                {CATEGORY_LABEL[record.category]}
                {record.access === "shared" ? " · 只读分享" : ""}
              </p>
              <h1 className="font-display mt-1 text-3xl tracking-tight">{record.title}</h1>
              {record.description ? (
                <p className="mt-2 max-w-[34em] text-sm leading-relaxed text-muted">{record.description}</p>
              ) : null}
            </div>
          </div>
          {owner ? (
            <div className="flex shrink-0 items-center gap-2 sm:pt-1">
              <ButtonLink to={`/records/${id}/edit`} tone="accent" viewTransition>
                <PencilSimple size={16} />
                编辑
              </ButtonLink>
              <Button type="button" tone="danger-soft" onClick={() => setConfirmDelete(true)}>
                <Trash size={16} />
                删除
              </Button>
            </div>
          ) : null}
        </header>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="px-6 py-5">
            <SensitiveUnlock onToast={toast} />
            <div className="divide-y divide-line">
              {fields.map((field) => (
                <FieldBlock
                  key={field.key}
                  field={field}
                  sealed={!unlocked || !revealed}
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
              <p className="mt-3 text-sm">创建于 {formatTime(record.createdAt)}</p>
              <p className="mt-1 text-sm">更新于 {formatTime(record.updatedAt)}</p>
            </section>
            {owner ? (
              <section>
                <h2 className="text-[12px] tracking-[0.08em] text-tertiary">分享</h2>
                <div className="mt-3 space-y-2">
                  <Select
                    value={shareId}
                    onChange={setShareId}
                    placeholder={shareable.length === 0 ? "没有可分享的成员" : "选择成员"}
                    showInitial
                    options={shareable.map((person) => ({
                      id: person.id,
                      label: person.displayName,
                      hint: person.email,
                    }))}
                  />
                  <Button
                    type="button"
                    tone="secondary"
                    className="w-full"
                    busy={acting === "share"}
                    disabled={!shareId || acting !== null}
                    onClick={() => {
                      if (!shareId || acting) return;
                      setActing("share");
                      setErr("");
                      void api
                        .share(id, shareId)
                        .then(() => load())
                        .then(() => {
                          setShareId("");
                          setAuditRevision((n) => n + 1);
                        })
                        .catch((error) => setErr(errorMessage(error)))
                        .finally(() => setActing(null));
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
                        <Button
                          type="button"
                          tone="tertiary"
                          className="shrink-0 px-2 py-1"
                          busy={acting === "unshare"}
                          disabled={acting !== null}
                          onClick={() => {
                            if (acting) return;
                            setActing("unshare");
                            void api
                              .unshare(id, uid)
                              .then(() => load())
                              .then(() => setAuditRevision((n) => n + 1))
                              .catch((error) => setErr(errorMessage(error)))
                              .finally(() => setActing(null));
                          }}
                        >
                          收回
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
            <AuditLog recordId={id} revision={auditRevision} />
          </aside>
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} labelledBy="delete-record-title">
        <p id="delete-record-title">删除后无法恢复，确定要删除这条记录吗？</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" tone="tertiary" onClick={() => setConfirmDelete(false)} disabled={acting === "delete"}>
            取消
          </Button>
          <Button
            type="button"
            tone="danger"
            busy={acting === "delete"}
            onClick={() => {
              if (acting) return;
              setActing("delete");
              void api
                .deleteRecord(id)
                .then(() => navigate("/vault", VT))
                .catch((error) => {
                  setErr(errorMessage(error));
                  setActing(null);
                });
            }}
          >
            删除
          </Button>
        </div>
      </Modal>
    </article>
  );
}

function RecordDetailSkeleton() {
  return (
    <LoadingRegion className="mt-4">
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-elev-2">
        <header className="flex gap-3 border-b border-line px-6 py-5">
          <Skeleton className="h-11 w-11 shrink-0 rounded-tile" />
          <div className="min-w-0 flex-1">
            <Skeleton className="block h-3 w-16 rounded-sm" />
            <Skeleton className="mt-2 block h-8 w-56 max-w-full rounded-md" />
            <Skeleton className="mt-3 block h-4 w-80 max-w-full rounded-sm" />
          </div>
        </header>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6 px-6 py-5">
            <Skeleton className="block h-14 w-full rounded-box" />
            <div className="space-y-4">
              <div>
                <Skeleton className="block h-4 w-20 rounded-sm" />
                <Skeleton className="mt-2 block h-10 w-full rounded-box" />
              </div>
              <div>
                <Skeleton className="block h-4 w-16 rounded-sm" />
                <Skeleton className="mt-2 block h-10 w-full rounded-box" />
              </div>
              <div>
                <Skeleton className="block h-4 w-24 rounded-sm" />
                <Skeleton className="mt-2 block h-16 w-full rounded-box" />
              </div>
            </div>
          </div>
          <aside className="space-y-8 border-t border-line px-5 py-5 lg:border-t-0 lg:border-l">
            <section>
              <h2 className="text-[12px] tracking-[0.08em] text-tertiary">时间</h2>
              <Skeleton className="mt-3 block h-4 w-40 rounded-sm" />
              <Skeleton className="mt-2 block h-4 w-36 rounded-sm" />
            </section>
            <section>
              <h2 className="text-[12px] tracking-[0.08em] text-tertiary">操作记录</h2>
              <div className="mt-3 space-y-3">
                <Skeleton className="block h-4 w-16 rounded-sm" />
                <Skeleton className="block h-3 w-40 rounded-sm" />
                <Skeleton className="block h-4 w-14 rounded-sm" />
                <Skeleton className="block h-3 w-44 rounded-sm" />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </LoadingRegion>
  );
}
