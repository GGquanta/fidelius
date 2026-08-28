import type { Category, FieldType, RecordField } from "./types";
import { ApiError } from "./types";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  server: "服务器账号",
  database: "数据库",
  ssl: "SSL 证书",
  apikey: "API 密钥",
  login: "登录账号",
  cloud: "云平台账号",
  domain: "域名与 DNS",
  network: "网络设备",
  recovery: "恢复码",
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
  database: [
    { key: "engine", label: "引擎", type: "text", required: true },
    { key: "host", label: "主机", type: "text", required: true },
    { key: "port", label: "端口", type: "text" },
    { key: "database", label: "数据库名", type: "text", required: true },
    { key: "username", label: "用户名", type: "text", required: true },
    { key: "password", label: "密码", type: "secret", required: true },
    { key: "conn_uri", label: "连接字符串", type: "secret" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  ssl: [
    { key: "domain", label: "域名", type: "text", required: true },
    { key: "certificate", label: "证书 PEM", type: "multiline", required: true },
    { key: "private_key", label: "私钥 PEM", type: "multiline", required: true },
    { key: "chain", label: "证书链", type: "multiline" },
    { key: "not_after", label: "有效期", type: "text" },
  ],
  apikey: [
    { key: "provider", label: "服务商", type: "text", required: true },
    { key: "key_id", label: "密钥 ID", type: "text" },
    { key: "secret_key", label: "密钥", type: "secret", required: true },
    { key: "scope", label: "权限范围", type: "text" },
    { key: "expires_at", label: "到期日期", type: "text" },
    { key: "endpoint", label: "接口地址", type: "text" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  login: [
    { key: "site", label: "网站或应用", type: "text", required: true },
    { key: "username", label: "账号", type: "text", required: true },
    { key: "password", label: "密码", type: "secret", required: true },
    { key: "url", label: "登录地址", type: "text" },
    { key: "recovery", label: "恢复码", type: "multiline" },
  ],
  cloud: [
    { key: "provider", label: "云服务商", type: "text", required: true },
    { key: "account_id", label: "账号 ID", type: "text" },
    { key: "console_url", label: "控制台", type: "text" },
    { key: "username", label: "用户名", type: "text" },
    { key: "password", label: "密码", type: "secret" },
    { key: "access_key", label: "访问密钥", type: "secret" },
    { key: "mfa_backup", label: "MFA 备份码", type: "multiline" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  domain: [
    { key: "domain", label: "域名", type: "text", required: true },
    { key: "registrar", label: "注册商", type: "text" },
    { key: "console_url", label: "控制台", type: "text" },
    { key: "username", label: "账号", type: "text" },
    { key: "password", label: "密码", type: "secret" },
    { key: "dns_provider", label: "DNS 服务商", type: "text" },
    { key: "api_token", label: "API 令牌", type: "secret" },
    { key: "expires_at", label: "到期日期", type: "text" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  network: [
    { key: "device", label: "设备", type: "text", required: true },
    { key: "kind", label: "类型", type: "text" },
    { key: "address", label: "管理地址", type: "text" },
    { key: "username", label: "用户名", type: "text" },
    { key: "password", label: "管理密码", type: "secret" },
    { key: "ssid", label: "SSID", type: "text" },
    { key: "wifi_password", label: "Wi-Fi 密码", type: "secret" },
    { key: "vpn_config", label: "VPN 配置", type: "multiline" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  recovery: [
    { key: "service", label: "服务名称", type: "text", required: true },
    { key: "account", label: "账号", type: "text" },
    { key: "codes", label: "恢复码", type: "multiline", required: true },
    { key: "method", label: "验证方式", type: "text" },
    { key: "issued_at", label: "签发日期", type: "text" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  generic: [],
};

const KEY_RE = /^[a-z][a-z0-9_]*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fieldMap(fields: RecordField[]): Map<string, RecordField> {
  return new Map(fields.map((field) => [field.key, field]));
}

function requireValue(fields: Map<string, RecordField>, key: string, label: string): string {
  const value = fields.get(key)?.value?.trim() ?? "";
  if (!value) throw new ApiError(400, "validation", `${label}不能为空`);
  return value;
}

function optional(fields: Map<string, RecordField>, key: string): string {
  return fields.get(key)?.value?.trim() ?? "";
}

function assertPort(value: string) {
  if (!value) return;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new ApiError(400, "validation", "端口须为 1–65535");
  }
}

function assertDate(value: string, label: string) {
  if (value && !DATE_RE.test(value)) {
    throw new ApiError(400, "validation", `${label}须为 YYYY-MM-DD 格式`);
  }
}

function assertHttp(value: string, label: string) {
  if (value && !/^https?:\/\//i.test(value)) {
    throw new ApiError(400, "validation", `${label}须以 http 或 https 开头`);
  }
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
      throw new ApiError(400, "validation", `字段名无效：${field.key}`);
    }
    if (!label) throw new ApiError(400, "validation", "显示名称不能为空");
    if (!["text", "secret", "multiline"].includes(field.type)) {
      throw new ApiError(400, "validation", "字段类型无效");
    }
    if (seen.has(key)) throw new ApiError(400, "validation", `字段名重复：${key}`);
    seen.add(key);
    cleaned.push({ key, label, type: field.type, value });
  }

  const map = fieldMap(cleaned);
  for (const spec of TEMPLATES[category]) {
    if (spec.required) requireValue(map, spec.key, spec.label);
  }

  if (category === "server") {
    const password = optional(map, "password");
    const sshKey = optional(map, "ssh_key");
    if (!password && !sshKey) {
      throw new ApiError(400, "validation", "密码与 SSH 私钥至少填写一项");
    }
    assertPort(optional(map, "port"));
  }

  if (category === "database") {
    assertPort(optional(map, "port"));
    const uri = optional(map, "conn_uri");
    if (uri && !uri.includes("://")) {
      throw new ApiError(400, "validation", "连接字符串须包含 ://");
    }
  }

  if (category === "ssl") {
    const cert = requireValue(map, "certificate", "证书 PEM");
    const key = requireValue(map, "private_key", "私钥 PEM");
    if (!cert.includes("BEGIN CERTIFICATE")) {
      throw new ApiError(400, "validation", "证书须为 PEM 格式");
    }
    if (!key.includes("BEGIN") || !key.includes("PRIVATE KEY")) {
      throw new ApiError(400, "validation", "私钥须为 PEM 格式");
    }
    assertDate(optional(map, "not_after"), "有效期");
  }

  if (category === "apikey") {
    assertDate(optional(map, "expires_at"), "到期日期");
    assertHttp(optional(map, "endpoint"), "接口地址");
  }

  if (category === "login") {
    assertHttp(optional(map, "url"), "登录地址");
  }

  if (category === "cloud") {
    const password = optional(map, "password");
    const accessKey = optional(map, "access_key");
    if (!password && !accessKey) {
      throw new ApiError(400, "validation", "密码与访问密钥至少填写一项");
    }
    assertHttp(optional(map, "console_url"), "控制台");
  }

  if (category === "domain") {
    const domain = requireValue(map, "domain", "域名");
    if (!domain.includes(".")) {
      throw new ApiError(400, "validation", "域名须包含英文句点");
    }
    assertHttp(optional(map, "console_url"), "控制台");
    assertDate(optional(map, "expires_at"), "到期日期");
  }

  if (category === "network") {
    const password = optional(map, "password");
    const wifi = optional(map, "wifi_password");
    const vpn = optional(map, "vpn_config");
    if (!password && !wifi && !vpn) {
      throw new ApiError(400, "validation", "管理密码、Wi-Fi 密码与 VPN 配置至少填写一项");
    }
  }

  if (category === "recovery") {
    assertDate(optional(map, "issued_at"), "签发日期");
  }

  if (category === "generic" && cleaned.filter((f) => f.value.trim()).length < 1) {
    throw new ApiError(400, "validation", "至少填写一个字段");
  }

  return cleaned;
}
