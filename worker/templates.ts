import type { Category, FieldType, RecordField } from "./types";
import { ApiError } from "./types";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  server: "服务器密码",
  ssl: "SSL 密钥",
  login: "用户登录密码",
  generic: "通用",
};

export const TEMPLATES: Record<Category, TemplateField[]> = {
  server: [
    { key: "host", label: "主机", type: "text", required: true },
    { key: "port", label: "端口", type: "text" },
    { key: "protocol", label: "协议", type: "text" },
    { key: "username", label: "用户名", type: "text", required: true },
    { key: "password", label: "密码", type: "secret" },
    { key: "ssh_key", label: "SSH 私钥", type: "multiline" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  ssl: [
    { key: "domain", label: "域名", type: "text", required: true },
    { key: "certificate", label: "证书 PEM", type: "multiline", required: true },
    { key: "private_key", label: "私钥 PEM", type: "multiline", required: true },
    { key: "chain", label: "证书链", type: "multiline" },
    { key: "not_after", label: "有效期", type: "text" },
  ],
  login: [
    { key: "site", label: "站点或应用", type: "text", required: true },
    { key: "username", label: "账号", type: "text", required: true },
    { key: "password", label: "密码", type: "secret", required: true },
    { key: "url", label: "登录 URL", type: "text" },
    { key: "recovery", label: "恢复码", type: "multiline" },
  ],
  generic: [],
};

const KEY_RE = /^[a-z][a-z0-9_]*$/;

function fieldMap(fields: RecordField[]): Map<string, RecordField> {
  return new Map(fields.map((field) => [field.key, field]));
}

function requireValue(fields: Map<string, RecordField>, key: string, label: string): string {
  const value = fields.get(key)?.value?.trim() ?? "";
  if (!value) throw new ApiError(400, "validation", `${label}不能为空`);
  return value;
}

export function validateRecordInput(
  category: Category,
  title: string,
  fields: RecordField[],
): RecordField[] {
  if (!title.trim()) throw new ApiError(400, "validation", "标题不能为空");
  if (!TEMPLATES[category]) throw new ApiError(400, "validation", "未知分类");

  const cleaned: RecordField[] = [];
  const seen = new Set<string>();
  for (const field of fields) {
    const key = field.key.trim();
    const label = field.label.trim();
    const value = field.value ?? "";
    if (!KEY_RE.test(key)) {
      throw new ApiError(400, "validation", `字段键无效: ${field.key}`);
    }
    if (!label) throw new ApiError(400, "validation", "字段标签不能为空");
    if (!["text", "secret", "multiline"].includes(field.type)) {
      throw new ApiError(400, "validation", "字段类型无效");
    }
    if (seen.has(key)) throw new ApiError(400, "validation", `重复字段: ${key}`);
    seen.add(key);
    cleaned.push({ key, label, type: field.type, value });
  }

  const map = fieldMap(cleaned);
  for (const spec of TEMPLATES[category]) {
    if (spec.required) requireValue(map, spec.key, spec.label);
  }

  if (category === "server") {
    const password = map.get("password")?.value?.trim() ?? "";
    const sshKey = map.get("ssh_key")?.value?.trim() ?? "";
    if (!password && !sshKey) {
      throw new ApiError(400, "validation", "密码与 SSH 私钥至少填写一项");
    }
    const port = map.get("port")?.value?.trim() ?? "";
    if (port) {
      const n = Number(port);
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        throw new ApiError(400, "validation", "端口须在 1-65535");
      }
    }
  }

  if (category === "ssl") {
    const cert = requireValue(map, "certificate", "证书 PEM");
    const key = requireValue(map, "private_key", "私钥 PEM");
    if (!cert.includes("BEGIN CERTIFICATE")) {
      throw new ApiError(400, "validation", "证书须为 PEM");
    }
    if (!key.includes("BEGIN") || !key.includes("PRIVATE KEY")) {
      throw new ApiError(400, "validation", "私钥须为 PEM");
    }
    const notAfter = map.get("not_after")?.value?.trim() ?? "";
    if (notAfter && !/^\d{4}-\d{2}-\d{2}$/.test(notAfter)) {
      throw new ApiError(400, "validation", "有效期格式为 YYYY-MM-DD");
    }
  }

  if (category === "login") {
    const url = map.get("url")?.value?.trim() ?? "";
    if (url && !/^https?:\/\//i.test(url)) {
      throw new ApiError(400, "validation", "登录 URL 须以 http 或 https 开头");
    }
  }

  if (category === "generic" && cleaned.filter((f) => f.value.trim()).length < 1) {
    throw new ApiError(400, "validation", "至少填写一个键值对");
  }

  return cleaned;
}
