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
  category:
    | "server"
    | "database"
    | "ssl"
    | "apikey"
    | "login"
    | "cloud"
    | "domain"
    | "network"
    | "recovery"
    | "generic";
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
| GET | `/api/me` | 当前用户、开锁状态、`unlockExpiresAt` |
| PATCH | `/api/me` | `{ displayName }`，改自己的显示名 |
| POST | `/api/enroll/start` | 开始编排，返回 otpauth |
| POST | `/api/enroll/confirm` | `{ code }` |
| POST | `/api/unlock` | `{ code }`，返回 `unlockExpiresAt` |
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

定位：摆在暖白纸面上的紫罗兰色文件柜。生动感来自分类色、拟物折页和大号数字，而不是满屏渐变。

旋钮：方差 7、动效 4、密度 5。

路由：`/` 概览，`/vault` 保险库（`?category=` `?q=`），`/new` 新建，`/records/:id` 详情，`/records/:id/edit` 编辑，`/users` 团队（admin）。

### 令牌

亮色（默认）。灰阶暖中性，hue 24–40。主色紫罗兰，副色蜜桃。组件引用语义角色，不直接引用色阶。

角色：

- canvas `hsl(40, 30%, 98%)` 纸面。纸面带一层淡方格瓷砖纹理：砖缝规则，砖面明度按混批打散，色相偏尘粉 / 蜜桃（338°–20°），禁止棋盘、正弦波、小循环与平滑噪波云。纹理是 `html` 的背景层，只透过 canvas，不盖 surface。其上叠垂直半透明 canvas 渐变（顶近隐、中下显），只改透明度，不算第四种色相渐变
- surface `#FFFFFF` 抬升卡
- hover `hsl(36, 24%, 94%)`
- ink `hsl(24, 20%, 13%)` 主文字 13.5:1
- muted `hsl(24, 18%, 32%)` 次文字 ≥4.5:1
- tertiary `hsl(26, 16%, 40%)` 脚注 ≥4.5:1
- line `hsl(32, 18%, 88%)` 装饰分隔（豁免）
- line-strong `hsl(28, 14%, 50%)` 功能性边框 ≥3:1
- accent `hsl(268, 70%, 58%)` 主按钮，白字 ≥4.5:1
- accent-soft `hsl(280, 85%, 96%)`
- peach `hsl(16, 88%, 64%)` 高光与警示，不承载白小字
- peach-ink `hsl(12, 78%, 32%)`
- danger `hsl(360, 72%, 42%)`
- danger-soft `hsl(360, 100%, 96%)`

暗色只覆盖角色层：canvas `hsl(24, 22%, 10%)`，surface 比 canvas 更亮，accent 移到 `hsl(270, 64%, 72%)` 并配深色字。阴影几乎不起作用，抬升靠变亮 + hairline。

分类三元组（浅底 / 实心 / 浅底上的文字），颜色不是唯一信号：

- 服务器 268° 紫罗兰 · HardDrives
- 数据库 158° 薄荷 · Database
- SSL 205° 天青 · Certificate
- API 密钥 42° 琥珀 · Code
- 登录 338° 玫粉 · Fingerprint
- 云平台 232° 靛蓝 · Cloud
- 域名 DNS 90° 青柠 · Globe
- 网络 182° 蓝绿 · WifiHigh
- 恢复码 12° 珊瑚 · Lifebuoy
- 通用 32° 暖石 · Cube
- 全部 暖墨 · Vault

圆角随尺寸升档：8 / 12 / 18 / 26px。主按钮用 violet-500 → violet-600 垂直渐变 + inset 亮边。

高度五档两段式，阴影色 `hsla(24, 20%, 13%, …)`，alpha `.04–.18`。

字体：Geist Variable（界面）、Outfit Variable（≥30px 展示与统计数字）、Geist Mono（秘密值、密钥、时间）。

图标：Phosphor Regular，导航 16px，瓷砖 20px。

字号只从 `12 14 16 18 20 24 30 36 48 60` 取值。两档字重 400 / 600。大数字只用于统计卡。

### 渐变

只允许三种，色相行程 ≤40°：

1. 主按钮：`linear-gradient(180deg, violet-500, violet-600)` + `inset 0 1px 0`
2. 品牌氛围光：Dashboard 顶部与门页径向 mesh，紫罗兰 + 蜜桃，alpha ≤ 0.08
3. 折页与瓷砖纸面：`linear-gradient(180deg, cat-tint, surface)`

禁止文字渐变、彩虹、紫→青长行程、给所有边框套渐变。

### 布局

```
+------------+---------------------------------------+
| 印记字标   |  搜索                                 |
| 概览       |---------------------------------------|
| 保险库     |  主内容                               |
|   全部     |                                       |
|   分类…    |                                       |
| 团队       |                                       |
| 用户卡     |                                       |
+------------+---------------------------------------+
```

侧栏 272px，底为毛玻璃：半透明 canvas + `backdrop-filter` 模糊纸面纹理，与主区用一根 hairline 分开，让纸面坐在前面。`prefers-reduced-transparency` 时退回实色 canvas。结构：

