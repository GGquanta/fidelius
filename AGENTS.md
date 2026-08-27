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
- KV 中敏感字段与 TOTP 必须加密
- 列表与 GET 详情不得返回秘密值
- 随机数用 Web Crypto，比较用等时长
- 不要把 `MASTER_KEY` 写进 `wrangler.jsonc`

## 设计禁区

- 不要用 Inter、Lucide、蓝紫渐变、厚阴影、左侧色条
- 不要用装饰衬线、emoji、营销套话
- 动效只服务开锁/状态反馈
- 中文文案，按钮动词与结果一致

## 测试

- 覆盖：编排、开锁失败锁定、CRUD 权限、只读分享、未开锁不能 reveal
- 测试中的秘密值使用明显假数据，如 `test-password-not-real`

## 本地身份

开发默认使用 `access.dev` 模拟 `BOOTSTRAP_ADMIN_EMAIL`。不要把模拟身份提交为生产配置。
