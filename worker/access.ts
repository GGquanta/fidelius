import { createRemoteJWKSet, jwtVerify } from "jose";
import { ApiError, normalizeEmail } from "./types";

interface AccessBinding {
  getIdentity(): Promise<{ email?: string } | null>;
}

function teamDomain(env: Env): string {
  const raw = String(env.TEAM_DOMAIN ?? "").trim().replace(/\/$/, "");
  if (!raw) return "";
  if (raw.startsWith("https://") || raw.startsWith("http://")) return raw;
  return `https://${raw}`;
}

function accessAud(env: Env): string {
  return String(env.ACCESS_AUD ?? "").trim();
}

async function emailFromAccessJwt(request: Request, env: Env): Promise<string | null> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  const issuer = teamDomain(env);
  const audience = accessAud(env);
  if (!token || !issuer || !audience) return null;

  try {
    const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(token, jwks, { issuer, audience });
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

  throw new ApiError(401, "unauthenticated", "无法验证身份");
}
