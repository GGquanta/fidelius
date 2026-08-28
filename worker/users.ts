import { decryptJson, encryptJson, importMasterKey, randomBytes, timingSafeEqual } from "./crypto";
import { consumeRecoveryCode, countRecoveryRemaining, issueRecoveryCodes } from "./recovery";
import { isDevTotpBypass, newTotpSecret, otpauthUrl, verifyTotpOrBypass } from "./totp";
import {
  ApiError,
  ENROLL_TTL_SECONDS,
  TOTP_FAIL_LIMIT,
  TOTP_LOCK_SECONDS,
  UNLOCK_TTL_SECONDS,
  USER_LIMIT,
  getJson,
  keys,
  normalizeEmail,
  nowIso,
  putJson,
  type User,
  type UsersMeta,
} from "./types";

interface TotpPayload {
  secret: string;
  confirmedAt?: string;
}

interface UnlockSession {
  token: string;
  exp: number;
}

interface Lockout {
  fails: number;
  until?: number;
}

function newId(): string {
  return crypto.randomUUID();
}

export async function getUsersMeta(env: Env): Promise<UsersMeta> {
  return (await getJson<UsersMeta>(env.FIDELIUS, keys.usersMeta)) ?? { ids: [], count: 0 };
}

export async function getUser(env: Env, id: string): Promise<User | null> {
  return getJson<User>(env.FIDELIUS, keys.user(id));
}

export async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  const lookup = await getJson<{ userId: string }>(
    env.FIDELIUS,
    keys.userEmail(normalizeEmail(email)),
  );
  if (!lookup) return null;
  return getUser(env, lookup.userId);
}

async function saveUser(env: Env, user: User): Promise<void> {
  await putJson(env.FIDELIUS, keys.user(user.id), user);
}

export async function resolveOrBootstrapUser(env: Env, email: string): Promise<User | null> {
  const existing = await getUserByEmail(env, email);
  if (existing) return existing;

  const meta = await getUsersMeta(env);
  const bootstrap = normalizeEmail(env.BOOTSTRAP_ADMIN_EMAIL);
  if (meta.count === 0 && bootstrap && email === bootstrap) {
    return createUser(env, {
      email,
      displayName: email.split("@")[0] || "管理员",
      role: "admin",
    });
  }
  return null;
}

