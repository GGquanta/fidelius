import type { Category, FieldType, RecordField } from "./api";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
}

export const CATEGORIES: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "server", label: "服务器" },
  { id: "ssl", label: "SSL" },
  { id: "login", label: "登录" },
  { id: "generic", label: "通用" },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  server: "服务器密码",
  ssl: "SSL 密钥",
  login: "用户登录密码",
  generic: "通用",
};

export const TEMPLATES: Record<Category, TemplateField[]> = {
  server: [
    { key: "host", label: "主机", type: "text" },
    { key: "port", label: "端口", type: "text" },
    { key: "protocol", label: "协议", type: "text" },
    { key: "username", label: "用户名", type: "text" },
    { key: "password", label: "密码", type: "secret" },
    { key: "ssh_key", label: "SSH 私钥", type: "multiline" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  ssl: [
    { key: "domain", label: "域名", type: "text" },
    { key: "certificate", label: "证书 PEM", type: "multiline" },
    { key: "private_key", label: "私钥 PEM", type: "multiline" },
    { key: "chain", label: "证书链", type: "multiline" },
    { key: "not_after", label: "有效期", type: "text" },
  ],
  login: [
    { key: "site", label: "站点或应用", type: "text" },
    { key: "username", label: "账号", type: "text" },
    { key: "password", label: "密码", type: "secret" },
    { key: "url", label: "登录 URL", type: "text" },
    { key: "recovery", label: "恢复码", type: "multiline" },
  ],
  generic: [],
};

export function fieldsFromTemplate(category: Category): RecordField[] {
  return TEMPLATES[category].map((field) => ({ ...field, value: "" }));
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
