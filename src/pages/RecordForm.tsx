import { LockSimple, Plus } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, type Category, type RecordField } from "../api";
import { BackLink } from "../components/BackLink";
import { Button } from "../components/Button";
import { CategoryIcon } from "../components/CategoryIcon";
import { LoadingRegion, Skeleton } from "../components/Skeleton";
import { SensitiveUnlock } from "../components/UnlockPanel";
import { VT } from "../fx";
import { errorMessage, useSession } from "../session";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  TEMPLATE_HINT,
  fieldsFromTemplate,
  parseCategoryParam,
} from "../templates";
import { useToast } from "../ui";

function emptyCustom(): RecordField {
  return { key: "", label: "", type: "secret", value: "" };
}

function applyRevealedFields(
  category: Category,
  revealed: RecordField[],
  setFields: (fields: RecordField[]) => void,
  setCustom: (fields: RecordField[]) => void,
) {
  const templateKeys = new Set(fieldsFromTemplate(category).map((f) => f.key));
  setFields(
    fieldsFromTemplate(category).map((field) => ({
      ...field,
      value: revealed.find((item) => item.key === field.key)?.value ?? "",
    })),
  );
  setCustom(revealed.filter((field) => !templateKeys.has(field.key)).map((field) => ({ ...field })));
}

