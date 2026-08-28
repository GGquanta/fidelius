# Fidelius 安全模型

本方案是「平台信任 + 应用层加密」，不是零知识。Cloudflare 平台与持有 `MASTER_KEY` 的运维可以解密。

## 威胁模型

### 防护目标

- 未通过 Access 的请求不能进入应用
- 未开通、未绑定验证器、已停用用户不能读取记录
- KV 中的敏感字段、TOTP 密钥与恢复码哈希不以明文存储
- 列表接口永不返回秘密值
- 日志不打印密钥、TOTP、恢复码、PEM
- TOTP 与恢复码不可在线爆破

### 不防护

- 已通过 Access 且已开锁的合法用户的复制/截屏
- Cloudflare 账号被盗、`MASTER_KEY` 泄露
- 客户端恶意扩展读取 DOM
- KV 最终一致带来的短暂索引滞后

## Access

生产环境必须启用 Cloudflare Access。Worker 优先使用 `ctx.access.getIdentity()` 读取邮箱。启用 Static Assets 时，内部 router **不会**把 `ctx.access` 传给用户 Worker；此时必须校验请求头 `Cf-Access-Jwt-Assertion`：用 JWT 的 `iss`（须为 `https://<team>.cloudflareaccess.com`）拉 JWKS，校验签名后再取 `email`。不要信任未校验的 `cf-access-authenticated-user-email`。

`TEAM_DOMAIN` 与 `ACCESS_AUD` 为可选普通 var。未配置时仍按 JWT 自身的 `iss` 校验；若配置了则必须与令牌一致。不要把它们做成 Secret。

本地开发使用 `wrangler.jsonc` 的 `access.dev` 模拟身份。若当前 Wrangler 不识别该字段，非 production 环境会回退到 `BOOTSTRAP_ADMIN_EMAIL`。生产必须设置 `ENVIRONMENT=production` 并启用 Access。不要把模拟身份用于生产。

未登记邮箱返回 `{ code: "not_provisioned" }`。

## 信封加密

`MASTER_KEY` 为 32 字节，通过 `wrangler secret put MASTER_KEY` 注入，禁止写入源码或 `wrangler.jsonc`。

每条记录：

1. 生成随机 32 字节 DEK
2. 用 AES-256-GCM 加密 `fields` 的值 JSON
3. 用主密钥封装 DEK（AES-256-GCM）
4. KV 仅保存 `wrappedDek` 与 `secretsCipher`

用户 TOTP 密钥单独存 `totp:{userId}`，同样用主密钥加密。`otpauth` 与明文密钥只在绑定开始当次返回，确认后不可再读。

恢复码在绑定确认、更换验证器确认或重新生成时签发 10 条。明文只在当次响应中返回。KV `recovery:{userId}` 只保存 SHA-256 哈希（绑定 `userId`），再用主密钥加密。核销时等时长比较全部剩余哈希后再决定命中。列表、`GET /api/me` 与资料页只暴露剩余条数，不可再读明文。

更换验证器须先校验当前 TOTP 或一条未使用的恢复码（计入同一套锁定），再把新密钥写入 `enroll:{userId}`。旧密钥在确认新码之前仍有效。确认后覆盖 `totp:{userId}`、签发新恢复码并作废旧码、删除绑定临时键，并立即删除开锁会话与 Cookie。丢失验证器且没有剩余恢复码时不能自助重置，须管理员停用并重建用户。停用用户时删除 `recovery:{id}`。

IV / nonce 每次加密重新随机生成，与密文一并存储。

比较密钥、会话令牌、TOTP 码使用 `crypto.subtle.timingSafeEqual` 或等时长比较。随机数使用 `crypto.getRandomValues` / `crypto.randomUUID`，禁止 `Math.random()`。

## 开锁会话

`POST /api/unlock` 校验 TOTP 或一条未使用的恢复码后：

- 写入 KV `unlock:{userId}`，TTL 600 秒
- 设置 HttpOnly、Secure、SameSite=Strict Cookie `fidelius_unlock`

`POST /api/lock` 删除会话与 Cookie。

`reveal` 必须同时满足：Cookie 有效、KV 会话存在、会话属于当前用户。

## TOTP 防爆破

键 `lockout:{userId}` 记录失败次数。连续 5 次失败后 15 分钟内拒绝校验。成功开锁或成功核销恢复码清零。锁定期间返回 `{ code: "totp_locked" }`，不提示剩余次数。验证码或恢复码错误均返回 `{ code: "totp_invalid" }`，文案不区分哪一种。

TOTP 允许当前窗口及前后各一个窗口（共约 90 秒），防止时钟偏移。

## 本地开发旁路

`.dev.vars` 中的 `DEV_TOTP_BYPASS` 仅供本机调试。变量非空且 `ENVIRONMENT` 不是 `production` 时，验证码 `000000` 视为通过，不计入失败锁定。不要写入 `wrangler.jsonc` 或生产 Dashboard。生产硬关闭：`ENVIRONMENT=production` 时忽略该变量。

## 审计

记录级日志最近 100 条，字段：

- `at` ISO 时间
- `actorId`、`actorEmail`
- `action`：`create` | `update` | `share` | `unshare` | `delete` | `reveal`
- `detail`：字段名或被分享用户 id，不含秘密值

开锁成功记在用户侧，不写入记录审计（避免把「谁在看」与字段值关联进同一条明文）。

## 密钥轮转

轮转 `MASTER_KEY` 需要离线重加密全部 `record:*`、`totp:*` 与 `recovery:*`。第一期不提供自动轮转工具。丢失主密钥等于丢失全部秘密，无法恢复。

## 日志纪律

结构化日志只允许：request id、user id、record id、action、error code。禁止记录 Authorization、Cookie、TOTP、恢复码、字段值、PEM。
