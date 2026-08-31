import { Hono } from "hono";
import { deleteCookie } from "hono/cookie";
import { resolveEmail } from "./access";
import {
  createRecord,
  deleteRecord,
  getAudit,
  getRecordForUser,
  listRecords,
  revealRecord,
  shareRecord,
  unshareRecord,
  updateRecord,
} from "./records";
import {
  ApiError,
  AUDIT_PAGE_SIZE,
  UNLOCK_COOKIE,
  UNLOCK_TTL_SECONDS,
  USER_LIMIT,
  jsonError,
  type Category,
  type RecordField,
  type User,
} from "./types";
import {
  confirmEnroll,
  confirmResetEnroll,
  createUser,
  disableUser,
  getUnlockExpiresAt,
  listUsers,
  lock,
  parseUnlockCookie,
  publicUser,
  regenerateRecoveryCodes,
  remainingRecoveryCodes,
  resolveOrBootstrapUser,
  startEnroll,
  startResetEnroll,
  unlock,
  updateDisplayName,
} from "./users";

type AppEnv = {
  Bindings: Env;
  Variables: {
    email: string;
    user: User | null;
    unlocked: boolean;
    unlockExpiresAt: number | null;
  };
};

const app = new Hono<AppEnv>();

app.onError((error, c) => {
  if (error instanceof ApiError) return jsonError(error);
  console.error(JSON.stringify({ msg: "unhandled", code: "internal", error: String(error) }));
  return c.json({ error: "服务器错误", code: "internal" }, 500);
});

app.use("/api/*", async (c, next) => {
  const email = await resolveEmail(c.req.raw, c.env, c.executionCtx as { access?: { getIdentity(): Promise<{ email?: string } | null> } });
  const user = await resolveOrBootstrapUser(c.env, email);
  c.set("email", email);
  c.set("user", user);
  const token = user
    ? parseUnlockCookie(c.req.header("Cookie"), user.id)
    : undefined;
  const unlockExpiresAt = user ? await getUnlockExpiresAt(c.env, user.id, token) : null;
  c.set("unlocked", unlockExpiresAt !== null);
  c.set("unlockExpiresAt", unlockExpiresAt);
  await next();
});

function requireUser(c: { get: (key: "user") => User | null }): User {
  const user = c.get("user");
  if (!user) throw new ApiError(403, "not_provisioned", "账号尚未开通，请联系管理员");
  if (user.status === "disabled") throw new ApiError(403, "disabled", "账号已停用");
  return user;
}

function requireActive(c: { get: (key: "user") => User | null }): User {
  const user = requireUser(c);
  if (user.status !== "active") {
    throw new ApiError(403, "pending_enroll", "请先绑定验证器");
  }
  return user;
}

function requireAdmin(c: { get: (key: "user") => User | null }): User {
  const user = requireActive(c);
  if (user.role !== "admin") throw new ApiError(403, "forbidden", "需要管理员权限");
  return user;
}

function requireUnlock(c: { get: (key: "unlocked") => boolean }): void {
  if (!c.get("unlocked")) throw new ApiError(401, "unlock_required", "请先开锁");
}

function setUnlockCookie(
  c: { env: Env; header: (name: string, value: string) => void },
  userId: string,
  token: string,
) {
  c.header(
    "Set-Cookie",
    `${UNLOCK_COOKIE}=${userId}.${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${UNLOCK_TTL_SECONDS}${String(c.env.ENVIRONMENT) === "production" ? "; Secure" : ""}`,
  );
}

app.get("/api/me", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { user: null, email: c.get("email"), unlocked: false, unlockExpiresAt: null, code: "not_provisioned" },
      403,
    );
  }
  if (user.status === "disabled") {
    return c.json({ user: publicUser(user), unlocked: false, unlockExpiresAt: null, recoveryRemaining: 0, code: "disabled" }, 403);
  }
  return c.json({
    user: publicUser(user),
    unlocked: c.get("unlocked"),
    unlockExpiresAt: c.get("unlockExpiresAt"),
    recoveryRemaining: await remainingRecoveryCodes(c.env, user.id),
  });
});

app.patch("/api/me", async (c) => {
  const user = requireActive(c);
  const body = await c.req.json<{ displayName?: string }>();
  const updated = await updateDisplayName(c.env, user, body.displayName ?? "");
  return c.json({ user: publicUser(updated) });
});

app.post("/api/enroll/start", async (c) => {
  const user = requireUser(c);
  const result = await startEnroll(c.env, user);
  return c.json(result);
});

app.post("/api/enroll/confirm", async (c) => {
  const user = requireUser(c);
  const body = await c.req.json<{ code?: string }>();
  const result = await confirmEnroll(c.env, user, body.code ?? "");
  return c.json({ user: publicUser(result.user), recoveryCodes: result.recoveryCodes });
});

app.post("/api/enroll/reset/start", async (c) => {
  const user = requireActive(c);
  const body = await c.req.json<{ code?: string; recoveryCode?: string }>();
  const result = await startResetEnroll(c.env, user, body);
  return c.json(result);
});

