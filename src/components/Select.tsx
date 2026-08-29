import { AngleDown, Check } from "reicon-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";

export type SelectOption = {
  id: string;
  label: string;
  hint?: string;
};

export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  showInitial,
}: {
  value: string;
  onChange: (id: string) => void;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
  showInitial?: boolean;
}) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, up: false });

  const selected = options.find((item) => item.id === value);
  const blocked = disabled || options.length === 0;

  function place() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuH = Math.min(options.length * 44 + 8, 240);
    const gap = 4;
    const up = window.innerHeight - rect.bottom < menuH + 12 && rect.top > menuH + 12;
    setPos({
      top: up ? rect.top - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      up,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    const index = Math.max(
      0,
      options.findIndex((item) => item.id === value),
    );
    setActive(index);
    place();
    menuRef.current?.focus();
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onReposition() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = menuRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKey(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (blocked) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onMenuKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((n) => Math.min(options.length - 1, n + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((n) => Math.max(0, n - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const item = options[active];
      if (item) pick(item.id);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={blocked}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (blocked) return;
          setOpen((v) => !v);
        }}
        onKeyDown={onTriggerKey}
        className={`fx-hover flex h-full w-full items-center gap-2 rounded-box border bg-canvas px-3 py-2 text-left text-sm leading-none outline-none ${
          open ? "border-accent" : "border-line-strong"
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? "text-ink" : "text-tertiary"}`}>
          {selected?.label ?? placeholder}
        </span>
        <AngleDown
          size={14}
          className="shrink-0 text-tertiary"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform var(--dur-hover) var(--ease-out)",
          }}
        />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-activedescendant={`${listId}-${options[active]?.id ?? ""}`}
              onKeyDown={onMenuKey}
              className="rise z-40 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-elev-3 outline-none"
              style={{
                position: "fixed",
                top: pos.up ? undefined : pos.top,
                bottom: pos.up ? window.innerHeight - pos.top : undefined,
                left: pos.left,
                width: pos.width,
                maxHeight: 240,
              }}
            >
              {options.map((item, index) => {
                const isSelected = item.id === value;
                const isActive = index === active;
                return (
                  <div
                    key={item.id}
                    id={`${listId}-${item.id}`}
                    role="option"
                    data-index={index}
                    aria-selected={isSelected}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pick(item.id)}
                    className={`flex cursor-pointer items-center gap-2 rounded-box px-2 py-2 ${
                      isActive ? "bg-hover" : ""
                    }`}
                  >
                    {showInitial ? <Initial name={item.label} /> : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{item.label}</span>
                      {item.hint ? (
                        <span className="mt-0.5 block truncate font-mono text-[12px] text-tertiary">
                          {item.hint}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? <Check size={14} className="shrink-0 text-accent" /> : null}
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Initial({ name }: { name: string }) {
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] text-accent-ink">
      {name.slice(0, 1)}
    </span>
  );
}
