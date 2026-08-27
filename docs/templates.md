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

## SSL 密钥 `ssl`

| key | label | type | 校验 |
| --- | --- | --- | --- |
| domain | 域名 | text | 必填 |
| certificate | 证书 PEM | multiline | 必填，须含 `BEGIN CERTIFICATE` |
| private_key | 私钥 PEM | multiline | 必填，须含 `BEGIN` 与 `PRIVATE KEY` |
| chain | 证书链 | multiline | 可选 |
| not_after | 有效期 | text | 可选，ISO 日期 `YYYY-MM-DD` |

## 用户登录密码 `login`

| key | label | type | 校验 |
| --- | --- | --- | --- |
| site | 站点或应用 | text | 必填 |
| username | 账号 | text | 必填 |
| password | 密码 | secret | 必填 |
| url | 登录 URL | text | 可选，若填写须为 `http` 或 `https` |
| recovery | 恢复码 | multiline | 可选 |

## 通用 `generic`

无预设字段。至少 1 个自定义键值对。`key` 只能是小写字母、数字、下划线，不以数字开头。
