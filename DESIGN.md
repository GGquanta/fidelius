# Fidelius 设计

## 架构

单 Worker：React SPA 静态资源 + Hono `/api/*`。

```
fidelius/
  worker/          API、身份、加密、KV
  src/             React 界面
  wrangler.jsonc
```

`run_worker_first` 仅匹配 `/api/*`。其余走 Assets，`not_found_handling` 为 `single-page-application`。

绑定：

- `FIDELIUS` KV
- `MASTER_KEY` secret
- `BOOTSTRAP_ADMIN_EMAIL` var
- `ASSETS`

## KV 键

| 键 | 内容 |
| --- | --- |
| `meta:users` | `{ ids: string[], count: number }` |
| `user:{id}` | 用户元数据 |
| `user:email:{email}` | `{ userId }` |
| `totp:{userId}` | 加密 TOTP |
| `record:{id}` | 记录元数据 + 密文 |
| `index:owner:{userId}` | `{ recordIds: string[] }` |
| `index:shared:{userId}` | `{ recordIds: string[] }` |
| `audit:{recordId}` | `{ entries: AuditEntry[] }` 最多 100 |
| `unlock:{userId}` | `{ token, exp }` TTL 600 |
| `lockout:{userId}` | `{ fails, until? }` |
| `enroll:{userId}` | 编排中的临时 TOTP 明文，TTL 600 |

写入后返回内存中的新值，不立即回读 KV。

## 用户对象

```ts
interface User {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "member";
  status: "pending_enroll" | "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}
```

## 记录对象

```ts
interface VaultRecord {
  id: string;
  title: string;
  description: string;
  category: "server" | "ssl" | "login" | "generic";
  ownerId: string;
  sharedWith: string[];
  fieldMeta: { key: string; label: string; type: "text" | "secret" | "multiline" }[];
  wrappedDek: string; // base64
  secretsCipher: string; // base64
  createdAt: string;
  updatedAt: string;
}
```

## API

错误体：`{ error: string, code: string }`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/me` | 当前用户与开锁状态 |
| POST | `/api/enroll/start` | 开始编排，返回 otpauth |
| POST | `/api/enroll/confirm` | `{ code }` |
| POST | `/api/unlock` | `{ code }` |
| POST | `/api/lock` | 封存 |
| GET | `/api/records` | 元数据列表，`?category=&q=` |
| POST | `/api/records` | 创建 |
| GET | `/api/records/:id` | 元数据，无值 |
| PATCH | `/api/records/:id` | 所有者更新 |
| DELETE | `/api/records/:id` | 所有者删除 |
| POST | `/api/records/:id/reveal` | 需开锁，返回字段值 |
| POST | `/api/records/:id/share` | `{ userId }` |
| DELETE | `/api/records/:id/share/:userId` | 收回 |
| GET | `/api/records/:id/audit` | 审计 |
| GET | `/api/users` | admin |
| POST | `/api/users` | `{ email, displayName }` |
| POST | `/api/users/:id/disable` | 停用 |

错误码：`not_provisioned`、`pending_enroll`、`disabled`、`forbidden`、`totp_invalid`、`totp_locked`、`unlock_required`、`user_limit`、`user_has_records`、`not_found`、`validation`。

## 界面

Reading this as: 内部密钥账本，信任优先，档案气质。

旋钮：方差 4、动效 3、密度 6。

### 令牌

亮色（默认）：

- canvas `#F3F2EF`
- ink `#1C1B19`
- muted `#6B6964`
- hairline `#E2E0DB`
- pine `#2F4A3C`
- danger `#8F2D2A`
- surface `#FAF9F7`

暗色：

- canvas `#121211`
- ink `#E8E4DC`
- muted `#9A9690`
- hairline `#2A2926`
- pine `#8FA898`
- danger `#D08A86`
- surface `#1C1B19`

圆角 6px。主按钮实心 ink。禁止：Inter、装饰衬线、蓝紫渐变、厚阴影、左侧色条、pill 大容器、emoji。

字体：Geist（界面）、Geist Mono（秘密值、密钥、时间）。

图标：Phosphor Light，stroke 一致。

### 布局

```
+--------------------------------------------------+
| Fidelius          分类筛选     用户  开锁/封存   |
+----------+---------------------------------------+
| 全部     | 标题                    更新时间  标记 |
| 服务器   | ------------------------------------- |
| SSL      | ...                                   |
| 登录     |                                       |
| 通用     |                                       |
+----------+---------------------------------------+
```

顶栏高度不超过 64px。左轨是文字筛选，不是图标侧栏。清单用发丝行，不用卡片堆。

详情是文档页：标题、描述、字段。敏感值默认等宽遮罩 `••••••••`。开锁后文字揭开（opacity + 轻微 blur 解除，200ms）。多行字段提供下载。

用户管理仅 admin：席位 `n/10`，表格。

文案用中文祈使动词：开锁、封存、复制、下载、分享、收回。禁止营销套话与破折号。

### 状态

骨架、空保险库、未开通、待编排、TOTP 错误、锁定、无权限、删除确认。

复制成功用短提示，不弹模态。删除必须确认。

## 主题

尊重 `prefers-color-scheme`，提供手动切换，整站同一主题，不中途反转。
