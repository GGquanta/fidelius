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

- `FIDELIUS` KV（配置里不写 namespace id；本地模拟，生产由部署自动创建）
- `MASTER_KEY` secret
- `BOOTSTRAP_ADMIN_EMAIL` var
- `TEAM_DOMAIN`、`ACCESS_AUD` var（生产校验 Access JWT；由 Dashboard 注入）
- `ASSETS`

## KV 键

| 键 | 内容 |
| --- | --- |
| `meta:users` | `{ ids: string[], count: number }` |
| `user:{id}` | 用户元数据 |
| `user:email:{email}` | `{ userId }` |
| `totp:{userId}` | 加密 TOTP |
| `recovery:{userId}` | 加密恢复码哈希 |
| `record:{id}` | 记录元数据 + 密文 |
| `index:owner:{userId}` | `{ recordIds: string[] }` |
| `index:shared:{userId}` | `{ recordIds: string[] }` |
| `audit:{recordId}` | `{ entries: AuditEntry[] }` 最多 100 |
| `unlock:{userId}` | `{ token, exp }` TTL 600 |
| `lockout:{userId}` | `{ fails, until? }` |
| `enroll:{userId}` | 绑定过程中的临时 TOTP 明文，TTL 600 |

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
| GET | `/api/me` | 当前用户、开锁状态、`unlockExpiresAt`、`recoveryRemaining` |
| PATCH | `/api/me` | `{ displayName }`，改自己的显示名 |
| POST | `/api/enroll/start` | 开始绑定验证器，返回 otpauth |
| POST | `/api/enroll/confirm` | `{ code }`，返回 `{ user, recoveryCodes }` |
| POST | `/api/enroll/reset/start` | `{ code }` 或 `{ recoveryCode }`，核对后开始更换验证器，返回 otpauth |
| POST | `/api/enroll/reset/confirm` | `{ code }` 确认新验证器，旧密钥与旧恢复码作废并封存，返回 `{ user, unlocked: false, recoveryCodes }` |
| POST | `/api/unlock` | `{ code }` 或 `{ recoveryCode }`，返回 `unlockExpiresAt` |
| POST | `/api/lock` | 封存 |
| POST | `/api/recovery/regenerate` | `{ code }` 当前验证码，签发新恢复码并作废旧码 |
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

定位：摆在偏米黄的亮纸面上的紫罗兰色文件柜。生动感来自分类色、拟物折页和大号数字，而不是满屏渐变。

旋钮：方差 7、动效 4、密度 5。

路由：`/` 概览，`/vault` 保险库（`?category=` `?q=`），`/new` 新建，`/records/:id` 详情，`/records/:id/edit` 编辑，`/users` 团队（admin）。

### 令牌

亮色（默认）。灰阶暖中性，hue 24–40；canvas 单独取 48° 米黄高明度。主色紫罗兰，副色蜜桃。组件引用语义角色，不直接引用色阶。

角色：

- canvas `hsl(48, 100%, 99.4%)` 偏米黄的近白纸面。纸面带一层淡方格瓷砖纹理：砖缝规则，砖面明度按混批打散，色相贴近蜜桃粉（6°–16°），须可辨认、勿过浓。纹理是 `html` 的背景层，只透过 canvas，不盖 surface。其上叠垂直半透明 canvas 渐变（顶近隐、中下显），只改透明度，不算第四种色相渐变
- surface `#FFFFFF` 抬升卡
- hover `hsl(46, 40%, 97.2%)`
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
- SSL 证书 205° 天青 · Certificate
- API 密钥 42° 琥珀 · Code
- 登录账号 338° 玫粉 · Fingerprint
- 云平台 232° 靛蓝 · Cloud
- 域名与 DNS 90° 青柠 · Globe
- 网络 182° 蓝绿 · WifiHigh
- 恢复码 12° 珊瑚 · Lifebuoy
- 通用 32° 暖石 · Cube
- 全部 暖墨 · Vault

圆角随尺寸升档：8 / 12 / 18 / 26px。主按钮用 violet-500 → violet-600 垂直渐变 + inset 亮边。

高度五档两段式，阴影色 `hsla(24, 20%, 13%, …)`，alpha `.04–.18`。

字体：Geist Variable（界面）、Outfit Variable（≥30px 展示标题）、Imperial Script（仅品牌字标「Fidelius」）、Geist Mono（秘密值、密钥、时间）。指标数字用 Geist `tabular-nums`，含统计卡、分类条数、名额、图例与侧栏计数。

图标：Phosphor Regular，导航 16px，瓷砖 20px。

字号只从 `12 14 16 18 20 24 30 36 48 60` 取值。两档字重 400 / 600。大数字只用于统计卡。

### 渐变

