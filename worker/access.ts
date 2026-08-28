import { ApiError, normalizeEmail } from "./types";

interface AccessBinding {
  getIdentity(): Promise<{ email?: string } | null>;
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

  if (environment !== "production") {
    return normalizeEmail(env.BOOTSTRAP_ADMIN_EMAIL);
  }

  throw new ApiError(401, "unauthenticated", "无法验证身份");
}
