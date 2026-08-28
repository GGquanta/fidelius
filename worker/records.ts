import { decryptSecrets, encryptSecrets, importMasterKey } from "./crypto";
import { validateRecordInput } from "./templates";
import {
  ApiError,
  AUDIT_LIMIT,
  AUDIT_PAGE_SIZE,
  getJson,
  keys,
  nowIso,
  putJson,
  type AuditEntry,
  type Category,
  type IdList,
  type RecordField,
  type User,
  type VaultRecord,
} from "./types";

function emptyIndex(): IdList {
  return { recordIds: [] };
}

async function readIndex(env: Env, key: string): Promise<IdList> {
  return (await getJson<IdList>(env.FIDELIUS, key)) ?? emptyIndex();
}

async function writeIndex(env: Env, key: string, ids: string[]): Promise<void> {
  await putJson(env.FIDELIUS, key, { recordIds: [...new Set(ids)] });
}

async function appendAudit(env: Env, recordId: string, entry: AuditEntry): Promise<void> {
  const current = (await getJson<{ entries: AuditEntry[] }>(env.FIDELIUS, keys.audit(recordId))) ?? {
    entries: [],
  };
  current.entries.push(entry);
  if (current.entries.length > AUDIT_LIMIT) {
    current.entries = current.entries.slice(-AUDIT_LIMIT);
  }
  await putJson(env.FIDELIUS, keys.audit(recordId), current);
}

function metaOf(record: VaultRecord, access: "owner" | "shared") {
  return {
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
  };
}

