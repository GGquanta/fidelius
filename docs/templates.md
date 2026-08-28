# 分类填写模板

模板只约束创建表单，以及已开锁且提交了 `fields` 的更新。仅改标题与描述的更新不走字段校验。存储统一为：

```ts
type FieldType = "text" | "secret" | "multiline";

interface RecordField {
  key: string;
  label: string;
  type: FieldType;
  value: string; // 仅在 create、带 fields 的 update、reveal 中出现明文
}
```

`secret` 与 `multiline` 在未开锁时显示遮罩。`multiline` 提供下载。用户可在模板字段之外追加自定义字段。

## 服务器密码 `server`

用途：SSH、RDP、SFTP 等主机的账号、密码和私钥。

| key | label | type | 校验 |
| --- | --- | --- | --- |
| host | 主机 | text | 必填 |
| port | 端口 | text | 1-65535，默认可空 |
| protocol | 协议 | text | 建议 `ssh` / `rdp` / `sftp` |
| username | 用户名 | text | 必填 |
| password | 密码 | secret | 可与私钥二选一 |
| ssh_key | SSH 私钥 | multiline | 可与密码二选一 |
| notes | 备注 | multiline | 可选 |

提交时 `password` 与 `ssh_key` 至少填一项。

## 数据库 `database`

用途：MySQL、Postgres、Redis 等数据库的连接账号、密码和连接字符串。

| key | label | type | 校验 |
| --- | --- | --- | --- |
| engine | 引擎 | text | 必填 |
| host | 主机 | text | 必填 |
| port | 端口 | text | 1-65535，可空 |
| database | 数据库名 | text | 必填 |
| username | 用户名 | text | 必填 |
| password | 密码 | secret | 必填 |
| conn_uri | 连接字符串 | secret | 可空，若填须含 `://` |
| notes | 备注 | multiline | 可选 |

## SSL 证书 `ssl`

用途：站点证书 PEM、私钥和证书链。

| key | label | type | 校验 |
| --- | --- | --- | --- |
| domain | 域名 | text | 必填 |
| certificate | 证书 PEM | multiline | 必填，须含 `BEGIN CERTIFICATE` |
| private_key | 私钥 PEM | multiline | 必填，须含 `BEGIN` 与 `PRIVATE KEY` |
| chain | 证书链 | multiline | 可选 |
| not_after | 有效期 | text | 可选，ISO 日期 `YYYY-MM-DD` |

## API 密钥与令牌 `apikey`

用途：第三方服务签发的 API 密钥、令牌和权限范围。

| key | label | type | 校验 |
| --- | --- | --- | --- |
| provider | 服务商 | text | 必填 |
| key_id | 密钥 ID | text | 可选 |
| secret_key | 密钥 | secret | 必填 |
| scope | 权限范围 | text | 可选 |
| expires_at | 到期日期 | text | 可选，`YYYY-MM-DD` |
| endpoint | 接口地址 | text | 可选，若填须 `http` 或 `https` |
| notes | 备注 | multiline | 可选 |

## 登录账号 `login`

用途：网站或应用的登录账号、密码和恢复码。

| key | label | type | 校验 |
| --- | --- | --- | --- |
| site | 网站或应用 | text | 必填 |
| username | 账号 | text | 必填 |
| password | 密码 | secret | 必填 |
| url | 登录地址 | text | 可选，若填写须为 `http` 或 `https` |
| recovery | 恢复码 | multiline | 可选 |

## 云平台账号 `cloud`

用途：云控制台登录、访问密钥和 MFA 恢复码。

| key | label | type | 校验 |
| --- | --- | --- | --- |
| provider | 云服务商 | text | 必填 |
| account_id | 账号 ID | text | 可选 |
| console_url | 控制台 | text | 可选，若填须 `http` 或 `https` |
| username | 用户名 | text | 可选 |
| password | 密码 | secret | 可与访问密钥二选一 |
| access_key | 访问密钥 | secret | 可与密码二选一 |
| mfa_backup | MFA 备份码 | multiline | 可选 |
| notes | 备注 | multiline | 可选 |

提交时 `password` 与 `access_key` 至少填一项。

## 域名与 DNS `domain`

用途：域名注册商、DNS 服务商账号和解析令牌。

| key | label | type | 校验 |
| --- | --- | --- | --- |
| domain | 域名 | text | 必填，须含 `.` |
| registrar | 注册商 | text | 可选 |
| console_url | 控制台 | text | 可选，若填须 `http` 或 `https` |
| username | 账号 | text | 可选 |
| password | 密码 | secret | 可选 |
| dns_provider | DNS 服务商 | text | 可选 |
| api_token | API 令牌 | secret | 可选 |
| expires_at | 到期日期 | text | 可选，`YYYY-MM-DD` |
| notes | 备注 | multiline | 可选 |

## 网络设备与 Wi-Fi `network`

用途：路由器、Wi-Fi 和 VPN 的管理密码与配置。

| key | label | type | 校验 |
| --- | --- | --- | --- |
| device | 设备 | text | 必填 |
| kind | 类型 | text | 可选，如 `wifi` / `router` / `vpn` |
| address | 管理地址 | text | 可选 |
| username | 用户名 | text | 可选 |
| password | 管理密码 | secret | 可与 Wi-Fi 密码、VPN 配置三选一 |
| ssid | SSID | text | 可选 |
| wifi_password | Wi-Fi 密码 | secret | 可与管理密码、VPN 配置三选一 |
| vpn_config | VPN 配置 | multiline | 可与管理密码、Wi-Fi 密码三选一 |
| notes | 备注 | multiline | 可选 |

提交时 `password`、`wifi_password`、`vpn_config` 至少填一项。

## 恢复码与备份码 `recovery`

用途：各服务签发的一次性恢复码。

| key | label | type | 校验 |
| --- | --- | --- | --- |
| service | 服务名称 | text | 必填 |
| account | 账号 | text | 可选 |
| codes | 恢复码 | multiline | 必填 |
| method | 验证方式 | text | 可选 |
| issued_at | 签发日期 | text | 可选，`YYYY-MM-DD` |
| notes | 备注 | multiline | 可选 |

## 通用 `generic`

用途：没有对应分类时，用自定义字段保存其他敏感信息。

无预设字段。至少 1 个自定义字段。`key` 只能是小写字母、数字、下划线，不以数字开头。
