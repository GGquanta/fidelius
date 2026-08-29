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
- `BOOTSTRAP_ADMIN_EMAIL` var（生产由 Dashboard 注入，不要写进 `env.production.vars`）
- `TEAM_DOMAIN`、`ACCESS_AUD` var（生产校验 Access JWT；由 Dashboard 注入）
- `ASSETS`
- `DEV_TOTP_BYPASS` 仅存在于本地 `.dev.vars`，不是 Worker 绑定，不要写进 `wrangler.jsonc`

`vars` 对 named environment 不可继承。`env.production.vars` 只有 `ENVIRONMENT=production`。Dashboard 里多出来的 plaintext var 靠 wrangler **顶层** `keep_vars` 以及部署命令 `--keep-vars` 保留；`keep_vars` 写在 `env.*` 下会被忽略，下一次部署会删掉这些变量。`MASTER_KEY` 是 Secret，部署不会删。

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
| PATCH | `/api/records/:id` | 所有者部分更新：`title` / `description` 未开锁可改；带 `fields` 须开锁，否则 `unlock_required`；`category` 不可改 |
| DELETE | `/api/records/:id` | 所有者删除 |
| POST | `/api/records/:id/reveal` | 需开锁，返回字段值 |
| POST | `/api/records/:id/share` | `{ userId }` |
| DELETE | `/api/records/:id/share/:userId` | 收回 |
| GET | `/api/records/:id/audit` | 审计，`?offset=&limit=`，默认每页 10 条，`limit` 上限 10；返回 `{ entries, total }` |
| GET | `/api/users` | admin |
| POST | `/api/users` | `{ email, displayName }` |
| POST | `/api/users/:id/disable` | 停用 |

错误码：`not_provisioned`、`pending_enroll`、`disabled`、`forbidden`、`totp_invalid`、`totp_locked`、`unlock_required`、`user_limit`、`user_has_records`、`not_found`、`validation`。

## 界面

定位：摆在偏米黄的亮纸面上的紫罗兰色文件柜。生动感来自分类色、拟物折页和大号数字，而不是满屏渐变。

旋钮：方差 7、动效 5、密度 5。

路由：`/` 概览，`/vault` 保险库（`?category=` `?q=`），`/new` 新建条目（`?category=` 预选分类，缺省为通用），`/records/:id` 详情，`/records/:id/edit` 编辑，`/users` 团队（admin）。

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

- 服务器 268° 紫罗兰 · HardDrive
- 数据库 158° 薄荷 · Database
- SSL 证书 205° 天青 · AwardCertificate
- API 密钥 42° 琥珀 · Code
- 登录账号 338° 玫粉 · Fingerprint
- 云平台 232° 靛蓝 · Cloud
- 域名与 DNS 90° 青柠 · Globe
- 网络 182° 蓝绿 · Wifi
- 恢复码 12° 珊瑚 · Lifebuoy
- 通用 32° 暖石 · ThreeDCube
- 全部 暖墨 · FolderOpen

圆角随尺寸升档：8 / 12 / 18 / 26px。主按钮用 violet-500 → violet-600 垂直渐变 + inset 亮边。

高度五档两段式，阴影色 `hsla(24, 20%, 13%, …)`，alpha `.04–.18`。

字体：DM Sans Variable（拉丁）、霞鹜 975 圆体 SC 400（汉字，自托管 WOFF2）、Imperial Script（仅品牌字标「Fidelius」）、Lato（指标数字）、Geist Mono（秘密值、密钥、时间）。≥30px 展示标题同一套。指标数字用 Lato `tabular-nums`，只挂 `.font-metric`，含统计卡、分类条数、名额、图例与侧栏计数。字体一律自托管，禁止 `fonts.googleapis.com` / `fonts.gstatic.com`。

