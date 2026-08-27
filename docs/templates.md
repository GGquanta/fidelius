# 分类填写模板

模板只约束创建/编辑表单与校验。存储统一为：

```ts
type FieldType = "text" | "secret" | "multiline";

interface RecordField {
  key: string;
  label: string;
  type: FieldType;
  value: string; // 仅在 create/update/reveal 中出现明文
}
```

`secret` 与 `multiline` 在未开锁时显示遮罩。`multiline` 提供下载。用户可在模板字段之外追加自定义键值对。

## 服务器密码 `server`

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

| key | label | type | 校验 |
| --- | --- | --- | --- |
| engine | 引擎 | text | 必填 |
| host | 主机 | text | 必填 |
| port | 端口 | text | 1-65535，可空 |
| database | 库名 | text | 必填 |
| username | 用户名 | text | 必填 |
| password | 密码 | secret | 必填 |
| conn_uri | 连接串 | secret | 可空，若填须含 `://` |
| notes | 备注 | multiline | 可选 |

## SSL 密钥 `ssl`

| key | label | type | 校验 |
| --- | --- | --- | --- |
| domain | 域名 | text | 必填 |
| certificate | 证书 PEM | multiline | 必填，须含 `BEGIN CERTIFICATE` |
| private_key | 私钥 PEM | multiline | 必填，须含 `BEGIN` 与 `PRIVATE KEY` |
| chain | 证书链 | multiline | 可选 |
| not_after | 有效期 | text | 可选，ISO 日期 `YYYY-MM-DD` |

## API 密钥与令牌 `apikey`

| key | label | type | 校验 |
| --- | --- | --- | --- |
| provider | 服务商 | text | 必填 |
| key_id | 密钥 ID | text | 可选 |
| secret_key | 密钥 | secret | 必填 |
| scope | 权限范围 | text | 可选 |
| expires_at | 到期日 | text | 可选，`YYYY-MM-DD` |
| endpoint | 接口地址 | text | 可选，若填须 `http` 或 `https` |
| notes | 备注 | multiline | 可选 |

## 用户登录密码 `login`

| key | label | type | 校验 |
| --- | --- | --- | --- |
| site | 站点或应用 | text | 必填 |
| username | 账号 | text | 必填 |
| password | 密码 | secret | 必填 |
| url | 登录 URL | text | 可选，若填写须为 `http` 或 `https` |
| recovery | 恢复码 | multiline | 可选 |

## 云平台账号 `cloud`

| key | label | type | 校验 |
| --- | --- | --- | --- |
| provider | 云厂商 | text | 必填 |
| account_id | 账号 ID | text | 可选 |
| console_url | 控制台 | text | 可选，若填须 `http` 或 `https` |
| username | 用户名 | text | 可选 |
| password | 密码 | secret | 可与访问密钥二选一 |
| access_key | 访问密钥 | secret | 可与密码二选一 |
| mfa_backup | MFA 备份码 | multiline | 可选 |
| notes | 备注 | multiline | 可选 |

提交时 `password` 与 `access_key` 至少填一项。

## 域名与 DNS `domain`

| key | label | type | 校验 |
| --- | --- | --- | --- |
| domain | 域名 | text | 必填，须含 `.` |
| registrar | 注册商 | text | 可选 |
| console_url | 控制台 | text | 可选，若填须 `http` 或 `https` |
| username | 账号 | text | 可选 |
| password | 密码 | secret | 可选 |
| dns_provider | DNS 服务商 | text | 可选 |
| api_token | API 令牌 | secret | 可选 |
| expires_at | 到期日 | text | 可选，`YYYY-MM-DD` |
| notes | 备注 | multiline | 可选 |

## 网络设备与 Wi-Fi `network`

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

| key | label | type | 校验 |
| --- | --- | --- | --- |
| service | 服务 | text | 必填 |
| account | 账号 | text | 可选 |
| codes | 恢复码 | multiline | 必填 |
| method | 方式 | text | 可选 |
| issued_at | 签发日 | text | 可选，`YYYY-MM-DD` |
| notes | 备注 | multiline | 可选 |

## 通用 `generic`

无预设字段。至少 1 个自定义键值对。`key` 只能是小写字母、数字、下划线，不以数字开头。