只允许三种，色相行程 ≤40°：

1. 主按钮：`linear-gradient(180deg, violet-500, violet-600)` + `inset 0 1px 0`
2. 品牌氛围光：已登录工作区主栏左上与门页径向 mesh，紫罗兰 + 蜜桃，alpha ≤ 0.08。挂在壳层 `main`，各页共用，不逐页重画
3. 折页与瓷砖纸面：`linear-gradient(180deg, cat-tint, surface)`

禁止文字渐变、彩虹、紫→青长行程、给所有边框套渐变。品牌字标「Fidelius」除外：`linear-gradient(180deg, violet-400, violet-600)`，背景裁切成字，不扩散到其他文案。

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

- 顶：印记 30px（与 favicon 同源的角色透明图）+ 花体字标「Fidelius」（30px Imperial Script，violet-400 → violet-600 垂直短行程，紫罗兰 + 蜜桃辉光，四角星火花与细流线），与印记间距 24px，不是链接，无脚注、无分隔线。字标辉光与火花是印记装饰，不把粒子铺到导航。`prefers-reduced-motion` 时火花静止。文档标题为「Fidelius · 密钥保管库」
- 工作台：概览
- 保险库：可展开树。父行是「保险库」+ 总数 + 折页箭头；子项含「全部」与 10 个分类（20px 瓷砖、名称、计数），由左侧 1px 轨成树。子项行高 36px，左右内边距 12px，与父行同档，行距 12px。点选写入 `/vault?category=`。父行只负责展开/进入全部，不高亮成与子项抢权重
- 侧栏未选中项 hover 用 ink 以 16% 混入透明底（暗色 20%），在毛玻璃上才能读出；不用 `--hover`（与 canvas 过近）。选中仍为 accent-soft。
- admin 见团队
- 底：用户卡可点（圆印、显示名、角色），打开个人资料面板；主题切换是卡上独立按钮，不打开面板。卡本身有边框，不是一条裸 footer

选中用 accent-soft 铺底，不用左侧色条。顶栏只含搜索。主栏 `main` 带品牌氛围光，保险库、详情、新建、团队与概览同一层纸面光。开锁不出现在侧栏、顶栏、概览、保险库列表。

### 开锁

只在记录详情与编辑页、需要查看敏感值时提供开锁。离开 `/records/*` 立即 `POST /api/lock`。概览与保险库列表永不展示开锁。

### 概览 `/`

数据全部由 `GET /api/records` 与 `GET /api/users` 在前端聚合，不新增聚合接口。

- 问候 + 新建
- 四张统计卡：全部 / 我的 / 他人分享 / 我分享的，Geist 48–60px tabular 数字
- 分类分布：横向堆叠条 + 图例（色块 + 名称 + 计数）
- 分类瓷砖网格：跳 `/vault?category=`。每格是索引卡：左分类瓷砖 + 名称 + 最近更新（空则「暂无记录」），右 36px tabular 条数、竖直居中，不加单位。折角用分类浅底，横排占满格宽，不把元素撑到四角
- 字段类型：text / secret / multiline 环形图（只读 `fieldMeta`）
- 最近更新：5 张记录卡，嵌在 surface 面板内，只用边框与 canvas 底，不加阴影
- 更新趋势：近 12 周 `updatedAt` 分桶
- 成员名额（admin）：10 格

图表自绘 SVG，不引图表库。

### 保险库 `/vault` 页签

页签是浏览器顶栏那种矮横条，贴在纸张上沿，不是大方块折页。

- 条与页同高 36px，激活不改变高度、不加 padding
- 横排：20px 瓷砖、短名、计数。页签均分柜宽，`min-width: 112px`，`max-width: 240px`；装不下横向滚动，不换行。页签并排留缝，点按区域互不重叠；禁止负边距叠页，也不在页内再画竖线
- 未激活页签栏为毛玻璃：半透明 canvas + `backdrop-filter` 模糊纸面纹理，与侧栏同一配方；激活页仍为实色 surface，盖在玻璃上。`prefers-reduced-transparency` 时退回实色 canvas。未激活页用 ink 8% 透明底，hover 用 16%（暗色 12% / 20%），才能在玻璃上认出是页签；分类色只来自瓷砖，禁止整页铺满浅色
- 激活页与纸张共用一根闭合描边：`color-mix(in srgb, var(--ink) 24%, var(--surface))`（暗色 40%），比装饰 `line` 略深。左、上、右三边画在页签上，纸张顶线画在页签栏底；激活页底边用 surface 盖住顶线，左右 8px 凹角肩线与顶线同一像素对齐，禁止接缝错位或身后假纸边
- 纸张顶角拉平：`border-radius: 0 0 18px 18px`，只有一层面 `--elev-3`。默认高度至少落到视口底（随主栏剩余高度拉伸），内容更高时纸张跟着长，由主栏滚动
- 纸内记录卡只用边框与 canvas 底，禁止再加阴影。卡用 `auto-fill` + `minmax(360px, 1fr)` 网格，避免拉满大屏后标题漂在一行里；窄于 360px 时一列

