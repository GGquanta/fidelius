import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { generateTotp } from "../worker/totp";

const ADMIN = "admin@example.com";
const MEMBER = "member@example.com";
const STRANGER = "stranger@example.com";

function headers(email: string, extra?: HeadersInit): HeadersInit {
  return { "X-Test-Email": email, "Content-Type": "application/json", ...extra };
}

async function json(path: string, init?: RequestInit) {
  const res = await SELF.fetch(`https://fidelius.test${path}`, init);
  const body = await res.json<Record<string, unknown>>();
  return { res, body };
}

async function enroll(email: string) {
  const me = await json("/api/me", { headers: headers(email) });
  if (me.res.status >= 400 && me.body.code !== "not_provisioned") {
    throw new Error(`me failed ${me.res.status} ${JSON.stringify(me.body)}`);
  }
  const start = await json("/api/enroll/start", {
    method: "POST",
    headers: headers(email),
  });
  if (start.res.status !== 200) {
    throw new Error(`enroll start failed ${JSON.stringify(start.body)}`);
  }
  const secret = String(start.body.secret);
  const code = await generateTotp(secret);
  const confirm = await json("/api/enroll/confirm", {
    method: "POST",
    headers: headers(email),
    body: JSON.stringify({ code }),
  });
  if (confirm.res.status !== 200) {
    throw new Error(`enroll confirm failed ${JSON.stringify(confirm.body)}`);
  }
  return {
    secret,
    recoveryCodes: (confirm.body.recoveryCodes as string[]) ?? [],
  };
}

async function unlock(email: string, secret: string) {
  const code = await generateTotp(secret);
  const { res } = await json("/api/unlock", {
    method: "POST",
    headers: headers(email),
    body: JSON.stringify({ code }),
  });
  return { cookie: res.headers.get("Set-Cookie") ?? "" };
}