export async function listRecords(env: Env, user: User, category?: string, q?: string) {
  const owned = await readIndex(env, keys.ownerIndex(user.id));
  const shared = await readIndex(env, keys.sharedIndex(user.id));
  const ids = [...owned.recordIds, ...shared.recordIds];
  if (ids.length === 0) return [];
  const unique = [...new Set(ids)];
  const found = await Promise.all(unique.map((id) => env.FIDELIUS.get(keys.record(id))));
  const items = [];
  for (const value of found) {
    if (!value) continue;
    const record = JSON.parse(value) as VaultRecord;
    const access = record.ownerId === user.id ? "owner" : "shared";
    if (category && record.category !== category) continue;
    if (q) {
      const hay = `${record.title} ${record.description}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) continue;
    }
    items.push(metaOf(record, access));
  }
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getRecordForUser(
  env: Env,
  user: User,
  id: string,
): Promise<{ record: VaultRecord; access: "owner" | "shared" }> {
  const record = await getJson<VaultRecord>(env.FIDELIUS, keys.record(id));
  if (!record) throw new ApiError(404, "not_found", "记录不存在");
  if (record.ownerId === user.id) return { record, access: "owner" };
  if (record.sharedWith.includes(user.id)) return { record, access: "shared" };
  throw new ApiError(403, "forbidden", "没有查看此记录的权限");
}

export async function createRecord(
  env: Env,
  user: User,
  input: {
    title: string;
    description: string;
    category: Category;
    fields: RecordField[];
  },
) {
  const fields = validateRecordInput(input.category, input.title, input.fields);
  const master = await importMasterKey(env.MASTER_KEY);
  const secrets: Record<string, string> = {};
  for (const field of fields) secrets[field.key] = field.value;
  const { wrappedDek, secretsCipher } = await encryptSecrets(master, secrets);
  const timestamp = nowIso();
  const record: VaultRecord = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    ownerId: user.id,
    sharedWith: [],
    fieldMeta: fields.map(({ key, label, type }) => ({ key, label, type })),
    wrappedDek,
    secretsCipher,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await putJson(env.FIDELIUS, keys.record(record.id), record);
  const owned = await readIndex(env, keys.ownerIndex(user.id));
  owned.recordIds.push(record.id);
  await writeIndex(env, keys.ownerIndex(user.id), owned.recordIds);
  await appendAudit(env, record.id, {
    at: timestamp,
    actorId: user.id,
    actorEmail: user.email,
    action: "create",
    detail: record.fieldMeta.map((f) => f.key).join(","),
  });
  return metaOf(record, "owner");
}

export async function updateRecord(
  env: Env,
  user: User,
  id: string,
  input: {
    title: string;
    description: string;
    category: Category;
    fields: RecordField[];
  },
) {
  const { record, access } = await getRecordForUser(env, user, id);
  if (access !== "owner") throw new ApiError(403, "forbidden", "仅所有者可修改");
  const fields = validateRecordInput(input.category, input.title, input.fields);
  const master = await importMasterKey(env.MASTER_KEY);
  const secrets: Record<string, string> = {};
  for (const field of fields) secrets[field.key] = field.value;
  const encrypted = await encryptSecrets(master, secrets);
  record.title = input.title.trim();
  record.description = input.description.trim();
  record.category = input.category;
  record.fieldMeta = fields.map(({ key, label, type }) => ({ key, label, type }));
  record.wrappedDek = encrypted.wrappedDek;
  record.secretsCipher = encrypted.secretsCipher;
  record.updatedAt = nowIso();
  await putJson(env.FIDELIUS, keys.record(record.id), record);
  await appendAudit(env, record.id, {
    at: record.updatedAt,
    actorId: user.id,
    actorEmail: user.email,
    action: "update",
    detail: record.fieldMeta.map((f) => f.key).join(","),
  });
  return metaOf(record, "owner");
}

export async function deleteRecord(env: Env, user: User, id: string): Promise<void> {
  const { record, access } = await getRecordForUser(env, user, id);
  if (access !== "owner") throw new ApiError(403, "forbidden", "仅所有者可删除");
  await env.FIDELIUS.delete(keys.record(id));
  await env.FIDELIUS.delete(keys.audit(id));
  const owned = await readIndex(env, keys.ownerIndex(user.id));
  await writeIndex(
    env,
    keys.ownerIndex(user.id),
    owned.recordIds.filter((rid) => rid !== id),
  );
  for (const sharedId of record.sharedWith) {
    const shared = await readIndex(env, keys.sharedIndex(sharedId));
    await writeIndex(
      env,
      keys.sharedIndex(sharedId),
      shared.recordIds.filter((rid) => rid !== id),
    );
  }
}

export async function revealRecord(env: Env, user: User, id: string) {
  const { record, access } = await getRecordForUser(env, user, id);
  const master = await importMasterKey(env.MASTER_KEY);
  const secrets = await decryptSecrets(master, record.wrappedDek, record.secretsCipher);
  await appendAudit(env, record.id, {
    at: nowIso(),
    actorId: user.id,
    actorEmail: user.email,
    action: "reveal",
    detail: record.fieldMeta.map((f) => f.key).join(","),
  });
  return {
    ...metaOf(record, access),
    fields: record.fieldMeta.map((meta) => ({
      ...meta,
      value: secrets[meta.key] ?? "",
    })),
  };
}

export async function shareRecord(env: Env, user: User, id: string, targetUserId: string) {
  const { record, access } = await getRecordForUser(env, user, id);
  if (access !== "owner") throw new ApiError(403, "forbidden", "仅所有者可分享");
  if (targetUserId === user.id) throw new ApiError(400, "validation", "不能分享给自己");
  const target = await getJson<User>(env.FIDELIUS, keys.user(targetUserId));
  if (!target || target.status !== "active") {
    throw new ApiError(400, "validation", "只能分享给已绑定验证器的成员");
  }
  if (!record.sharedWith.includes(targetUserId)) {
    record.sharedWith.push(targetUserId);
    record.updatedAt = nowIso();
    await putJson(env.FIDELIUS, keys.record(record.id), record);
    const shared = await readIndex(env, keys.sharedIndex(targetUserId));
    shared.recordIds.push(record.id);
    await writeIndex(env, keys.sharedIndex(targetUserId), shared.recordIds);
    await appendAudit(env, record.id, {
      at: record.updatedAt,
      actorId: user.id,
      actorEmail: user.email,
      action: "share",
      detail: targetUserId,
    });
  }
  return metaOf(record, "owner");
}

export async function unshareRecord(env: Env, user: User, id: string, targetUserId: string) {
  const { record, access } = await getRecordForUser(env, user, id);
  if (access !== "owner") throw new ApiError(403, "forbidden", "仅所有者可收回分享");
  record.sharedWith = record.sharedWith.filter((sid) => sid !== targetUserId);
  record.updatedAt = nowIso();
  await putJson(env.FIDELIUS, keys.record(record.id), record);
  const shared = await readIndex(env, keys.sharedIndex(targetUserId));
  await writeIndex(
    env,
    keys.sharedIndex(targetUserId),
    shared.recordIds.filter((rid) => rid !== id),
  );
  await appendAudit(env, record.id, {
    at: record.updatedAt,
    actorId: user.id,
    actorEmail: user.email,
    action: "unshare",
    detail: targetUserId,
  });
  return metaOf(record, "owner");
}

export async function getAudit(
  env: Env,
  user: User,
  id: string,
  offset = 0,
  limit = AUDIT_PAGE_SIZE,
) {
  await getRecordForUser(env, user, id);
  const log = (await getJson<{ entries: AuditEntry[] }>(env.FIDELIUS, keys.audit(id))) ?? {
    entries: [],
  };
  const all = log.entries.slice().reverse();
  const start = Math.max(0, Math.floor(offset));
  const size = Math.min(AUDIT_PAGE_SIZE, Math.max(1, Math.floor(limit)));
  return {
    entries: all.slice(start, start + size),
    total: all.length,
  };
}
