import { describe, expect, it } from "vitest";
import { isDevTotpBypass, newTotpSecret, verifyTotp, verifyTotpOrBypass } from "../worker/totp";

function env(overrides: Record<string, unknown> = {}): Env {
  return {
    ENVIRONMENT: "development",
    MASTER_KEY: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=",
    BOOTSTRAP_ADMIN_EMAIL: "admin@example.com",
    FIDELIUS: {} as KVNamespace,
    ASSETS: { fetch: async () => new Response(null) },
    ...overrides,
  } as unknown as Env;
}

describe("dev totp bypass", () => {
  it("accepts 000000 only when DEV_TOTP_BYPASS is set and not production", async () => {
    expect(isDevTotpBypass(env(), "000000")).toBe(false);
    expect(isDevTotpBypass(env({ DEV_TOTP_BYPASS: "" }), "000000")).toBe(false);
    expect(isDevTotpBypass(env({ DEV_TOTP_BYPASS: "1" }), "000000")).toBe(true);
    expect(isDevTotpBypass(env({ DEV_TOTP_BYPASS: "1" }), "123456")).toBe(false);
    expect(isDevTotpBypass(env({ ENVIRONMENT: "test", DEV_TOTP_BYPASS: "1" }), "000000")).toBe(true);
    expect(
      isDevTotpBypass(env({ ENVIRONMENT: "production", DEV_TOTP_BYPASS: "1" }), "000000"),
    ).toBe(false);

    const secret = newTotpSecret();
    expect(await verifyTotpOrBypass(env({ DEV_TOTP_BYPASS: "1" }), secret, "000000")).toBe(true);
    expect(await verifyTotpOrBypass(env(), secret, "000000")).toBe(false);
    expect(
      await verifyTotpOrBypass(env({ ENVIRONMENT: "production", DEV_TOTP_BYPASS: "1" }), secret, "000000"),
    ).toBe(false);
    expect(await verifyTotp(secret, "000000")).toBe(false);
  });
});
