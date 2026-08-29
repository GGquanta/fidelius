export const SETTINGS_KEY = "fidelius-settings";

export const AUTO_LOCK_SECONDS = [15, 30, 60] as const;
export type AutoLockSeconds = (typeof AUTO_LOCK_SECONDS)[number];

export type Settings = {
  autoLockEnabled: boolean;
  autoLockSeconds: AutoLockSeconds;
  lockOnHide: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  autoLockEnabled: true,
  autoLockSeconds: 30,
  lockOnHide: false,
};

function isAutoLockSeconds(value: unknown): value is AutoLockSeconds {
  return value === 15 || value === 30 || value === 60;
}

export function parseSettings(raw: string | null): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return { ...DEFAULT_SETTINGS };
    const record = data as Record<string, unknown>;
    return {
      autoLockEnabled:
        typeof record.autoLockEnabled === "boolean" ? record.autoLockEnabled : DEFAULT_SETTINGS.autoLockEnabled,
      autoLockSeconds: isAutoLockSeconds(record.autoLockSeconds)
        ? record.autoLockSeconds
        : DEFAULT_SETTINGS.autoLockSeconds,
      lockOnHide: typeof record.lockOnHide === "boolean" ? record.lockOnHide : DEFAULT_SETTINGS.lockOnHide,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function idleRemainingSeconds(lastActivityAt: number, now: number, durationSeconds: number): number {
  return Math.max(0, Math.ceil((lastActivityAt + durationSeconds * 1000 - now) / 1000));
}

export function shouldLockOnHide(visibilityState: string, windowBlurred: boolean, enabled: boolean): boolean {
  if (!enabled) return false;
  return visibilityState === "hidden" || windowBlurred;
}
