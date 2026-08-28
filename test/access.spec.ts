import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { resolveEmail } from "../worker/access";
import { ApiError, normalizeEmail } from "../worker/types";

const TEAM = "https://example.cloudflareaccess.com";
const AUD = "aud-not-real";
const MASTER = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";

function env(overrides: Record<string, unknown> = {}): Env {
  return {
    ENVIRONMENT: "production",
    MASTER_KEY: MASTER,
    BOOTSTRAP_ADMIN_EMAIL: "admin@example.com",
    TEAM_DOMAIN: TEAM,
    ACCESS_AUD: AUD,
    FIDELIUS: {} as KVNamespace,
    ASSETS: { fetch: async () => new Response(null) },
    ...overrides,
  } as unknown as Env;
}

describe("production Access JWT", () => {
  it("normalizeEmail does not throw on missing values", () => {
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail(null)).toBe("");
  });

  it("rejects production requests without Access identity", async () => {
    await expect(
      resolveEmail(new Request("https://fidelius.test/api/me"), env(), {}),
    ).rejects.toMatchObject({ status: 401, code: "unauthenticated" } satisfies Partial<ApiError>);
  });

  it("rejects a forged JWT", async () => {
    await expect(
      resolveEmail(
        new Request("https://fidelius.test/api/me", {
          headers: { "Cf-Access-Jwt-Assertion": "not-a-jwt" },
        }),
        env(),
        {},
      ),
    ).rejects.toMatchObject({ status: 401, code: "unauthenticated" });
  });

  it("ignores a non-Access TEAM_DOMAIN and still reads the JWT", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    jwk.kid = "k1";
    jwk.alg = "RS256";
    jwk.use = "sig";
    const token = await new SignJWT({ email: "Admin@Example.com" })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(TEAM)
      .setAudience(AUD)
      .setExpirationTime("5m")
      .sign(privateKey);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith(`${TEAM}/cdn-cgi/access/certs`)) {
        return Response.json({ keys: [jwk] });
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      const email = await resolveEmail(
        new Request("https://fidelius.test/api/me", {
          headers: { "Cf-Access-Jwt-Assertion": token },
        }),
        env({ TEAM_DOMAIN: "https://fidelius.qubitlab.cc", ACCESS_AUD: undefined }),
        {},
      );
      expect(email).toBe("admin@example.com");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reads email from a valid Access JWT", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    jwk.kid = "k1";
    jwk.alg = "RS256";
    jwk.use = "sig";
    const token = await new SignJWT({ email: "Admin@Example.com" })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(TEAM)
      .setAudience(AUD)
      .setExpirationTime("5m")
      .sign(privateKey);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith(`${TEAM}/cdn-cgi/access/certs`)) {
        return Response.json({ keys: [jwk] });
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      const email = await resolveEmail(
        new Request("https://fidelius.test/api/me", {
          headers: { "Cf-Access-Jwt-Assertion": token },
        }),
        env(),
        {},
      );
      expect(email).toBe("admin@example.com");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
