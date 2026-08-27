import { useRef } from "react";

export function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function setAt(index: number, char: string) {
    const next = digits.map((d, i) => (i === index ? char : d)).join("").replace(/\D/g, "").slice(0, 6);
    onChange(next);
  }

  return (
    <div className="flex gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          inputMode="numeric"
          maxLength={6}
          disabled={disabled}
          value={digit}
          aria-label={`第 ${index + 1} 位`}
          onChange={(event) => {
            const raw = event.target.value.replace(/\D/g, "");
            if (raw.length > 1) {
              onChange(raw.slice(0, 6));
              refs.current[Math.min(raw.length, 5)]?.focus();
              return;
            }
            setAt(index, raw);
            if (raw) refs.current[index + 1]?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index] && index > 0) {
              refs.current[index - 1]?.focus();
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            onChange(pasted);
            refs.current[Math.min(pasted.length, 5)]?.focus();
          }}
          className="h-12 min-w-0 flex-1 rounded-box border border-line bg-surface text-center font-mono text-lg outline-none focus:border-accent"
        />
      ))}
    </div>
  );
}