export function RecordFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { unlocked } = useSession();
  const toast = useToast();
  const editing = Boolean(id);
  const preset = editing ? "generic" : parseCategoryParam(params.get("category"));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>(preset);
  const [fields, setFields] = useState<RecordField[]>(() => fieldsFromTemplate(preset));
  const [custom, setCustom] = useState<RecordField[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);
  const loadedIdRef = useRef<string | null>(null);
  const categoryQuery = params.get("category");

  useEffect(() => {
    if (editing) return;
    const next = parseCategoryParam(categoryQuery);
    setCategory(next);
    setFields(fieldsFromTemplate(next));
    setCustom([]);
  }, [editing, categoryQuery]);

  useEffect(() => {
    loadedIdRef.current = null;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const hydrateMeta = loadedIdRef.current !== id;
    if (hydrateMeta) setLoading(true);
    void (async () => {
      try {
        if (!unlocked) {
          if (hydrateMeta) {
            const meta = await api.record(id);
            if (cancelled) return;
            setTitle(meta.record.title);
            setDescription(meta.record.description);
            setCategory(meta.record.category);
            setFields(meta.record.fieldMeta.map((f) => ({ ...f, value: "" })));
            setCustom([]);
            setErr("");
            loadedIdRef.current = id;
          } else {
            setFields((current) => current.map((field) => ({ ...field, value: "" })));
            setCustom((current) => current.map((field) => ({ ...field, value: "" })));
          }
          return;
        }

        if (hydrateMeta) {
          const [meta, revealed] = await Promise.all([api.record(id), api.reveal(id)]);
          if (cancelled) return;
          setTitle(meta.record.title);
          setDescription(meta.record.description);
          setCategory(meta.record.category);
          applyRevealedFields(meta.record.category, revealed.record.fields, setFields, setCustom);
          setErr("");
          loadedIdRef.current = id;
          return;
        }

        const revealed = await api.reveal(id);
        if (cancelled) return;
        applyRevealedFields(revealed.record.category, revealed.record.fields, setFields, setCustom);
        setErr("");
      } catch (error) {
        if (!cancelled) setErr(errorMessage(error));
      } finally {
        if (!cancelled && hydrateMeta) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, unlocked]);

  function changeCategory(next: Category) {
    if (editing) return;
    setCategory(next);
    setFields(fieldsFromTemplate(next));
    setCustom([]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || loading) return;
    setBusy(true);
    setErr("");
    const extra = custom
      .filter((f) => f.key.trim() && f.label.trim())
      .map((f) => ({ ...f, key: f.key.trim().toLowerCase().replace(/\s+/g, "_") }));
    try {
      const result =
        editing && id
          ? await api.updateRecord(
              id,
              unlocked
                ? { title, description, fields: [...fields, ...extra] }
                : { title, description },
            )
          : await api.createRecord({
              title,
              description,
              category,
              fields: [...fields, ...extra],
            });
      navigate(`/records/${result.record.id}`, VT);
    } catch (error) {
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <BackLink to={editing && id ? `/records/${id}` : "/vault"} label={editing ? "返回记录" : "返回保险库"} />
      <div className="mt-4 rounded-xl border border-line bg-surface px-6 py-6">
        <h1 className="font-display text-3xl tracking-tight">{editing ? "编辑记录" : "新建记录"}</h1>
        {loading ? (
          <RecordFormSkeleton editing={editing} unlocked={unlocked} />
        ) : (
          <>
        {editing ? (
          <div className="mt-6">
            <SensitiveUnlock onToast={toast} sealedHint="敏感字段已封存，开锁后才能改。" />
            <p className="text-xs text-muted">
              {unlocked
                ? "分类创建后不能改。已开锁，保存会写入标题、描述和字段。"
                : "分类创建后不能改。未开锁时保存只提交标题和描述；开锁后才能改字段。"}
            </p>
          </div>
        ) : null}
        <label className="mt-8 block text-xs text-muted">标题</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-2 w-full rounded-box border border-line-strong bg-canvas px-3 py-2 outline-none focus:border-accent"
        />
        <label className="mt-6 block text-xs text-muted">描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-2 w-full resize-y rounded-box border border-line-strong bg-canvas px-3 py-2 outline-none focus:border-accent"
        />
        <p className="mt-6 text-xs text-muted">分类</p>
        {editing ? (
          <div className="mt-2 flex items-center gap-2">
            <CategoryIcon category={category} size={28} />
            <span className="text-sm">{CATEGORY_LABEL[category]}</span>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CATEGORIES.filter((item) => item.id !== "all").map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => changeCategory(item.id as Category)}
                className={`fx-hover flex items-center gap-2 rounded-box border px-3 py-2 text-left text-sm ${
                  category === item.id ? "border-accent bg-accent-soft" : "border-line bg-canvas"
                }`}
              >
                <CategoryIcon category={item.id} size={28} />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        )}
        {editing && !unlocked ? (
          <section className="mt-8">
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl bg-sunken px-10 py-16">
              <LockSimple size={28} className="text-peach" />
              <p className="max-w-[22em] text-center text-sm leading-relaxed text-muted">字段已封存。开锁后才能改。</p>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-8 border-t border-line pt-6">
              <p className="text-xs text-muted">{TEMPLATE_HINT[category]}</p>
              <div className="mt-4 space-y-4">
                {fields.map((field, index) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    onChange={(next) =>
                      setFields((current) => current.map((item, i) => (i === index ? next : item)))
                    }
                  />
                ))}
                {custom.map((field, index) => (
                  <div key={`custom-${index}`} className="rounded-box border border-line p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        placeholder="字段名"
                        value={field.key}
                        onChange={(e) =>
                          setCustom((current) =>
                            current.map((item, i) => (i === index ? { ...item, key: e.target.value } : item)),
                          )
                        }
                        className="rounded-box border border-line-strong bg-canvas px-3 py-2 font-mono text-sm outline-none"
                      />
                      <input
                        placeholder="显示名称"
                        value={field.label}
                        onChange={(e) =>
                          setCustom((current) =>
                            current.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)),
                          )
                        }
                        className="rounded-box border border-line-strong bg-canvas px-3 py-2 outline-none"
                      />
                    </div>
                    <div className="mt-3">
                      <FieldInput
                        field={field}
                        onChange={(next) =>
                          setCustom((current) => current.map((item, i) => (i === index ? next : item)))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <button
              type="button"
              className="fx-hover mt-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
              onClick={() => setCustom((current) => [...current, emptyCustom()])}
            >
              <Plus size={14} />
              添加字段
            </button>
          </>
        )}
        {err ? <p className="mt-4 text-sm text-danger">{err}</p> : null}
        <div className="mt-8 flex gap-3">
          <Button type="submit" busy={busy}>
            保存
          </Button>
          <Button type="button" tone="tertiary" onClick={() => navigate(-1)}>
            取消
          </Button>
        </div>
          </>
        )}
      </div>
    </form>
  );
}

function RecordFormSkeleton({
  editing = false,
  unlocked = false,
}: {
  editing?: boolean;
  unlocked?: boolean;
}) {
  return (
    <LoadingRegion className="mt-8">
      <Skeleton className="block h-4 w-12 rounded-sm" />
      <Skeleton className="mt-2 block h-10 w-full rounded-box" />
      <Skeleton className="mt-6 block h-4 w-12 rounded-sm" />
      <Skeleton className="mt-2 block h-16 w-full rounded-box" />
      <Skeleton className="mt-6 block h-4 w-12 rounded-sm" />
      {editing ? (
        <div className="mt-2 flex items-center gap-2">
          <Skeleton className="block size-7 rounded-tile" />
          <Skeleton className="block h-4 w-24 rounded-sm" />
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton key={index} className="block h-12 w-full rounded-box" />
          ))}
        </div>
      )}
      {editing && !unlocked ? (
        <div className="mt-8 flex min-h-[320px] items-center justify-center rounded-xl bg-sunken">
          <Skeleton className="block h-5 w-48 rounded-sm" />
        </div>
      ) : (
        <div className="mt-8 space-y-4 border-t border-line pt-6">
          <Skeleton className="block h-4 w-40 rounded-sm" />
          <Skeleton className="block h-10 w-full rounded-box" />
          <Skeleton className="block h-4 w-24 rounded-sm" />
          <Skeleton className="block h-10 w-full rounded-box" />
          <Skeleton className="block h-4 w-20 rounded-sm" />
          <Skeleton className="block h-24 w-full rounded-box" />
        </div>
      )}
    </LoadingRegion>
  );
}

function FieldInput({
  field,
  onChange,
}: {
  field: RecordField;
  onChange: (field: RecordField) => void;
}) {
  const multiline = field.type === "multiline";
  return (
    <label className="block">
      <span className="text-xs text-muted">{field.label}</span>
      {multiline ? (
        <textarea
          value={field.value}
          onChange={(e) => onChange({ ...field, value: e.target.value })}
          rows={6}
          className="mt-2 w-full resize-y rounded-box border border-line-strong bg-canvas p-3 font-mono text-sm outline-none focus:border-accent"
        />
      ) : (
        <input
          type={field.type === "secret" ? "password" : "text"}
          value={field.value}
          onChange={(e) => onChange({ ...field, value: e.target.value })}
          className="mt-2 w-full rounded-box border border-line-strong bg-canvas px-3 py-2 font-mono text-sm outline-none focus:border-accent"
        />
      )}
    </label>
  );
}
