# AGENTS.md

本仓库是 Fidelius，小团队敏感信息保险库。实现必须符合 `SPEC.md`、`DESIGN.md`、`SECURITY.md`、`docs/templates.md`。改行为先改文档。

## 技术约束

- 运行时：Cloudflare Workers + KV，不要引入 D1、DO、R2
- 前端：React + TypeScript + Tailwind v4
- API：Hono，只挂 `/api/*`
- 绑定类型用 `wrangler types` 生成，不要手写 `Env`
- `compatibility_date` 保持接近当天
- 启用 `nodejs_compat` 与 `observability`

## 安全

- 禁止在源码、测试夹具、日志、README 示例里写入真实密钥
- KV 中敏感字段、TOTP 与恢复码哈希必须加密
- 列表与 GET 详情不得返回秘密值
- 随机数用 Web Crypto，比较用等时长
- 不要把 `MASTER_KEY` 写进 `wrangler.jsonc`
- 生产 Dashboard var（`BOOTSTRAP_ADMIN_EMAIL`、`TEAM_DOMAIN`、`ACCESS_AUD`）不要写进 `env.production.vars`；`keep_vars` 必须在 wrangler 顶层；部署带 `--keep-vars`

## 设计禁区

- 不要用 Inter、Lucide、emoji、营销套话、装饰衬线。品牌字标「Fidelius」可用花体 Imperial Script，仅此一处
- 不要用左侧色条；分类色用折页、瓷砖、折角表达
- 渐变只允许三种，色相行程 ≤40°，同一色阶内取两站：
 1. 主按钮：violet-500 → violet-600 垂直受光，配 inset 亮边
 2. 品牌氛围光：径向 mesh，紫罗兰 + 蜜桃，alpha ≤ 0.08
 3. 折页与瓷砖纸面：分类浅底 → surface 垂直接光
- canvas 纸面可叠淡方格瓷砖纹理（材料，非第四种渐变）；砖面明度须打散，禁止规则循环；色相贴近蜜桃粉；纹理须可辨认、勿过浓；顶部用半透明 canvas 渐变近隐
- 侧栏底与未激活页签栏为毛玻璃（半透明 canvas + blur），不要实色盖住纸面
- 禁止文字渐变、彩虹渐变、紫→青长行程、给所有边框套渐变。品牌字标「Fidelius」除外：仅允许 violet-400 → violet-600 垂直短行程，与主按钮同一色阶
- 阴影只用五档两段式 elevation，alpha `.04–.18`，暖色 `hsla(24, 20%, 13%, …)`
- 仪式仅开锁与品牌字标辉光火花；其余只做状态反馈与纸面转场。导航与列表只允许颜色过渡，禁止交错飞入与粒子。令牌与类名见 `DESIGN.md` 动效节
- 中文文案，按钮动词与结果一致

## 测试

- 覆盖：绑定验证器、开锁失败锁定、CRUD 权限、只读分享、未开锁不能 reveal、新分类校验、自己改显示名、更换验证器、签发恢复码、恢复码一次性消费、恢复码与 TOTP 共用锁定、reset 接受恢复码、重新生成作废旧码、生产 Access JWT 身份、本地 `DEV_TOTP_BYPASS` 仅非生产对 `000000` 生效、审计分页每页 10 条
- 测试中的秘密值使用明显假数据，如 `test-password-not-real`

## 本地身份

开发默认使用 `access.dev` 模拟 `BOOTSTRAP_ADMIN_EMAIL`。不要把模拟身份提交为生产配置。本地可设 `DEV_TOTP_BYPASS` 让 `000000` 通过 TOTP；不要写进 `wrangler.jsonc` 或生产配置。