app.post("/api/enroll/reset/confirm", async (c) => {
  const user = requireActive(c);
  const body = await c.req.json<{ code?: string }>();
  const result = await confirmResetEnroll(c.env, user, body.code ?? "");
  deleteCookie(c, UNLOCK_COOKIE, { path: "/" });
  return c.json({ user: publicUser(result.user), unlocked: false, recoveryCodes: result.recoveryCodes });
});

app.post("/api/unlock", async (c) => {
  const user = requireActive(c);
  const body = await c.req.json<{ code?: string; recoveryCode?: string }>();
  const session = await unlock(c.env, user, body);
  setUnlockCookie(c, user.id, session.token);
  return c.json({ unlocked: true, unlockExpiresAt: session.exp });
});

app.post("/api/lock", async (c) => {
  const user = requireActive(c);
  await lock(c.env, user.id);
  deleteCookie(c, UNLOCK_COOKIE, { path: "/" });
  return c.json({ unlocked: false });
});

app.post("/api/recovery/regenerate", async (c) => {
  const user = requireActive(c);
  const body = await c.req.json<{ code?: string }>();
  const recoveryCodes = await regenerateRecoveryCodes(c.env, user, body.code ?? "");
  return c.json({ recoveryCodes });
});

app.get("/api/records", async (c) => {
  const user = requireActive(c);
  const category = c.req.query("category") || undefined;
  const q = c.req.query("q") || undefined;
  const records = await listRecords(c.env, user, category, q);
  return c.json({ records });
});

app.post("/api/records", async (c) => {
  const user = requireActive(c);
  const body = await c.req.json<{
    title?: string;
    description?: string;
    category?: Category;
    fields?: RecordField[];
  }>();
  const record = await createRecord(c.env, user, {
    title: body.title ?? "",
    description: body.description ?? "",
    category: body.category ?? "generic",
    fields: body.fields ?? [],
  });
  return c.json({ record }, 201);
});

app.get("/api/records/:id", async (c) => {
  const user = requireActive(c);
  const { record, access } = await getRecordForUser(c.env, user, c.req.param("id"));
  return c.json({
    record: {
      id: record.id,
      title: record.title,
      description: record.description,
      category: record.category,
      ownerId: record.ownerId,
      sharedWith: record.sharedWith,
      fieldMeta: record.fieldMeta,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      access,
    },
  });
});

app.patch("/api/records/:id", async (c) => {
  const user = requireActive(c);
  const body = await c.req.json<{
    title?: string;
    description?: string;
    category?: Category;
    fields?: RecordField[];
  }>();
  const record = await updateRecord(
    c.env,
    user,
    c.req.param("id"),
    {
      title: body.title,
      description: body.description,
      category: body.category,
      fields: body.fields,
    },
    c.get("unlocked"),
  );
  return c.json({ record });
});

app.delete("/api/records/:id", async (c) => {
  const user = requireActive(c);
  await deleteRecord(c.env, user, c.req.param("id"));
  return c.json({ ok: true });
});

app.post("/api/records/:id/reveal", async (c) => {
  const user = requireActive(c);
  requireUnlock(c);
  const record = await revealRecord(c.env, user, c.req.param("id"));
  return c.json({ record });
});

app.post("/api/records/:id/share", async (c) => {
  const user = requireActive(c);
  const body = await c.req.json<{ userId?: string }>();
  if (!body.userId) throw new ApiError(400, "validation", "请选择要分享的成员");
  const record = await shareRecord(c.env, user, c.req.param("id"), body.userId);
  return c.json({ record });
});

app.delete("/api/records/:id/share/:userId", async (c) => {
  const user = requireActive(c);
  const record = await unshareRecord(c.env, user, c.req.param("id"), c.req.param("userId"));
  return c.json({ record });
});

app.get("/api/records/:id/audit", async (c) => {
  const user = requireActive(c);
  const offset = Number.parseInt(c.req.query("offset") ?? "0", 10);
  const limit = Number.parseInt(c.req.query("limit") ?? String(AUDIT_PAGE_SIZE), 10);
  if (!Number.isFinite(offset) || offset < 0 || !Number.isFinite(limit) || limit < 1) {
    throw new ApiError(400, "validation", "分页参数无效");
  }
  const result = await getAudit(c.env, user, c.req.param("id"), offset, limit);
  return c.json(result);
});

app.get("/api/users", async (c) => {
  const user = requireActive(c);
  const users = await listUsers(c.env);
  if (user.role === "admin") {
    return c.json({
      users: users.map(publicUser),
      limit: USER_LIMIT,
      occupied: users.filter((u) => u.status !== "disabled").length,
    });
  }
  return c.json({
    users: users
      .filter((u) => u.status === "active" && u.id !== user.id)
      .map((u) => ({ id: u.id, displayName: u.displayName, email: u.email })),
  });
});

app.post("/api/users", async (c) => {
  requireAdmin(c);
  const body = await c.req.json<{ email?: string; displayName?: string }>();
  const created = await createUser(c.env, {
    email: body.email ?? "",
    displayName: body.displayName ?? "",
    role: "member",
  });
  return c.json({ user: publicUser(created) }, 201);
});

app.post("/api/users/:id/disable", async (c) => {
  const admin = requireAdmin(c);
  const updated = await disableUser(c.env, c.req.param("id"), admin);
  return c.json({ user: publicUser(updated) });
});

export default {
  fetch: app.fetch,
};
