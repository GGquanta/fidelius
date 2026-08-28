# Fidelius

小团队敏感信息保险库。Cloudflare Workers + KV。Access 控制进站，TOTP 控制开锁。

规范：`SPEC.md`、`DESIGN.md`、`SECURITY.md`、`docs/templates.md`。

## 要求

- Node 20+
- Cloudflare 账号
- 验证器应用（绑定 TOTP）

## 本地开发

```bash
npm install
openssl rand -base64 32
```

将 32 字节密钥写入 `.dev.vars`：

```
MASTER_KEY=<base64-32-bytes>
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
```

`.dev.vars` 不要提交。

```bash
npm run dev
```

本地 `ENVIRONMENT=development` 时，若没有 Access 身份，会回退到 `BOOTSTRAP_ADMIN_EMAIL`，方便开发。生产必须设置 `ENVIRONMENT=production` 并启用 Access。

## 脚本

- `npm run dev` 本地开发
- `npm run build` 构建
- `npm run build:production` 按 `env.production` 构建（Workers Builds 用）
- `npm run types` 生成 Worker 类型
- `npm test` 测试
- `npm run deploy` 部署

## 生产

推荐用 Dashboard 连接 GitHub，由 Workers Builds 发布，不要本机 `wrangler deploy`。

KV 绑定不要写占位 id。部署时 Wrangler 会自动创建 `FIDELIUS` 命名空间。

1. 生产分支 `main`。Build command 设为 `npm run build:production`（或构建变量 `CLOUDFLARE_ENV=production` 再跑 `npm run build`）。Deploy command：`npx wrangler deploy`。关闭非生产分支构建。
2. Worker → Variables and Secrets：Secret `MASTER_KEY`（32 字节 base64）；Var 填写真实 `BOOTSTRAP_ADMIN_EMAIL`、`TEAM_DOMAIN`（`https://<team>.cloudflareaccess.com`）、`ACCESS_AUD`（Access 应用 Audience）。`env.production` 已开 `keep_vars`，Dashboard 里的值不会被构建清掉。
3. Worker → Access → All traffic。自定义域名在 Access 之后再绑。`workers_dev` 与 Preview URL 已在 `env.production` 关闭。

丢失 `MASTER_KEY` 无法恢复已有记录。不要把 `MASTER_KEY` 写进 `wrangler.jsonc`。顶层 `access.dev` 只给本地，不要当生产身份。

## 使用顺序

1. 首任管理员用匹配邮箱通过 Access 进入，完成验证器绑定
2. 在团队页添加成员邮箱
3. 成员首次进入完成绑定
4. 创建记录；查看敏感内容前开锁
