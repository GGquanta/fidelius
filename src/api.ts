export type Category =
  | "server"
  | "database"
  | "ssl"
  | "apikey"
  | "login"
  | "cloud"
  | "domain"
  | "network"
  | "recovery"
  | "generic";
export type FieldType = "text" | "secret" | "multiline";
export type UserRole = "admin" | "member";
export type UserStatus = "pending_enroll" | "active" | "disabled";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FieldMeta {
  key: string;
  label: string;
  type: FieldType;
}

export interface RecordField extends FieldMeta {
  value: string;
}

export interface RecordMeta {
  id: string;
  title: string;
  description: string;
  category: Category;
  ownerId: string;
  sharedWith: string[];
  fieldMeta: FieldMeta[];
  createdAt: string;
  updatedAt: string;
  access: "owner" | "shared";
}

export interface RevealedRecord extends RecordMeta {
  fields: RecordField[];
}

export interface AuditEntry {
  at: string;
  actorId: string;
  actorEmail: string;
  action: string;
  detail: string;
}

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as { error?: string; code?: string } & T;
  if (!res.ok) {
    throw new ApiClientError(body.error ?? "请求失败", body.code ?? "error", res.status);
  }
  return body;
}

export function getMe() {
  return request<{ user: User; unlocked: boolean; unlockExpiresAt: number | null }>("/api/me").catch(
    (error: unknown) => {
      if (error instanceof ApiClientError && error.code === "not_provisioned") {
        return { user: null, unlocked: false, unlockExpiresAt: null, code: "not_provisioned" as const };
      }
      if (error instanceof ApiClientError && error.code === "disabled") {
        return { user: null, unlocked: false, unlockExpiresAt: null, code: "disabled" as const };
      }
      throw error;
    },
  );
}

export const api = {
  enrollStart: () => request<{ otpauth: string; secret: string }>("/api/enroll/start", { method: "POST" }),
  enrollConfirm: (code: string) =>
    request<{ user: User }>("/api/enroll/confirm", { method: "POST", body: JSON.stringify({ code }) }),
  unlock: (code: string) =>
    request<{ unlocked: boolean; unlockExpiresAt: number }>("/api/unlock", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  lock: () => request<{ unlocked: boolean }>("/api/lock", { method: "POST" }),
  updateMe: (displayName: string) =>
    request<{ user: User }>("/api/me", {
      method: "PATCH",
      body: JSON.stringify({ displayName }),
    }),
  records: (params?: { category?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.category) search.set("category", params.category);
    if (params?.q) search.set("q", params.q);
    const suffix = search.toString() ? `?${search}` : "";
    return request<{ records: RecordMeta[] }>(`/api/records${suffix}`);
  },
  createRecord: (payload: unknown) =>
    request<{ record: RecordMeta }>("/api/records", { method: "POST", body: JSON.stringify(payload) }),
  record: (id: string) => request<{ record: RecordMeta }>(`/api/records/${id}`),
  updateRecord: (id: string, payload: unknown) =>
    request<{ record: RecordMeta }>(`/api/records/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteRecord: (id: string) => request<{ ok: boolean }>(`/api/records/${id}`, { method: "DELETE" }),
  reveal: (id: string) =>
    request<{ record: RevealedRecord }>(`/api/records/${id}/reveal`, { method: "POST" }),
  share: (id: string, userId: string) =>
    request<{ record: RecordMeta }>(`/api/records/${id}/share`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  unshare: (id: string, userId: string) =>
    request<{ record: RecordMeta }>(`/api/records/${id}/share/${userId}`, { method: "DELETE" }),
  audit: (id: string) => request<{ entries: AuditEntry[] }>(`/api/records/${id}/audit`),
  users: () =>
    request<{
      users: Array<User | { id: string; displayName: string; email: string }>;
      limit?: number;
      occupied?: number;
    }>("/api/users"),
  createUser: (email: string, displayName: string) =>
    request<{ user: User }>("/api/users", {
      method: "POST",
      body: JSON.stringify({ email, displayName }),
    }),
  disableUser: (id: string) =>
    request<{ user: User }>(`/api/users/${id}/disable`, { method: "POST" }),
};
