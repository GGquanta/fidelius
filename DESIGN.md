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

Reading this as: 小团队密钥工作台，清新、可扫读，带封缄仪式感。

旋钮：方差 5、动效 4、密度 6。

### 令牌

亮色（默认，Tailwind stone + teal）：

- canvas `stone-50` `#FAFAF9`
- surface `#FFFFFF`
- hover `stone-100` `#F5F5F4`
- ink `stone-800` `#292524`
- muted `stone-500` `#78716C`
- line `stone-200` `#E7E5E4`
- accent `teal-700` `#0F766E`
- accent-soft `teal-50` `#F0FDFA`
- danger `rose-700` `#BE123C`
- danger-soft `rose-50` `#FFF1F2`

暗色：

- canvas `stone-900` `#1C1917`
- surface `stone-800` `#292524`
- hover `stone-800`
- ink `stone-200` `#E7E5E4`
- muted `stone-400` `#A8A29E`
- line `stone-700` `#44403C`
- accent `teal-400` `#2DD4BF`
- accent-soft `#134E4A`
- danger `rose-400` `#FB7185`
- danger-soft `#4C0519`

分类色只用于 36px 图标瓷砖和微型标签：

- 服务器 `teal` + HardDrives
- SSL `sky` + Certificate
- 登录 `amber` + Key
- 通用 `violet` + Cube
- 全部 `stone` + Vault

圆角 8px（面板/行）与 10px（瓷砖）。主按钮实心 accent。禁止：Inter、装饰衬线、蓝紫大渐变、厚阴影、卡片左侧色条、pill 大容器、emoji、Lucide。允许图标侧栏与浅色瓷砖。

字体：Geist（界面）、Geist Mono（秘密值、密钥、时间）。

图标：Phosphor Regular，导航 16px，瓷砖 20px。

### 布局

```
+------+-------------------------------------------+
| 印  |  搜索                  用户  主题  开锁状态 |
| 侧栏 |-------------------------------------------|
| 图标 |  标题行 + 新建                             |
| 分类 |  行：瓷砖  标题  标签  分享  时间           |
| 计数 |                                           |
+------+-------------------------------------------+
```

侧栏约 220px：圆角方印 + 字标，分类项带图标与数量，选中用 accent-soft，不用左侧色条。顶栏含搜索与开锁状态芯片。清单行高约 56px，hover 用 stone-100。

详情双栏：左字段栈，右分享与日志。字段为浅表面块，hover 露出复制/下载。敏感值默认遮罩，开锁后揭开。

编排页左说明右 QR 瓷砖，6 格验证码。空状态用大号图标构图 + 新建。用户席位为 10 格进度，行前姓名首字圆印。

开锁为居中面板，6 个数字格，支持粘贴整串。

文案用中文祈使动词：开锁、封存、复制、下载、分享、收回。禁止营销套话与破折号。

### 组件

- `SealMark` 印记
- `AppShell` 侧栏 + 顶栏
- `CategoryIcon` 分类瓷砖
- `OtpBoxes` 六格验证码
- `UnlockPanel` 开锁面板
- `EmptyState` `RecordRow` `FieldBlock`

装饰只三处：印记、空状态构图、编排页低透明度 teal 径向光斑。

### 状态

骨架、空保险库、未开通、待编排、TOTP 错误、锁定、无权限、删除确认。

复制成功用带勾的短提示。删除必须确认。

## 主题

尊重 `prefers-color-scheme`，提供手动切换，整站同一主题，不中途反转。
