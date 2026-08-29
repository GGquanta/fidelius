import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  idleRemainingSeconds,
  parseSettings,
  shouldLockOnHide,
} from "../src/settings";

describe("parseSettings", () => {
  it("returns defaults for null, empty, and invalid JSON", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("{")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("null")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("[]")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("true")).toEqual(DEFAULT_SETTINGS);
  });

  it("fills missing keys and rejects illegal durations", () => {
    expect(parseSettings("{}")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"autoLockEnabled":false}')).toEqual({
      ...DEFAULT_SETTINGS,
      autoLockEnabled: false,
    });
    expect(parseSettings('{"autoLockSeconds":15,"lockOnHide":true}')).toEqual({
      ...DEFAULT_SETTINGS,
      autoLockSeconds: 15,
      lockOnHide: true,
    });
    expect(DEFAULT_SETTINGS.lockOnHide).toBe(false);
    expect(parseSettings("{}").lockOnHide).toBe(false);
    expect(parseSettings('{"autoLockSeconds":45}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"autoLockSeconds":"30","autoLockEnabled":"yes"}')).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps a full valid payload", () => {
    expect(
      parseSettings('{"autoLockEnabled":false,"autoLockSeconds":60,"lockOnHide":false}'),
    ).toEqual({
      autoLockEnabled: false,
      autoLockSeconds: 60,
      lockOnHide: false,
    });
  });
});

describe("lock countdown", () => {
  it("counts down from a start time and is not affected by later activity", () => {
    const start = 1_000_000;
    expect(idleRemainingSeconds(start, start, 30)).toBe(30);
    expect(idleRemainingSeconds(start, start + 29_001, 30)).toBe(1);
    expect(idleRemainingSeconds(start, start + 30_000, 30)).toBe(0);
    expect(idleRemainingSeconds(start, start + 45_000, 15)).toBe(0);
  });
});

describe("lock on hide", () => {
  it("locks when the tab is hidden or the window blurs, and ignores both when disabled", () => {
    expect(shouldLockOnHide("hidden", false, true)).toBe(true);
    expect(shouldLockOnHide("visible", true, true)).toBe(true);
    expect(shouldLockOnHide("visible", false, true)).toBe(false);
    expect(shouldLockOnHide("hidden", true, false)).toBe(false);
    expect(shouldLockOnHide("visible", true, false)).toBe(false);
  });
});