图标：Reicon Outline（`reicon-react`），导航 16px，瓷砖 20px。不要用 Lucide、Phosphor。

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
| 印记字标   |  搜索                      主题  设置 |
| 概览       |---------------------------------------|
| 全部       |  主内容                               |
|   分类…    |                                       |
| 团队       |                                       |
| 用户卡     |                                       |
+------------+---------------------------------------+
```

`md`（768px）以下侧栏不占文档流。顶栏变为工具条：左汉堡（Reicon `Menu`，40px 触控）+ 印记与字标，右搜索 / 主题 / 设置三个同档图标按钮。柜面不再重复印记字标。汉堡打开时按钮为 `bg-accent-soft text-accent-ink`，图标不换成叉、不做条形变形。点汉堡后柜面从顶栏下沿左侧滑入，宽度 `min(272px, 100vw - 48px)`，盖住主纸；遮罩 `.fx-overlay` + `ink/40`、`z-40` 盖住顶栏以下的纸面，不盖顶栏，汉堡保持可点。弹层仍 `z-50`，资料与设置可盖在柜面上。点遮罩、再点汉堡、Escape、换页、点概览 / 分类 / 团队即关上；展开分类树不关。`md` 起恢复固定 272px 侧栏与柜内字标，并清掉打开态。柜面底加 `safe-area-inset-bottom`。`viewport-fit=cover`。

窄屏顶栏高仍 64px，左右 `px-4`（`md` 起 `px-6`），并加 `safe-area-inset-top`。搜索默认是 40px 图标按钮（Magnifier，与主题同档），放在主题左侧；点开后字标让位，输入框铺满中间，占位「搜索」，16px 以免 iOS 聚焦放大，按钮保持 `accent-soft`。再点按钮或 Escape 收起（不清空已输入）。有搜索词时按钮维持选中。`md` 起搜索常驻顶栏左侧，占位「搜索标题或描述」，14px。主题与设置同为 40px 触控。开锁仍不出现在侧栏、顶栏、概览、保险库列表。

侧栏 272px，底为毛玻璃：半透明 canvas + `backdrop-filter` 模糊纸面纹理，与主区用一根 hairline 分开，让纸面坐在前面。`prefers-reduced-transparency` 时退回实色 canvas。结构：

- 顶：`md` 起印记 30px（与 favicon 同源的角色透明图）+ 花体字标「Fidelius」（30px Imperial Script，violet-400 → violet-600 垂直短行程，紫罗兰 + 蜜桃辉光，四角星火花与细流线），与印记间距 24px，不是链接，无脚注、无分隔线。窄屏印记与字标改到顶栏汉堡右侧，柜面从工作台起排。字标辉光与火花是印记装饰，不把粒子铺到导航。`prefers-reduced-motion` 时火花静止。文档标题为「Fidelius · 密钥保管库」
- 工作台：12px 分组标题 + 概览
- 保险库：12px 分组标题（与工作台、管理同一档 tracking tertiary）+ 可展开树。父行是「全部」+ 总数 + 折页箭头（展开 ChevronDown，收起 ChevronLeft）；子项为 10 个分类（20px 瓷砖、名称、计数），相对父行左缩进 12px，不要左侧竖轨，不再重复「全部」。子项行高 36px，左右内边距 12px，与父行同档，行距 12px。点选写入 `/vault?category=`。选中全部时高亮父行，选中分类时高亮对应子项。展开收起用 `grid-template-rows` 180ms，收起时子项完全裁切；不做交错飞入
- 侧栏未选中项 hover 用 ink 以 16% 混入透明底（暗色 20%），在毛玻璃上才能读出；不用 `--hover`（与 canvas 过近）。选中仍为 accent-soft。
- admin 见团队：12px 分组标题「管理」+ 团队
- 底：用户卡可点（圆印、显示名、角色），打开个人资料面板。卡本身有边框，不是一条裸 footer

选中用 accent-soft 铺底，不用左侧色条。`md` 起顶栏左搜索、右主题切换与设置（图标按钮，`fx-hover rounded-box`，40px 触控）。设置打开时该按钮为 `bg-accent-soft text-accent-ink`。主题不进设置面板。主栏 `main` 带品牌氛围光，保险库、详情、新建、团队与概览同一层纸面光。开锁不出现在侧栏、顶栏、概览、保险库列表。主纸外边距窄屏 `px-4 py-5`，`md` 起 `px-6 py-6`。

### 开锁

只在记录详情与编辑页、需要查看敏感值时提供开锁。离开 `/records/*` 立即 `POST /api/lock`。概览与保险库列表永不展示开锁。本机「定时封存」开启时，从开锁起按所选秒数墙钟倒计时，不因指针、键盘或滚动重置；到期 `POST /api/lock`。本机「离开页面时封存」默认关闭；开启后标签页隐藏或窗口失焦同样封存。

开锁是唯一仪式高潮：遮罩 180ms 淡入，面板 `.rise`；打开后焦点落到第一格验证码，切到恢复码时落到恢复码输入；验证失败时六格抖动并改危险描边；成功后锁印切换，约 480ms 再退出；字段从骨架 `.fx-unmask` 成明文。开锁条与「已开锁」行短交叉淡入。离开本页封存不弹 toast。定时封存到期 toast「已自动封存」。切走标签页或窗口失焦封存不 toast。

已开锁条：定时封存开启时写「已开锁 · n 秒后封存」，剩余不足 10 秒改为 `text-peach-ink`（只变动颜色）。关闭定时封存时维持「已开锁，离开本页会自动封存」。

### 概览 `/`

数据全部由 `GET /api/records` 与 `GET /api/users` 在前端聚合，不新增聚合接口。

- 问候 + 新建。记录列表未到时统计、图表、瓷砖计数与近更为骨架，不要把 `0` 或「暂无记录」当数据条目
- 四张统计卡：全部 / 我的 / 他人分享 / 我分享的。窄屏两列、数字 30px、内边距 16px；`md` 起数字 48px、内边距 20px；`xl` 四列。大数字只用于统计卡
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
- 纸内记录卡只用边框与 canvas 底，禁止再加阴影。卡 hover 只换 `--hover` 底，不加抬升。卡用 `auto-fill` + `minmax(360px, 1fr)` 网格，避免拉满大屏后标题漂在一行里；窄于 360px 时一列
- 页签本身只做颜色与描边 180ms，不弹跳、不加粒子。纸内网格随分类切换短交叉淡入。列表一次取全量，分类与搜索在前端滤；未到时页签计数与纸内卡用 `.fx-shimmer`，禁止先画 `0`
- 分类无记录：大号瓷砖 + 该分类用途说明（见 `docs/templates.md`）+ 新建条目。搜索无结果写「没有与「…」匹配的记录」，不套用途文案

### 其他页

详情、新建/编辑与团队都是一张纸，整页 `max-width: 1200px` 居中，避免拉满大屏后控件漂在空白里。

- 顶行：带方框箭头的「返回保险库」，不是裸文字
- 纸内抬头一行：左 44px 分类瓷砖 + 分类名 / 标题 / 描述；右 编辑与 删除同档软底、以色相分工（编辑 `accent-soft` / `accent-ink`，删除 `danger-soft` / `danger-ink`），与标题顶对齐，窄屏时操作折到标题下
- 其下两栏：左字段、右 320px 元数据，只用一根竖线分区，不用散落小卡片
- 字段上下排列：标签行（左标签、右复制/下载）+ 下方整行圆角 `sunken` 底矩形承载值，自动换行。按钮始终可见，不靠 hover 才出现。未开锁时矩形内为骨架，形状与明文一致
- 操作记录限高滚动，不一次拉全量：首屏 10 条，滚近底部再要下一批 10 条；存储仍最多 100 条
- 未开锁时在字段区顶提供开锁条（锁印 + 说明 + 开锁主按钮，按钮左侧开锁印）。已开锁时锁印 + 淡说明 + 封存（按钮左侧闭锁印；蜜桃色相，比 `peach-soft` 略实，避免与删除的危险浅底撞色）。窄屏时说明与按钮上下排列，按钮通栏，避免与长文案争一行。离开 `/records/*` 立即封存，不弹 toast
- 删除在抬头为危险浅底，确认弹窗内才是红色实心主按钮
- 分享：`Select` 与分享按钮同一行。分享按钮与编辑同档 `accent-soft` / `accent-ink`，左侧分享印。成员用自定义 `Select`，不用原生 `<select>`；选项带姓名首字圆印，菜单 portal 到 `document.body`，避免纸面 `overflow` 裁切

表单：与详情同宽的 surface 纸面，返回在纸外。纸内字段区只用边框与 canvas 底，不加阴影。新建用 10 分类选择网格，默认分类为通用；从保险库某分类页签或空状态进入时带 `?category=` 预选该分类。编辑时分类只读（瓷砖 + 名称，不是禁用网格）。未开锁可改并保存标题与描述，不展示字段列表；字段区换成相对 surface 纸面可辨的 `sunken` 大卡（高度约 320px），文案居中「字段已封存。开锁后才能改。」；已开锁才显示字段并可改。保存：未开锁只提交标题和描述；已开锁提交标题、描述和字段，不传分类。提示：未开锁写「分类创建后不能改。未开锁时保存只提交标题和描述；开锁后才能改字段。」；已开锁写「分类创建后不能改。已开锁，保存会写入标题、描述和字段。」编辑页同样有返回。中途开锁只补字段明文，不覆盖已改的标题与描述。

团队：同宽 surface 纸面，无返回。纸内抬头（标题 + 名额计数）+ 10 格进度 + 添加表单 + 成员列表。输入框用 canvas 底，标签在输入框上方。添加表单为邮箱、显示名与添加成员同一行，输入与主按钮同高 40px；「添加成员」左侧加人印。行前姓名首字圆印。

绑定页左说明右 QR 瓷砖，6 格验证码；核对通过后进入第二步展示 10 条恢复码，可下载、复制，点「已保存」进入保险库。竖向内边距窄屏 `py-8`，`md` 起 `py-16`。QR 用当前 accent，须转成 hex 再交给 `qrcode`（该库不接受 `hsl()`）。空状态用大号分类瓷砖 + 当前分类用途说明 + 新建条目。开锁为居中 `--elev-5` 面板，打开即聚焦第一格验证码，支持粘贴整串；「无法使用验证器？」切换为恢复码输入并聚焦该框。提交「开锁」左侧开锁印。个人资料同样是居中 `--elev-5` 面板：显示名可改（1–32 字），邮箱与角色只读，显示恢复码剩余条数，可生成或重新生成恢复码，可更换验证器。设置面板同档居中 `--elev-5`，略宽（约 440px）：抬头设置瓷砖 + 「设置」+ 「只保存在这台浏览器」；分组「安全」下一张描边分组卡，两行开关（定时封存、离开页面时封存；后者默认关），第一行内三档滑块（15 / 30 / 60 秒）：`sunken` 轨道 + accent 圆钮，无抬升阴影；档位名在轨道下方，选中为 ink、其余 tertiary。开关即时写入 `localStorage` 键 `fidelius-settings`，无保存按钮。弹层用 portal 挂到 `document.body`，避开侧栏 `backdrop-filter` 的 stacking context；全屏 `ink/40` 遮罩，面板在视口居中，`z-50`。点遮罩或 Escape 关闭。更换验证器：当前 6 位数字或一条恢复码，再扫新二维码并填写新码，最后保存新恢复码。详情分享名单只列出 `active` 成员。

文案用中文。按钮动词与结果一致：开锁、封存、复制、下载、分享、收回、保存、已保存。禁止营销套话、文言和直译腔。

固定用语：

- TOTP：绑定验证器、完成绑定、更换验证器；不用「编排」
- 恢复码：恢复码；不用「备份码」「备用码」
- 应用：验证器；不用「认证器」
- 6 位数字：验证码；不用「确认码」
- 查看密文：查看、显示；不用「揭开」
- 分享统计：他人分享、我分享的；不用「收到的分享」「分出去的」
- 近 12 周图：更新趋势；不用「更新节律」
- 空状态：还没有某类记录 + 用途；搜索无结果用「没有匹配」；不用「抽屉」

### 组件

- `SealMark` 印记：与 favicon 同源的角色透明图，侧栏与窄屏顶栏 30px（门页 40px），不加瓷砖底
- `Wordmark` 品牌字标：30px Imperial Script + 紫罗兰短行程渐变 + 辉光 / 火花 / 流线；`md` 起在侧栏印记旁，窄屏改到顶栏汉堡右侧。字标辉光不铺到导航项
- `AppShell` 应用侧栏 + 顶栏；窄屏汉堡打开左滑柜面，同一棵导航树，不复制侧栏
- `BackLink` 返回
- `Button` `ButtonLink` 主 / 次 / 三级 / 危险实心；另有 `accent` `peach` `danger-soft` 同档软底，以色相分工。文案一律 DM Sans 14 / 400、`leading-none`，图标与文字竖直居中；链接与按钮同一套类。`Button` 的 `busy` 为进行中：禁用、`aria-busy`、左侧自旋印，标签仍是原动词
- `Skeleton` 骨架条：`.fx-shimmer`，形状贴近终态
- `Select` 自定义列表选择，canvas 底、surface 菜单、`--elev-3`
- `FolderTabs` 文件柜折页
- `CategoryIcon` 分类瓷砖
- `RecordCard` 索引卡
- `StatCard` 统计卡
- `charts` `StackedBar` `DonutRing` `WeekBars`
- `OtpBoxes` 六格验证码
- `AuditLog` 操作记录，限高滚动、每页 10 条
- `RecoveryCodesCard` 恢复码清单
- `UnlockPanel` 开锁面板
- `Modal` 全屏遮罩弹层
- `ProfilePanel` 个人资料
- `SettingsPanel` 本机设置
- `Toggle` 开关
- `EmptyState` `FieldBlock`

纸面瓷砖纹理是 canvas 材料，不是装饰。装饰只三处：印记、空状态构图、氛围光径向 mesh。

### 状态

骨架、空保险库、未开通、待绑定、TOTP 错误、锁定、无权限、删除确认。

加载 ≠ 空。数据未到时用与终态同形的骨架占位；空才写「暂无记录」。禁止用 `0`、`…`、「加载中」顶真实数字或标题。

- 会话 `GET /api/me`：门页构图，印记 + 两三根条，不先画假壳（避免闪未开通 / 停用）
- 概览：四卡数字、条/环、10 分类瓷砖计数、近更 5 行、周柱；admin 名额位一并占住，避免卡片后插
- 保险库：页签计数与纸内记录卡
- 详情：整张纸（抬头瓷砖 + 标题、字段 sunken、侧栏时间 / 审计）
- 编辑：纸面字段；未返回前表单不出现、不可填
- 团队：抬头计数、进度条、若干成员行
- 侧栏：保险库与分类计数

写操作进行中：按钮 `busy`（禁用 + `aria-busy` + 左侧 `.fx-spin`），标签仍是原动词，不改成「保存中」。进行中忽略再次提交。覆盖保存、开锁、封存、分享、收回、删除、添加成员、停用、绑定「继续」、资料保存。

复制成功用带勾的短提示。删除必须确认。

### 动效

流体 CSS + 少量进退场，不上滚动劫持。关闭动效后信息架构与操作路径仍完整可读。

令牌：`--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`；`--dur-press` 120ms、`--dur-hover` 180ms、`--dur-enter` 280ms、`--dur-ceremony` 420ms。只动画 `transform` / `opacity` / `color` / `background-color` / `border-color` / `box-shadow`，以及开锁揭幕允许一次短 `filter: blur`。禁止动画 `top` `width` `height`。

声明式类：

- `.fx-press`：active `scale(0.98)`，主按钮与 CTA
- `.fx-hover`：180ms 色 / 底 / 边框
- `.rise`：8px 上移淡入 280ms，弹层、门页、空状态、纸面进入
- `.fx-exit`：反向淡出微缩，弹层与 toast 关闭
- `.fx-shake`：水平 6px 两振 200ms，验证码失败
- `.fx-unmask`：模糊 4px→0 + 透明度，开锁后字段
- `.fx-shimmer`：骨架高光扫过，列表与页面加载
- `.fx-spin`：按钮 busy 自旋，只转 `transform`
- `.fx-copy`：勾图标短脉冲
- `.fx-drawer`：柜面 `translateX(-100%) → none`，`--dur-enter`；只用于窄屏侧栏。`md` 起 `transform: none`，不播滑入

换页：React Router View Transitions。`md` 起侧栏 `view-transition-name: sidebar` 不参与变形；窄屏关掉该名字，避免藏在屏外的柜面被快照。主栏内容 `paper` 交叉淡入约 220–280ms。不支持该 API 的浏览器只播新页 `.rise`。同页折页切分类不用整页转场，只淡入纸内网格。窄屏打开柜面时锁 `body` 滚动；关上后焦点回到汉堡。

Toast 自底部滑入，距底 `max(24px, safe-area-inset-bottom)`，1600ms 后淡出；单条、不堆叠。窄屏柜面遮罩沿用 `.fx-overlay`，关上时 `useExitPresence` 等 280ms 再卸遮罩。弹层打开沿用 `.rise`，关闭延迟卸载约 200ms 以播 `.fx-exit`。设置开关圆钮只动画 `translateX`，轨道改 `background-color`（`--dur-hover`）；时长滑块圆钮沿轨道吸附三档，轨道与钮只改色、无阴影抬升。绑定页左说明保留，右栏纸面交叉替换。

借鉴：Design Spells（按压、骨架、抖动、toast、遮罩）、Transitions.dev / View Transitions（侧栏固定、主纸淡入）、Linear（短时长、单一缓动、hover 只改色）、保险库产品的开锁仪式。明确不引入 GSAP、Lenis、Barba、WebGL、列表交错飞入、卡片 3D tilt、磁吸按钮、自定义光标、打字解码、odometer、`motion` 库。字标火花不铺到导航或记录卡。

`prefers-reduced-motion` 时时长归零，字标火花静止，shimmer 与 spin 关闭。

## 主题

尊重 `prefers-color-scheme`，提供手动切换，整站同一主题，不中途反转。