### 其他页

详情、新建/编辑与团队都是一张纸，整页 `max-width: 960px` 居中，避免拉满大屏后控件漂在空白里。

- 顶行：带方框箭头的「返回保险库」，不是裸文字
- 纸内抬头一行：左 44px 分类瓷砖 + 分类名 / 标题 / 描述；右 编辑（次按钮）与 删除（三级），与标题顶对齐，窄屏时操作折到标题下
- 其下两栏：左字段、右 280px 元数据，只用一根竖线分区，不用散落小卡片
- 字段是规格表：标签 120px、值、复制/下载。按钮始终可见，不靠 hover 才出现
- 未开锁时在字段区顶提供开锁条（锁印 + 说明 + 主按钮）。已开锁时一行淡说明 + 封存。离开 `/records/*` 立即封存，不弹 toast
- 删除在抬头为三级，确认弹窗内才是红色主按钮

表单：与详情同宽的 surface 纸面，返回在纸外。纸内 10 分类选择网格，字段区只用边框与 canvas 底，不加阴影。编辑时分类不可改。编辑页同样有返回。

团队：同宽 surface 纸面，无返回。纸内抬头（标题 + 名额计数）+ 10 格进度 + 添加表单 + 成员列表。输入框用 canvas 底，标签在输入框上方。行前姓名首字圆印。

绑定页左说明右 QR 瓷砖，6 格验证码；核对通过后进入第二步展示 10 条恢复码，可下载、复制，点「已保存」进入保险库。QR 用当前 accent，须转成 hex 再交给 `qrcode`（该库不接受 `hsl()`）。空状态用大号分类瓷砖 + 新建。开锁为居中 `--elev-5` 面板，支持粘贴整串；「无法使用验证器？」切换为恢复码输入。个人资料同样是居中 `--elev-5` 面板：显示名可改（1–32 字），邮箱与角色只读，显示恢复码剩余条数，可生成或重新生成恢复码，可更换验证器。弹层用 portal 挂到 `document.body`，避开侧栏 `backdrop-filter` 的 stacking context；全屏 `ink/40` 遮罩，面板在视口居中，`z-50`。点遮罩或 Escape 关闭。更换验证器：当前 6 位数字或一条恢复码，再扫新二维码并填写新码，最后保存新恢复码。详情分享名单只列出 `active` 成员。

文案用中文。按钮动词与结果一致：开锁、封存、复制、下载、分享、收回、保存、已保存。禁止营销套话、文言和直译腔。

固定用语：

- TOTP：绑定验证器、完成绑定、更换验证器；不用「编排」
- 恢复码：恢复码；不用「备份码」「备用码」
- 应用：验证器；不用「认证器」
- 6 位数字：验证码；不用「确认码」
- 查看密文：查看、显示；不用「揭开」
- 分享统计：他人分享、我分享的；不用「收到的分享」「分出去的」
- 近 12 周图：更新趋势；不用「更新节律」
- 空状态：暂无记录；不用「抽屉」

### 组件

- `SealMark` 印记：与 favicon 同源的角色透明图，侧栏 30px（门页 40px），不加瓷砖底
- `Wordmark` 品牌字标：30px Imperial Script + 紫罗兰短行程渐变 + 辉光 / 火花 / 流线，只用于侧栏印记旁
- `AppShell` 应用侧栏 + 顶栏
- `BackLink` 返回
- `Button` 主 / 次 / 三级 / 危险，按层级分档
- `FolderTabs` 文件柜折页
- `CategoryIcon` 分类瓷砖
- `RecordCard` 索引卡
- `StatCard` 统计卡
- `charts` `StackedBar` `DonutRing` `WeekBars`
- `OtpBoxes` 六格验证码
- `RecoveryCodesCard` 恢复码清单
- `UnlockPanel` 开锁面板
- `Modal` 全屏遮罩弹层
- `ProfilePanel` 个人资料
- `EmptyState` `FieldBlock`

纸面瓷砖纹理是 canvas 材料，不是装饰。装饰只三处：印记、空状态构图、氛围光径向 mesh。

### 状态

骨架、空保险库、未开通、待绑定、TOTP 错误、锁定、无权限、删除确认。

复制成功用带勾的短提示。删除必须确认。

## 主题

尊重 `prefers-color-scheme`，提供手动切换，整站同一主题，不中途反转。
