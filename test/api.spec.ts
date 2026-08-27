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
  return secret;
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
    const secret = await enroll(ADMIN);
    const me = await json("/api/me", { headers: headers(ADMIN) });
    expect(me.body.user).toMatchObject({ email: ADMIN, role: "admin", status: "active" });

    const locked = await json("/api/records", { headers: headers(ADMIN) });
    expect(locked.res.status).toBe(200);

    const { cookie } = await unlock(ADMIN, secret);
    expect(cookie).toContain("fidelius_unlock=");
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
    const secret = await enroll(ADMIN);
    const created = await json("/api/records", {
      method: "POST",
      headers: headers(ADMIN),
      body: JSON.stringify({
        title: "jump-host",
        description: "lab gateway",
        category: "login",
        fields: [
          { key: "site", label: "站点或应用", type: "text", value: "intranet" },
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
    const adminSecret = await enroll(ADMIN);
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
});
