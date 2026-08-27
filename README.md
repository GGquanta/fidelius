# Fidelius

小团队敏感信息保险库。Cloudflare Workers + KV。Access 控制进站，TOTP 控制开锁。

规范：`SPEC.md`、`DESIGN.md`、`SECURITY.md`、`docs/templates.md`。

## 要求

- Node 20+
- Cloudflare 账号
- 认证器应用（编排 TOTP）

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
- `npm run types` 生成 Worker 类型
- `npm test` 测试
- `npm run deploy` 部署

## 生产

1. 创建 KV：`npx wrangler kv namespace create FIDELIUS`，把 id 填进 `wrangler.jsonc`
2. 自定义域名绑定到 Worker
3. 在 Zero Trust 为该域名启用 Access
4. 注入密钥：

```bash
npx wrangler secret put MASTER_KEY
```

5. 在 `wrangler.jsonc` 中把 `ENVIRONMENT` 设为 `production`，并设置真实 `BOOTSTRAP_ADMIN_EMAIL`
6. 删除或不要在生产环境使用 `access.dev` 模拟块
7. `npm run deploy`

丢失 `MASTER_KEY` 无法恢复已有记录。

## 使用顺序

1. 首任管理员用匹配邮箱通过 Access 进入，完成 TOTP 编排
2. 在用户页添加成员邮箱
3. 成员首次进入完成编排
4. 创建记录；查看秘密前开锁
