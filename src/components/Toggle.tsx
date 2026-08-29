export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`fx-hover relative h-5 w-8 shrink-0 rounded-full ${checked ? "bg-accent" : "bg-sunken"}`}
    >
      <span
        aria-hidden
        className="absolute top-0.5 left-0.5 block h-4 w-4 rounded-full bg-white shadow-elev-1 fx-toggle-thumb"
        style={{ transform: checked ? "translateX(12px)" : "translateX(0)" }}
      />
    </button>
  );
}
