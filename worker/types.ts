export const USER_LIMIT = 10;
export const UNLOCK_TTL_SECONDS = 600;
export const ENROLL_TTL_SECONDS = 600;
export const TOTP_FAIL_LIMIT = 5;
export const TOTP_LOCK_SECONDS = 15 * 60;
export const AUDIT_LIMIT = 100;
export const UNLOCK_COOKIE = "fidelius_unlock";

export type UserRole = "admin" | "member";
export type UserStatus = "pending_enroll" | "active" | "disabled";
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

export interface VaultRecord {
  id: string;
  title: string;
  description: string;
  category: Category;
  ownerId: string;
  sharedWith: string[];
  fieldMeta: FieldMeta[];
  wrappedDek: string;
  secretsCipher: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  at: string;
  actorId: string;
  actorEmail: string;
  action: "create" | "update" | "share" | "unshare" | "delete" | "reveal";
  detail: string;
}

export interface UsersMeta {
  ids: string[];
  count: number;
}

export interface IdList {
  recordIds: string[];
}

export interface ApiErrorBody {
  error: string;
  code: string;
}

export const keys = {
  usersMeta: "meta:users",
  user: (id: string) => `user:${id}`,
  userEmail: (email: string) => `user:email:${email}`,
  totp: (userId: string) => `totp:${userId}`,
  enroll: (userId: string) => `enroll:${userId}`,
  record: (id: string) => `record:${id}`,
  ownerIndex: (userId: string) => `index:owner:${userId}`,
  sharedIndex: (userId: string) => `index:shared:${userId}`,
  audit: (recordId: string) => `audit:${recordId}`,
  unlock: (userId: string) => `unlock:${userId}`,
  lockout: (userId: string) => `lockout:${userId}`,
};

export async function getJson<T>(kv: KVNamespace, key: string): Promise<T | null> {
  return kv.get<T>(key, "json");
}

export async function putJson(
  kv: KVNamespace,
  key: string,
  value: unknown,
  options?: KVNamespacePutOptions,
): Promise<void> {
  await kv.put(key, JSON.stringify(value), options);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }

  toBody(): ApiErrorBody {
    return { error: this.message, code: this.code };
  }
}

export function jsonError(error: ApiError): Response {
  return Response.json(error.toBody(), { status: error.status });
}
