import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { ApiError, normalizeEmail } from "./types";

interface AccessBinding {
  getIdentity(): Promise<{ email?: string } | null>;
}

const ACCESS_ISS = /^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.cloudflareaccess\.com$/i;

function normalizeTeamDomain(value: string): string {
  const raw = value.trim().replace(/\/$/, "");
  if (!raw) return "";
  if (raw.startsWith("https://") || raw.startsWith("http://")) return raw;
  return `https://${raw}`;
}

function configuredAud(env: Env): string {
  return String(env.ACCESS_AUD ?? "").trim();
}

function configuredIssuer(env: Env): string {
  return normalizeTeamDomain(String(env.TEAM_DOMAIN ?? ""));
}

async function emailFromAccessJwt(request: Request, env: Env): Promise<string | null> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return null;

  let claimedIss = "";
  try {
    const claims = decodeJwt(token);
    claimedIss = typeof claims.iss === "string" ? claims.iss.replace(/\/$/, "") : "";
  } catch {
    return null;
  }

  const issuer = ACCESS_ISS.test(claimedIss) ? claimedIss : configuredIssuer(env);
  if (!ACCESS_ISS.test(issuer)) return null;

  const configuredIss = configuredIssuer(env);
  const expectedIss = ACCESS_ISS.test(configuredIss) ? configuredIss : "";
  if (expectedIss && expectedIss !== issuer) return null;

  const audience = configuredAud(env);
  try {
    const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(
      token,
      jwks,
      audience ? { issuer, audience } : { issuer },
    );
    const email = typeof payload.email === "string" ? payload.email : "";
    return email ? normalizeEmail(email) : null;
  } catch {
    return null;
  }
}

export async function resolveEmail(
  request: Request,
  env: Env,
  ctx: { access?: AccessBinding },
): Promise<string> {
  const environment = String(env.ENVIRONMENT);
  if (environment === "test") {
    const testEmail = request.headers.get("X-Test-Email");
    if (testEmail) return normalizeEmail(testEmail);
  }

  const access = ctx.access;
  if (access) {
    const identity = await access.getIdentity();
    if (identity?.email) return normalizeEmail(identity.email);
  }

  const jwtEmail = await emailFromAccessJwt(request, env);
  if (jwtEmail) return jwtEmail;

  if (environment !== "production") {
    return normalizeEmail(env.BOOTSTRAP_ADMIN_EMAIL);
  }

  console.info(
    JSON.stringify({
      msg: "unauthenticated",
      code: "access_jwt",
      hasJwt: Boolean(request.headers.get("Cf-Access-Jwt-Assertion")),
      hasTeamVar: Boolean(configuredIssuer(env)),
      hasAudVar: Boolean(configuredAud(env)),
    }),
  );
  throw new ApiError(401, "unauthenticated", "无法验证身份");
}
