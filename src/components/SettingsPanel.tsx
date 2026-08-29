import { Setting } from "reicon-react";
import { AUTO_LOCK_SECONDS, type AutoLockSeconds } from "../settings";
import { useSettings } from "../settings-context";
import { Modal } from "./Modal";
import { Toggle } from "./Toggle";

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update } = useSettings();

  return (
    <Modal open={open} onClose={onClose} labelledBy="settings-title" panelClassName="w-[min(92vw,440px)]">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-tile bg-accent-soft text-accent">
          <Setting size={20} />
        </span>
        <div>
          <h2 id="settings-title" className="text-base font-medium">
            设置
          </h2>
          <p className="text-sm text-muted">只保存在这台浏览器</p>
        </div>
      </div>

      <p className="mt-6 px-1 pb-2 text-[12px] tracking-[0.08em] text-tertiary">安全</p>
      <div className="divide-y divide-line overflow-hidden rounded-lg border border-line">
        <div className="px-4 py-4">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">定时封存</p>
              <p className="mt-1 max-w-[22em] text-[12px] leading-relaxed text-muted">
                开锁后经过所选时长，自动封存敏感字段
              </p>
            </div>
            <Toggle
              checked={settings.autoLockEnabled}
              onChange={(autoLockEnabled) => update({ autoLockEnabled })}
              label="定时封存"
            />
          </div>
          <DurationSlider
            value={settings.autoLockSeconds}
            enabled={settings.autoLockEnabled}
            onChange={(autoLockSeconds) => update({ autoLockSeconds })}
          />
        </div>
        <div className="flex items-start gap-4 px-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink">离开页面时封存</p>
            <p className="mt-1 max-w-[22em] text-[12px] leading-relaxed text-muted">
              切走标签页或窗口失去焦点时立即封存
            </p>
          </div>
          <Toggle
            checked={settings.lockOnHide}
            onChange={(lockOnHide) => update({ lockOnHide })}
            label="离开页面时封存"
          />
        </div>
      </div>
    </Modal>
  );
}

function DurationSlider({
  value,
  enabled,
  onChange,
}: {
  value: AutoLockSeconds;
  enabled: boolean;
  onChange: (seconds: AutoLockSeconds) => void;
}) {
  const index = Math.max(0, AUTO_LOCK_SECONDS.indexOf(value));
  const last = AUTO_LOCK_SECONDS.length - 1;

  return (
    <div className={`mt-4 ${enabled ? "" : "pointer-events-none opacity-40"}`}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full origin-left bg-accent fx-toggle-thumb"
            style={{ transform: `scaleX(${last === 0 ? 1 : index / last})` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={index}
          disabled={!enabled}
          aria-label="封存等待时长"
          aria-valuetext={`${value} 秒`}
          onChange={(event) => onChange(AUTO_LOCK_SECONDS[Number(event.target.value)] ?? value)}
          className="fx-slider relative"
        />
      </div>
      <div className="relative mt-2 h-4">
        {AUTO_LOCK_SECONDS.map((seconds, i) => {
          const selected = i === index;
          const align = i === 0 ? "left-0 text-left" : i === last ? "right-0 text-right" : "left-1/2 -translate-x-1/2 text-center";
          return (
            <button
              key={seconds}
              type="button"
              disabled={!enabled}
              aria-current={selected ? "true" : undefined}
              onClick={() => onChange(seconds)}
              className={`fx-hover absolute top-0 text-[12px] ${align} ${selected ? "text-ink" : "text-tertiary hover:text-muted"}`}
            >
              {seconds} 秒
            </button>
          );
        })}
      </div>
    </div>
  );
}
