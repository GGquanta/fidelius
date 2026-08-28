import { Plus } from "@phosphor-icons/react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Category, type RecordField } from "../api";
import { BackLink } from "../components/BackLink";
import { Button } from "../components/Button";
import { CategoryIcon } from "../components/CategoryIcon";
import { SensitiveUnlock } from "../components/UnlockPanel";
import { errorMessage, useSession } from "../session";
import { CATEGORIES, TEMPLATE_HINT, fieldsFromTemplate } from "../templates";
import { useToast } from "../ui";

function emptyCustom(): RecordField {
  return { key: "", label: "", type: "secret", value: "" };
}

export function RecordFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { unlocked } = useSession();
  const toast = useToast();
  const editing = Boolean(id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("login");
  const [fields, setFields] = useState<RecordField[]>(fieldsFromTemplate("login"));
  const [custom, setCustom] = useState<RecordField[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const meta = await api.record(id);
        setTitle(meta.record.title);
        setDescription(meta.record.description);
        setCategory(meta.record.category);
        if (!unlocked) {
          setErr("");
          setFields(meta.record.fieldMeta.map((f) => ({ ...f, value: "" })));
          setLoading(false);
          return;
        }
        const revealed = await api.reveal(id);
        const templateKeys = new Set(fieldsFromTemplate(meta.record.category).map((f) => f.key));
        setFields(
          fieldsFromTemplate(meta.record.category).map((field) => ({
            ...field,
            value: revealed.record.fields.find((f) => f.key === field.key)?.value ?? "",
          })),
        );
        setCustom(
          revealed.record.fields
            .filter((f) => !templateKeys.has(f.key))
            .map((f) => ({ ...f })),
        );
      } catch (error) {
        setErr(errorMessage(error));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, unlocked]);

  function changeCategory(next: Category) {
    if (editing) return;
    setCategory(next);
    setFields(fieldsFromTemplate(next));
    setCustom([]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErr("");
    const extra = custom
      .filter((f) => f.key.trim() && f.label.trim())
      .map((f) => ({ ...f, key: f.key.trim().toLowerCase().replace(/\s+/g, "_") }));
    const payload = {
      title,
      description,
      category,
      fields: [...fields, ...extra],
    };
    try {
      const result = editing && id ? await api.updateRecord(id, payload) : await api.createRecord(payload);
      navigate(`/records/${result.record.id}`);
    } catch (error) {
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto w-full max-w-[960px] px-6 py-6">
      <BackLink to={editing && id ? `/records/${id}` : "/vault"} label={editing ? "返回记录" : "返回保险库"} />
      <div className="mt-4 rounded-xl border border-line bg-surface px-6 py-6">
        <h1 className="font-display text-3xl tracking-tight">{editing ? "编辑记录" : "新建记录"}</h1>
        {loading ? <p className="mt-8 text-muted">加载中</p> : null}
        {editing ? (
          <div className="mt-6">
            <SensitiveUnlock onToast={toast} />
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
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CATEGORIES.filter((item) => item.id !== "all").map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={editing}
              onClick={() => changeCategory(item.id as Category)}
              className={`flex items-center gap-2 rounded-box border px-3 py-2 text-left text-sm ${
                category === item.id ? "border-accent bg-accent-soft" : "border-line bg-canvas"
              }`}
            >
              <CategoryIcon category={item.id} size={28} />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
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
          className="mt-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
          onClick={() => setCustom((current) => [...current, emptyCustom()])}
        >
          <Plus size={14} />
          添加字段
        </button>
        {err ? <p className="mt-4 text-sm text-danger">{err}</p> : null}
        <div className="mt-8 flex gap-3">
          <Button type="submit" disabled={busy || (editing && !unlocked)}>
            保存
          </Button>
          <Button type="button" tone="tertiary" onClick={() => navigate(-1)}>
            取消
          </Button>
        </div>
      </div>
    </form>
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