describe("fidelius api", () => {
  it("rejects unprovisioned emails", async () => {
    const { res, body } = await json("/api/me", { headers: headers(STRANGER) });
    expect(res.status).toBe(403);
    expect(body.code).toBe("not_provisioned");
  });

  it("bootstraps admin, enrolls, and unlocks", async () => {
    const { secret } = await enroll(ADMIN);
    const me = await json("/api/me", { headers: headers(ADMIN) });
    expect(me.body.user).toMatchObject({ email: ADMIN, role: "admin", status: "active" });
    expect(me.body.recoveryRemaining).toBe(10);

    const locked = await json("/api/records", { headers: headers(ADMIN) });
    expect(locked.res.status).toBe(200);

    const { cookie } = await unlock(ADMIN, secret);
    expect(cookie).toContain("fidelius_unlock=");
    const unlockedMe = await json("/api/me", { headers: { ...headers(ADMIN), Cookie: cookie.split(";")[0] } });
    expect(unlockedMe.body.unlocked).toBe(true);
    expect(typeof unlockedMe.body.unlockExpiresAt).toBe("number");
  });

  it("locks after five failed totp attempts", async () => {
    await enroll(ADMIN);
    let last = { res: new Response(), body: {} as Record<string, unknown> };
    for (let i = 0; i < 5; i += 1) {
      last = await json("/api/unlock", {
        method: "POST",
        headers: headers(ADMIN),
        body: JSON.stringify({ code: "000000" }),
      });
    }
    expect(last.res.status).toBe(429);
    expect(last.body.code).toBe("totp_locked");
  });

  it("keeps secrets out of list and requires unlock to reveal", async () => {
    const { secret } = await enroll(ADMIN);
    const created = await json("/api/records", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({
        title: "jump-host",
        description: "lab gateway",
        category: "login",
        fields: [
          { key: "site", label: "网站或应用", type: "text", value: "intranet" },
          { key: "username", label: "账号", type: "text", value: "apollo" },
          { key: "password", label: "密码", type: "secret", value: "test-password-not-real" },
        ],
      }),
    });
    expect(created.res.status).toBe(201);
    const record = created.body.record as { id: string };
    const listed = await json("/api/records", { headers: headers(ADMIN) });
    expect(JSON.stringify(listed.body)).not.toContain("test-password-not-real");

    const blocked = await json(`/api/records/${record.id}/reveal`, {
      method: "POST",
      headers: headers(ADMIN),
    });
    expect(blocked.res.status).toBe(401);
    expect(blocked.body.code).toBe("unlock_required");

    const { cookie } = await unlock(ADMIN, secret);
    const revealed = await json(`/api/records/${record.id}/reveal`, {
      method: "POST",
      headers: { ...headers(ADMIN), Cookie: cookie.split(";")[0] },
    });
    expect(revealed.res.status).toBe(200);
    expect(JSON.stringify(revealed.body)).toContain("test-password-not-real");
  });

  it("shares read-only and forbids foreign edits", async () => {
    const { secret: adminSecret } = await enroll(ADMIN);
    await json("/api/users", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ email: MEMBER, displayName: "成员" }),
    });
    await enroll(MEMBER);

    const created = await json("/api/records", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({
        title: "ssl-lab",
        description: "",
        category: "ssl",
        fields: [
          { key: "domain", label: "域名", type: "text", value: "lab.example" },
          {
            key: "certificate",
            label: "证书 PEM",
            type: "multiline",
            value: "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----",
          },
          {
            key: "private_key",
            label: "私钥 PEM",
            type: "multiline",
            value: "-----BEGIN PRIVATE KEY-----\ntest-password-not-real\n-----END PRIVATE KEY-----",
          },
        ],
      }),
    });
    const record = created.body.record as { id: string };
    const users = await json("/api/users", { headers: headers(ADMIN) });
    const member = (users.body.users as { email: string; id: string }[]).find(
      (u) => u.email === MEMBER,
    );
    expect(member).toBeTruthy();
    await json(`/api/records/${record.id}/share`, {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ userId: member!.id }),
    });

    const memberList = await json("/api/records", { headers: headers(MEMBER) });
    expect((memberList.body.records as { id: string }[]).some((r) => r.id === record.id)).toBe(true);

    const patch = await json(`/api/records/${record.id}`, {
      method: "PATCH",
      headers: headers(MEMBER),
      body: JSON.stringify({
        title: "hacked",
        description: "",
        category: "ssl",
        fields: [
          { key: "domain", label: "域名", type: "text", value: "x" },
          {
            key: "certificate",
            label: "证书 PEM",
            type: "multiline",
            value: "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----",
          },
          {
            key: "private_key",
            label: "私钥 PEM",
            type: "multiline",
            value: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----",
          },
        ],
      }),
    });
    expect(patch.res.status).toBe(403);

    const del = await json(`/api/records/${record.id}`, {
      method: "DELETE",
      headers: headers(MEMBER),
    });
    expect(del.res.status).toBe(403);
    expect(adminSecret).toBeTruthy();
  });

  it("enforces the ten-user limit", async () => {
    await enroll(ADMIN);
    for (let i = 0; i < 9; i += 1) {
      const created = await json("/api/users", {
        method: "POST",
        headers: headers(ADMIN),
        body: JSON.stringify({ email: `user${i}@example.com`, displayName: `用户${i}` }),
      });
      expect(created.res.status).toBe(201);
    }
    const overflow = await json("/api/users", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ email: "overflow@example.com", displayName: "溢出" }),
    });
    expect(overflow.res.status).toBe(400);
    expect(overflow.body.code).toBe("user_limit");
  });

  it("accepts new categories and rejects invalid payloads", async () => {
    await enroll(ADMIN);
    const ok = await json("/api/records", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({
        title: "prod-db",
        description: "",
        category: "database",
        fields: [
          { key: "engine", label: "引擎", type: "text", value: "postgres" },
          { key: "host", label: "主机", type: "text", value: "db.internal" },
          { key: "database", label: "数据库名", type: "text", value: "app" },
          { key: "username", label: "用户名", type: "text", value: "app" },
          { key: "password", label: "密码", type: "secret", value: "test-password-not-real" },
        ],
      }),
    });
    expect(ok.res.status).toBe(201);

    const apikey = await json("/api/records", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({
        title: "openai",
        description: "",
        category: "apikey",
        fields: [
          { key: "provider", label: "服务商", type: "text", value: "openai" },
          { key: "secret_key", label: "密钥", type: "secret", value: "test-password-not-real" },
        ],
      }),
    });
    expect(apikey.res.status).toBe(201);

    const cloud = await json("/api/records", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({
        title: "cf-account",
        description: "",
        category: "cloud",
        fields: [
          { key: "provider", label: "云服务商", type: "text", value: "cloudflare" },
          { key: "access_key", label: "访问密钥", type: "secret", value: "test-password-not-real" },
        ],
      }),
    });
    expect(cloud.res.status).toBe(201);

    const domain = await json("/api/records", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({
        title: "example-com",
        description: "",
        category: "domain",
        fields: [{ key: "domain", label: "域名", type: "text", value: "example.com" }],
      }),
    });
    expect(domain.res.status).toBe(201);

    const network = await json("/api/records", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({
        title: "office-wifi",
        description: "",
        category: "network",
        fields: [
          { key: "device", label: "设备", type: "text", value: "ap-01" },
          { key: "wifi_password", label: "Wi-Fi 密码", type: "secret", value: "test-password-not-real" },
        ],
      }),
    });
    expect(network.res.status).toBe(201);

    const recovery = await json("/api/records", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({
        title: "github-backup",
        description: "",
        category: "recovery",
        fields: [
          { key: "service", label: "服务名称", type: "text", value: "github" },
          { key: "codes", label: "恢复码", type: "multiline", value: "test-password-not-real" },
        ],
      }),
    });
    expect(recovery.res.status).toBe(201);

    const badDomain = await json("/api/records", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({
        title: "bad-domain",
        description: "",
        category: "domain",
        fields: [{ key: "domain", label: "域名", type: "text", value: "nodot" }],
      }),
    });
    expect(badDomain.res.status).toBe(400);

    const unknown = await json("/api/records", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({
        title: "unknown",
        description: "",
        category: "unknown",
        fields: [{ key: "note", label: "备注", type: "text", value: "x" }],
      }),
    });
    expect(unknown.res.status).toBe(400);
    expect(unknown.body.code).toBe("validation");
  });

  it("lets a user update their own display name", async () => {
    await enroll(ADMIN);
    const empty = await json("/api/me", {
      method: "PATCH",
      headers: headers(ADMIN),
      body: JSON.stringify({ displayName: "   " }),
    });
    expect(empty.res.status).toBe(400);
    expect(empty.body.code).toBe("validation");

    const tooLong = await json("/api/me", {
      method: "PATCH",
      headers: headers(ADMIN),
      body: JSON.stringify({ displayName: "字".repeat(33) }),
    });
    expect(tooLong.res.status).toBe(400);

    const ok = await json("/api/me", {
      method: "PATCH",
      headers: headers(ADMIN),
      body: JSON.stringify({ displayName: "阿波罗" }),
    });
    expect(ok.res.status).toBe(200);
    expect(ok.body.user).toMatchObject({ email: ADMIN, displayName: "阿波罗" });

    const me = await json("/api/me", { headers: headers(ADMIN) });
    expect(me.body.user).toMatchObject({ displayName: "阿波罗" });
  });

  it("lets an active user reset totp after proving the current code", async () => {
    const { secret: oldSecret } = await enroll(ADMIN);
    const { cookie } = await unlock(ADMIN, oldSecret);
    const unlocked = await json("/api/me", {
      headers: { ...headers(ADMIN), Cookie: cookie.split(";")[0] },
    });
    expect(unlocked.body.unlocked).toBe(true);

    const wrong = await json("/api/enroll/reset/start", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ code: "000000" }),
    });
    expect(wrong.res.status).toBe(400);
    expect(wrong.body.code).toBe("totp_invalid");

    const earlyConfirm = await json("/api/enroll/reset/confirm", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ code: await generateTotp(oldSecret) }),
    });
    expect(earlyConfirm.res.status).toBe(400);

    const start = await json("/api/enroll/reset/start", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ code: await generateTotp(oldSecret) }),
    });
    expect(start.res.status).toBe(200);
    const newSecret = String(start.body.secret);
    expect(newSecret).not.toBe(oldSecret);

    const confirm = await json("/api/enroll/reset/confirm", {
      method: "POST",
      headers: { ...headers(ADMIN), Cookie: cookie.split(";")[0] },
      body: JSON.stringify({ code: await generateTotp(newSecret) }),
    });
    expect(confirm.res.status).toBe(200);
    expect(confirm.body.unlocked).toBe(false);

    const after = await json("/api/me", {
      headers: { ...headers(ADMIN), Cookie: cookie.split(";")[0] },
    });
    expect(after.body.unlocked).toBe(false);

    const oldUnlock = await json("/api/unlock", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ code: await generateTotp(oldSecret) }),
    });
    expect(oldUnlock.res.status).toBe(400);
    expect(oldUnlock.body.code).toBe("totp_invalid");

    const { cookie: nextCookie } = await unlock(ADMIN, newSecret);
    expect(nextCookie).toContain("fidelius_unlock=");
    expect(confirm.body.recoveryCodes).toHaveLength(10);
  });

  it("issues one-time recovery codes and unlocks with them", async () => {
    const { recoveryCodes } = await enroll(ADMIN);
    expect(recoveryCodes).toHaveLength(10);
    expect(recoveryCodes.every((code) => /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(code))).toBe(
      true,
    );

    const me = await json("/api/me", { headers: headers(ADMIN) });
    expect(me.body.recoveryRemaining).toBe(10);
    expect(me.body).not.toHaveProperty("recoveryCodes");

    const used = recoveryCodes[0];
    const unlocked = await json("/api/unlock", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ recoveryCode: used }),
    });
    expect(unlocked.res.status).toBe(200);
    expect(unlocked.body.unlocked).toBe(true);

    const remaining = await json("/api/me", { headers: headers(ADMIN) });
    expect(remaining.body.recoveryRemaining).toBe(9);
    expect(JSON.stringify(remaining.body)).not.toContain(used);

    const replay = await json("/api/unlock", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ recoveryCode: used }),
    });
    expect(replay.res.status).toBe(400);
    expect(replay.body.code).toBe("totp_invalid");

    const again = await json("/api/unlock", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ recoveryCode: recoveryCodes[1] }),
    });
    expect(again.res.status).toBe(200);
    const after = await json("/api/me", { headers: headers(ADMIN) });
    expect(after.body.recoveryRemaining).toBe(8);
  });

  it("locks after five failed recovery code attempts", async () => {
    await enroll(ADMIN);
    let last = { res: new Response(), body: {} as Record<string, unknown> };
    for (let i = 0; i < 5; i += 1) {
      last = await json("/api/unlock", {
        method: "POST",
        headers: headers(ADMIN),
        body: JSON.stringify({ recoveryCode: "0000-0000" }),
      });
    }
    expect(last.res.status).toBe(429);
    expect(last.body.code).toBe("totp_locked");
  });

  it("lets reset start with a recovery code and invalidates old codes", async () => {
    const { secret: oldSecret, recoveryCodes } = await enroll(ADMIN);
    const start = await json("/api/enroll/reset/start", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ recoveryCode: recoveryCodes[0] }),
    });
    expect(start.res.status).toBe(200);
    const newSecret = String(start.body.secret);

    const confirm = await json("/api/enroll/reset/confirm", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ code: await generateTotp(newSecret) }),
    });
    expect(confirm.res.status).toBe(200);
    const nextCodes = confirm.body.recoveryCodes as string[];
    expect(nextCodes).toHaveLength(10);
    expect(nextCodes).not.toContain(recoveryCodes[0]);

    const oldCode = await json("/api/unlock", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ recoveryCode: recoveryCodes[1] }),
    });
    expect(oldCode.res.status).toBe(400);

    const fresh = await json("/api/unlock", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ recoveryCode: nextCodes[0] }),
    });
    expect(fresh.res.status).toBe(200);
    expect(oldSecret).toBeTruthy();
  });

  it("regenerates recovery codes only with totp and discards the old set", async () => {
    const { secret, recoveryCodes } = await enroll(ADMIN);
    const withRecovery = await json("/api/recovery/regenerate", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ recoveryCode: recoveryCodes[0] }),
    });
    expect(withRecovery.res.status).toBe(400);

    const issued = await json("/api/recovery/regenerate", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ code: await generateTotp(secret) }),
    });
    expect(issued.res.status).toBe(200);
    const nextCodes = issued.body.recoveryCodes as string[];
    expect(nextCodes).toHaveLength(10);
    expect(nextCodes).not.toEqual(recoveryCodes);

    const stale = await json("/api/unlock", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ recoveryCode: recoveryCodes[0] }),
    });
    expect(stale.res.status).toBe(400);

    const fresh = await json("/api/unlock", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({ recoveryCode: nextCodes[0] }),
    });
    expect(fresh.res.status).toBe(200);

    const me = await json("/api/me", { headers: headers(ADMIN) });
    expect(me.body.recoveryRemaining).toBe(9);
  });
});
