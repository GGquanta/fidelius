import type { Category, FieldType, RecordField } from "./api";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
}

export const CATEGORIES: { id: Category | "all"; label: string; short: string }[] = [
  { id: "all", label: "全部", short: "全部" },
  { id: "server", label: "服务器", short: "服务器" },
  { id: "database", label: "数据库", short: "数据库" },
  { id: "ssl", label: "SSL", short: "SSL" },
  { id: "apikey", label: "API 密钥", short: "API" },
  { id: "login", label: "登录", short: "登录" },
  { id: "cloud", label: "云平台", short: "云" },
  { id: "domain", label: "域名 DNS", short: "域名" },
  { id: "network", label: "网络设备", short: "网络" },
  { id: "recovery", label: "恢复码", short: "恢复" },
  { id: "generic", label: "通用", short: "通用" },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  server: "服务器密码",
  database: "数据库",
  ssl: "SSL 密钥",
  apikey: "API 密钥",
  login: "用户登录密码",
  cloud: "云平台账号",
  domain: "域名与 DNS",
  network: "网络设备",
  recovery: "恢复码",
  generic: "通用",
};

export const TEMPLATE_HINT: Record<Category, string> = {
  server: "主机、端口、账号与密钥按组填写。",
  database: "引擎、主机、库名与口令按组填写。",
  ssl: "证书、私钥与有效期放在同一组。",
  apikey: "服务商、密钥与权限范围按组填写。",
  login: "站点账号与恢复码按组填写。",
  cloud: "云厂商、控制台与访问密钥按组填写。",
  domain: "域名、注册商与 DNS 令牌按组填写。",
  network: "设备、SSID 与管理口令按组填写。",
  recovery: "服务名与备份码放在同一组。",
  generic: "没有固定模板，按需要添加字段。",
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
  database: [
    { key: "engine", label: "引擎", type: "text" },
    { key: "host", label: "主机", type: "text" },
    { key: "port", label: "端口", type: "text" },
    { key: "database", label: "库名", type: "text" },
    { key: "username", label: "用户名", type: "text" },
    { key: "password", label: "密码", type: "secret" },
    { key: "conn_uri", label: "连接串", type: "secret" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  ssl: [
    { key: "domain", label: "域名", type: "text" },
    { key: "certificate", label: "证书 PEM", type: "multiline" },
    { key: "private_key", label: "私钥 PEM", type: "multiline" },
    { key: "chain", label: "证书链", type: "multiline" },
    { key: "not_after", label: "有效期", type: "text" },
  ],
  apikey: [
    { key: "provider", label: "服务商", type: "text" },
    { key: "key_id", label: "密钥 ID", type: "text" },
    { key: "secret_key", label: "密钥", type: "secret" },
    { key: "scope", label: "权限范围", type: "text" },
    { key: "expires_at", label: "到期日", type: "text" },
    { key: "endpoint", label: "接口地址", type: "text" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  login: [
    { key: "site", label: "站点或应用", type: "text" },
    { key: "username", label: "账号", type: "text" },
    { key: "password", label: "密码", type: "secret" },
    { key: "url", label: "登录 URL", type: "text" },
    { key: "recovery", label: "恢复码", type: "multiline" },
  ],
  cloud: [
    { key: "provider", label: "云厂商", type: "text" },
    { key: "account_id", label: "账号 ID", type: "text" },
    { key: "console_url", label: "控制台", type: "text" },
    { key: "username", label: "用户名", type: "text" },
    { key: "password", label: "密码", type: "secret" },
    { key: "access_key", label: "访问密钥", type: "secret" },
    { key: "mfa_backup", label: "MFA 备份码", type: "multiline" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  domain: [
    { key: "domain", label: "域名", type: "text" },
    { key: "registrar", label: "注册商", type: "text" },
    { key: "console_url", label: "控制台", type: "text" },
    { key: "username", label: "账号", type: "text" },
    { key: "password", label: "密码", type: "secret" },
    { key: "dns_provider", label: "DNS 服务商", type: "text" },
    { key: "api_token", label: "API 令牌", type: "secret" },
    { key: "expires_at", label: "到期日", type: "text" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  network: [
    { key: "device", label: "设备", type: "text" },
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
    { key: "service", label: "服务", type: "text" },
    { key: "account", label: "账号", type: "text" },
    { key: "codes", label: "恢复码", type: "multiline" },
    { key: "method", label: "方式", type: "text" },
    { key: "issued_at", label: "签发日", type: "text" },
    { key: "notes", label: "备注", type: "multiline" },
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