export async function listUsers(env: Env): Promise<User[]> {
  const meta = await getUsersMeta(env);
  if (meta.ids.length === 0) return [];
  const values = await Promise.all(meta.ids.map((id) => env.FIDELIUS.get(keys.user(id))));
  const users: User[] = [];
  for (const value of values) {
    if (value) users.push(JSON.parse(value) as User);
  }
  return users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createUser(
  env: Env,
  input: { email: string; displayName: string; role: User["role"] },
): Promise<User> {
  const email = normalizeEmail(input.email);
  if (!email.includes("@")) throw new ApiError(400, "validation", "邮箱无效");
  if (!input.displayName.trim()) throw new ApiError(400, "validation", "显示名不能为空");
  if (await getUserByEmail(env, email)) {
    throw new ApiError(409, "validation", "该邮箱已添加");
  }

  const meta = await getUsersMeta(env);
  const occupied = (await listUsers(env)).filter((u) => u.status !== "disabled").length;
  if (occupied >= USER_LIMIT) {
    throw new ApiError(400, "user_limit", "成员已达上限 10 人");
  }

  const timestamp = nowIso();
  const user: User = {
    id: newId(),
    email,
    displayName: input.displayName.trim(),
    role: input.role,
    status: "pending_enroll",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  meta.ids.push(user.id);
  meta.count = meta.ids.length;
  await saveUser(env, user);
  await putJson(env.FIDELIUS, keys.userEmail(email), { userId: user.id });
  await putJson(env.FIDELIUS, keys.usersMeta, meta);
  return user;
}

export async function disableUser(env: Env, id: string, actor: User): Promise<User> {
  if (actor.id === id) throw new ApiError(400, "validation", "不能停用自己");
  const user = await getUser(env, id);
  if (!user) throw new ApiError(404, "not_found", "用户不存在");
  const owned = await getJson<{ recordIds: string[] }>(env.FIDELIUS, keys.ownerIndex(id));
  if (owned?.recordIds.length) {
    throw new ApiError(400, "user_has_records", "请先删除该成员名下的记录");
  }
  user.status = "disabled";
  user.updatedAt = nowIso();
  await saveUser(env, user);
  await env.FIDELIUS.delete(keys.unlock(id));
  await env.FIDELIUS.delete(keys.recovery(id));
  return user;
}

const DISPLAY_NAME_MAX = 32;

export async function updateDisplayName(env: Env, user: User, displayName: string): Promise<User> {
  const name = displayName.trim();
  if (!name) throw new ApiError(400, "validation", "显示名不能为空");
  if (name.length > DISPLAY_NAME_MAX) throw new ApiError(400, "validation", "显示名最多 32 个字符");
  if (name === user.displayName) return user;
  user.displayName = name;
  user.updatedAt = nowIso();
  await saveUser(env, user);
  return user;
}

export async function startEnroll(
  env: Env,
  user: User,
): Promise<{ otpauth: string; secret: string }> {
  if (user.status === "disabled") throw new ApiError(403, "disabled", "账号已停用");
  if (user.status === "active") throw new ApiError(400, "validation", "已完成绑定");

  const master = await importMasterKey(env.MASTER_KEY);
  const existing = await env.FIDELIUS.get(keys.enroll(user.id));
  if (existing) {
    const payload = await decryptJson<TotpPayload>(master, existing);
    return { otpauth: otpauthUrl(user.email, payload.secret), secret: payload.secret };
  }
  const secret = newTotpSecret();
  await env.FIDELIUS.put(keys.enroll(user.id), await encryptJson(master, { secret } satisfies TotpPayload), {
    expirationTtl: ENROLL_TTL_SECONDS,
  });
  return { otpauth: otpauthUrl(user.email, secret), secret };
}

export async function confirmEnroll(
  env: Env,
  user: User,
  code: string,
): Promise<{ user: User; recoveryCodes: string[] }> {
  if (user.status === "disabled") throw new ApiError(403, "disabled", "账号已停用");
  if (user.status === "active") throw new ApiError(400, "validation", "已完成绑定");

  const master = await importMasterKey(env.MASTER_KEY);
  const packed = await env.FIDELIUS.get(keys.enroll(user.id));
  if (!packed) throw new ApiError(400, "validation", "请先开始绑定");
  const payload = await decryptJson<TotpPayload>(master, packed);
  if (!(await verifyTotpOrBypass(env, payload.secret, code))) {
    throw new ApiError(400, "totp_invalid", "验证码不正确");
  }

  payload.confirmedAt = nowIso();
  const recoveryCodes = await issueRecoveryCodes(env, user.id, master);
  await env.FIDELIUS.put(keys.totp(user.id), await encryptJson(master, payload));
  await env.FIDELIUS.delete(keys.enroll(user.id));
  user.status = "active";
  user.updatedAt = nowIso();
  await saveUser(env, user);
  return { user, recoveryCodes };
}

async function readLockout(env: Env, userId: string): Promise<Lockout> {
  return (await getJson<Lockout>(env.FIDELIUS, keys.lockout(userId))) ?? { fails: 0 };
}

async function enforceLockout(env: Env, userId: string): Promise<Lockout> {
  const lockout = await readLockout(env, userId);
  if (lockout.until && lockout.until > Date.now()) {
    throw new ApiError(429, "totp_locked", "验证已锁定，请稍后再试");
  }
  return lockout;
}

async function recordTotpFailure(env: Env, userId: string, lockout: Lockout): Promise<never> {
  const fails = lockout.fails + 1;
  const next: Lockout = {
    fails,
    until: fails >= TOTP_FAIL_LIMIT ? Date.now() + TOTP_LOCK_SECONDS * 1000 : undefined,
  };
  await putJson(env.FIDELIUS, keys.lockout(userId), next, {
    expirationTtl: TOTP_LOCK_SECONDS,
  });
  if (next.until) throw new ApiError(429, "totp_locked", "验证已锁定，请稍后再试");
  throw new ApiError(400, "totp_invalid", "验证码或恢复码不正确");
}

async function verifyCurrentTotp(env: Env, user: User, code: string): Promise<void> {
  if (isDevTotpBypass(env, code)) {
    await env.FIDELIUS.delete(keys.lockout(user.id));
    return;
  }
  const lockout = await enforceLockout(env, user.id);
  const master = await importMasterKey(env.MASTER_KEY);
  const packed = await env.FIDELIUS.get(keys.totp(user.id));
  if (!packed) throw new ApiError(400, "validation", "未找到验证器信息");
  const payload = await decryptJson<TotpPayload>(master, packed);
  if (!(await verifyTotpOrBypass(env, payload.secret, code))) {
    await recordTotpFailure(env, user.id, lockout);
  }
  await env.FIDELIUS.delete(keys.lockout(user.id));
}

export async function verifyCurrentFactor(
  env: Env,
  user: User,
  input: { code?: string; recoveryCode?: string },
): Promise<void> {
  const recoveryCode = input.recoveryCode?.trim() || "";
  const code = input.code?.trim() || "";
  if (recoveryCode) {
    const lockout = await enforceLockout(env, user.id);
    const master = await importMasterKey(env.MASTER_KEY);
    if (!(await consumeRecoveryCode(env, user.id, master, recoveryCode))) {
      await recordTotpFailure(env, user.id, lockout);
    }
    await env.FIDELIUS.delete(keys.lockout(user.id));
    return;
  }
  if (/^\d{6}$/.test(code)) {
    await verifyCurrentTotp(env, user, code);
    return;
  }
  if (code) {
    const lockout = await enforceLockout(env, user.id);
    const master = await importMasterKey(env.MASTER_KEY);
    if (!(await consumeRecoveryCode(env, user.id, master, code))) {
      await recordTotpFailure(env, user.id, lockout);
    }
    await env.FIDELIUS.delete(keys.lockout(user.id));
    return;
  }
  throw new ApiError(400, "validation", "请填写验证码或恢复码");
}

export async function startResetEnroll(
  env: Env,
  user: User,
  input: { code?: string; recoveryCode?: string },
): Promise<{ otpauth: string; secret: string }> {
  if (user.status !== "active") throw new ApiError(403, "pending_enroll", "请先绑定验证器");
  await verifyCurrentFactor(env, user, input);

  const master = await importMasterKey(env.MASTER_KEY);
  const existing = await env.FIDELIUS.get(keys.enroll(user.id));
  if (existing) {
    const payload = await decryptJson<TotpPayload>(master, existing);
    return { otpauth: otpauthUrl(user.email, payload.secret), secret: payload.secret };
  }
  const secret = newTotpSecret();
  await env.FIDELIUS.put(keys.enroll(user.id), await encryptJson(master, { secret } satisfies TotpPayload), {
    expirationTtl: ENROLL_TTL_SECONDS,
  });
  return { otpauth: otpauthUrl(user.email, secret), secret };
}

export async function confirmResetEnroll(
  env: Env,
  user: User,
  code: string,
): Promise<{ user: User; recoveryCodes: string[] }> {
  if (user.status !== "active") throw new ApiError(403, "pending_enroll", "请先绑定验证器");

  const master = await importMasterKey(env.MASTER_KEY);
  const packed = await env.FIDELIUS.get(keys.enroll(user.id));
  if (!packed) throw new ApiError(400, "validation", "请先开始更换验证器");
  const payload = await decryptJson<TotpPayload>(master, packed);
  if (!(await verifyTotpOrBypass(env, payload.secret, code))) {
    throw new ApiError(400, "totp_invalid", "验证码不正确");
  }

  payload.confirmedAt = nowIso();
  const recoveryCodes = await issueRecoveryCodes(env, user.id, master);
  await env.FIDELIUS.put(keys.totp(user.id), await encryptJson(master, payload));
  await env.FIDELIUS.delete(keys.enroll(user.id));
  await env.FIDELIUS.delete(keys.lockout(user.id));
  await lock(env, user.id);
  user.updatedAt = nowIso();
  await saveUser(env, user);
  return { user, recoveryCodes };
}

export async function regenerateRecoveryCodes(env: Env, user: User, code: string): Promise<string[]> {
  if (user.status !== "active") throw new ApiError(403, "pending_enroll", "请先绑定验证器");
  await verifyCurrentTotp(env, user, code);
  const master = await importMasterKey(env.MASTER_KEY);
  return issueRecoveryCodes(env, user.id, master);
}

export async function remainingRecoveryCodes(env: Env, userId: string): Promise<number> {
  try {
    const master = await importMasterKey(env.MASTER_KEY);
    return countRecoveryRemaining(env, userId, master);
  } catch {
    return 0;
  }
}

export async function unlock(
  env: Env,
  user: User,
  input: { code?: string; recoveryCode?: string },
): Promise<{ token: string; exp: number }> {
  if (user.status !== "active") throw new ApiError(403, "pending_enroll", "请先绑定验证器");
  await verifyCurrentFactor(env, user, input);

  const token = [...randomBytes(32)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const session: UnlockSession = { token, exp: Date.now() + UNLOCK_TTL_SECONDS * 1000 };
  await putJson(env.FIDELIUS, keys.unlock(user.id), session, {
    expirationTtl: UNLOCK_TTL_SECONDS,
  });
  return session;
}

export async function lock(env: Env, userId: string): Promise<void> {
  await env.FIDELIUS.delete(keys.unlock(userId));
}

export async function getUnlockExpiresAt(
  env: Env,
  userId: string,
  token: string | undefined,
): Promise<number | null> {
  if (!token) return null;
  const session = await getJson<UnlockSession>(env.FIDELIUS, keys.unlock(userId));
  if (!session || session.exp < Date.now()) return null;
  if (!timingSafeEqual(session.token, token)) return null;
  return session.exp;
}

export async function isUnlocked(env: Env, userId: string, token: string | undefined): Promise<boolean> {
  return (await getUnlockExpiresAt(env, userId, token)) !== null;
}

export function parseUnlockCookie(cookieHeader: string | undefined, userId: string): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const match = parts.find((p) => p.startsWith("fidelius_unlock="));
  if (!match) return undefined;
  const value = decodeURIComponent(match.slice("fidelius_unlock=".length));
  const [id, token] = value.split(".");
  if (id !== userId || !token) return undefined;
  return token;
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