- 顶：印记 36px + 字标 + 一句脚注，下方一根分隔
- 工作台：概览
- 保险库：可展开树。父行是「保险库」+ 总数 + 折页箭头；子项含「全部」与 10 个分类（20px 瓷砖、名称、计数），由左侧 1px 轨成树。点选写入 `/vault?category=`。父行只负责展开/进入全部，不高亮成与子项抢权重
- admin 见团队
- 底：用户卡可点（圆印、显示名、角色），打开个人资料面板；主题切换是卡上独立按钮，不打开面板。卡本身有边框，不是一条裸 footer

选中用 accent-soft 铺底，不用左侧色条。顶栏只含搜索。开锁不出现在侧栏、顶栏、概览、保险库列表。

### 开锁

只在记录详情与编辑页、需要揭开敏感值时提供开锁。离开 `/records/*` 立即 `POST /api/lock`。概览与保险库列表永不展示开锁。

### 概览 `/`

数据全部由 `GET /api/records` 与 `GET /api/users` 在前端聚合，不新增聚合接口。

- 问候 + 新建
- 四张统计卡：总数 / 我的 / 收到的分享 / 分出去的，Outfit 48–60px 数字
- 分类分布：横向堆叠条 + 图例（色块 + 名称 + 计数）
- 分类瓷砖网格：跳 `/vault?category=`
- 字段构成：text / secret / multiline 环形图（只读 `fieldMeta`）
- 最近更新：5 张记录卡
- 更新节律：近 12 周 `updatedAt` 分桶
- 团队席位（admin）：10 格

图表自绘 SVG，不引图表库。

### 保险库 `/vault` 页签

页签是浏览器顶栏那种矮横条，贴在纸张上沿，不是大方块折页。

- 条与页同高 36px，激活不改变高度、不加 padding
- 横排：20px 瓷砖、短名、计数。页签均分柜宽，`min-width: 88px`，`max-width: 240px`；装不下横向滚动，不换行
- 未激活底透明，hover 为 `--hover`；分类色只来自瓷砖，禁止整页铺满浅色
- 相邻未激活页之间 1px `line` 分隔，贴着激活页或 hover 时分隔消失
- 激活页底为 surface，盖住纸张顶边；左右 8px 凹角收进纸面（Chrome 激活页那种肩线）。禁止身后假纸边
- 纸张顶角拉平：`border-radius: 0 0 18px 18px`，只有一层面 `--elev-3`，`min-height: 480px`
- 纸内记录卡只用边框与 canvas 底，禁止再加阴影

### 其他页

详情是一张纸，整页 `max-width: 960px` 居中，避免拉满大屏后控件漂在空白里。

- 顶行：带方框箭头的「返回保险库」，不是裸文字
- 纸内抬头一行：左 44px 分类瓷砖 + 分类名 / 标题 / 描述；右 编辑（次按钮）与 删除（三级），与标题顶对齐，窄屏时操作折到标题下
- 其下两栏：左字段、右 280px 元数据，只用一根竖线分区，不用散落小卡片
- 字段是规格表：标签 120px、值、复制/下载。按钮始终可见，不靠 hover 才出现
- 未开锁时在字段区顶提供开锁条（锁印 + 说明 + 主按钮）。已开锁时一行淡说明 + 封存。离开 `/records/*` 立即封存，不弹 toast
- 删除在抬头为三级，确认弹窗内才是红色主按钮

表单：10 分类选择网格。编辑时分类不可改。编辑页同样有返回。

编排页左说明右 QR 瓷砖，6 格验证码。QR 用当前 accent。空状态用大号分类瓷砖 + 新建。用户席位 10 格进度，行前姓名首字圆印。开锁为居中 `--elev-5` 面板，支持粘贴整串。个人资料同样是居中 `--elev-5` 面板：显示名可改（1–32 字），邮箱与角色只读。

文案用中文祈使动词：开锁、封存、复制、下载、分享、收回、保存。禁止营销套话。

### 组件

- `SealMark` 印记（紫→蜜桃）
- `AppShell` 应用侧栏 + 顶栏
- `BackLink` 返回
- `Button` 主 / 次 / 三级 / 危险，按层级分档
- `FolderTabs` 文件柜折页
- `CategoryIcon` 分类瓷砖
- `RecordCard` 索引卡
- `StatCard` 统计卡
- `charts` `StackedBar` `DonutRing` `WeekBars`
- `OtpBoxes` 六格验证码
- `UnlockPanel` 开锁面板
- `ProfilePanel` 个人资料
- `EmptyState` `FieldBlock`

纸面瓷砖纹理是 canvas 材料，不是装饰。装饰只三处：印记、空状态构图、氛围光径向 mesh。

### 状态

骨架、空保险库、未开通、待编排、TOTP 错误、锁定、无权限、删除确认。

复制成功用带勾的短提示。删除必须确认。

## 主题

尊重 `prefers-color-scheme`，提供手动切换，整站同一主题，不中途反转。
