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
  { id: "ssl", label: "SSL 证书", short: "SSL" },
  { id: "apikey", label: "API 密钥", short: "API" },
  { id: "login", label: "登录账号", short: "登录" },
  { id: "cloud", label: "云平台", short: "云" },
  { id: "domain", label: "域名与 DNS", short: "域名" },
  { id: "network", label: "网络设备", short: "网络" },
  { id: "recovery", label: "恢复码", short: "恢复" },
  { id: "generic", label: "通用", short: "通用" },
];

export const CATEGORY_LABEL: Record<Category, string> = {
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

export const EMPTY_COPY: Record<Category | "all", string> = {
  all: "还没有任何记录。按分类保存服务器、证书、密钥和登录账号。",
  server: "还没有服务器记录。保存 SSH、RDP、SFTP 等主机的账号、密码和私钥。",
  database: "还没有数据库记录。保存引擎、主机、库名、账号和连接密码。",
  ssl: "还没有证书记录。保存站点证书、私钥和证书链。",
  apikey: "还没有 API 密钥记录。保存服务商签发的密钥、令牌和权限范围。",
  login: "还没有登录账号。保存网站或应用的账号、密码和恢复码。",
  cloud: "还没有云平台记录。保存控制台登录、访问密钥和 MFA 恢复码。",
  domain: "还没有域名记录。保存注册商、DNS 账号和解析令牌。",
  network: "还没有网络设备记录。保存路由器、Wi-Fi 和 VPN 的密码与配置。",
  recovery: "还没有恢复码记录。保存各服务签发的一次性恢复码。",
  generic: "还没有通用记录。没有对应分类时，用自定义字段保存其他敏感信息。",
};

export const TEMPLATE_HINT: Record<Category, string> = {
  server: "填写主机、端口、账号和密钥。",
  database: "填写引擎、主机、数据库名和密码。",
  ssl: "填写证书、私钥和有效期。",
  apikey: "填写服务商、密钥和权限范围。",
  login: "填写网站账号和恢复码。",
  cloud: "填写云服务商、控制台和访问密钥。",
  domain: "填写域名、注册商和 DNS 令牌。",
  network: "填写设备、SSID 和管理密码。",
  recovery: "填写服务名称和备份码。",
  generic: "无预设字段，请按需添加。",
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
    { key: "database", label: "数据库名", type: "text" },
    { key: "username", label: "用户名", type: "text" },
    { key: "password", label: "密码", type: "secret" },
    { key: "conn_uri", label: "连接字符串", type: "secret" },
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
    { key: "expires_at", label: "到期日期", type: "text" },
    { key: "endpoint", label: "接口地址", type: "text" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  login: [
    { key: "site", label: "网站或应用", type: "text" },
    { key: "username", label: "账号", type: "text" },
    { key: "password", label: "密码", type: "secret" },
    { key: "url", label: "登录地址", type: "text" },
    { key: "recovery", label: "恢复码", type: "multiline" },
  ],
  cloud: [
    { key: "provider", label: "云服务商", type: "text" },
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
    { key: "expires_at", label: "到期日期", type: "text" },
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
    { key: "service", label: "服务名称", type: "text" },
    { key: "account", label: "账号", type: "text" },
    { key: "codes", label: "恢复码", type: "multiline" },
    { key: "method", label: "验证方式", type: "text" },
    { key: "issued_at", label: "签发日期", type: "text" },
    { key: "notes", label: "备注", type: "multiline" },
  ],
  generic: [],
};

export function fieldsFromTemplate(category: Category): RecordField[] {
  return TEMPLATES[category].map((field) => ({ ...field, value: "" }));
}

export function parseCategoryParam(value: string | null): Category {
  if (value && value in CATEGORY_LABEL) return value as Category;
  return "generic";
}

export function newRecordPath(category?: Category | "all" | null): string {
  if (category && category !== "all" && category in CATEGORY_LABEL) {
    return `/new?category=${category}`;
  }
  return "/new";
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
