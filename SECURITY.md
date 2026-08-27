# Fidelius 安全模型

本方案是「平台信任 + 应用层加密」，不是零知识。Cloudflare 平台与持有 `MASTER_KEY` 的运维可以解密。

## 威胁模型

### 防护目标

- 未通过 Access 的请求不能进入应用
- 未开通、未编排、已停用用户不能读取记录
- KV 中的敏感字段与 TOTP 密钥不以明文存储
- 列表接口永不返回秘密值
- 日志不打印密钥、TOTP、PEM
- TOTP 不可在线爆破

### 不防护

- 已通过 Access 且已开锁的合法用户的复制/截屏
- Cloudflare 账号被盗、`MASTER_KEY` 泄露
- 客户端恶意扩展读取 DOM
- KV 最终一致带来的短暂索引滞后

## Access

生产环境必须启用 Cloudflare Access。Worker 使用 `ctx.access.getIdentity()` 读取邮箱，并校验 `Cf-Access-Jwt-Assertion` 作为兜底。

本地开发使用 `wrangler.jsonc` 的 `access.dev` 模拟身份。若当前 Wrangler 不识别该字段，非 production 环境会回退到 `BOOTSTRAP_ADMIN_EMAIL`。生产必须设置 `ENVIRONMENT=production` 并启用 Access。不要把模拟身份用于生产。

未登记邮箱返回 `{ code: "not_provisioned" }`。

## 信封加密

`MASTER_KEY` 为 32 字节，通过 `wrangler secret put MASTER_KEY` 注入，禁止写入源码或 `wrangler.jsonc`。

每条记录：

1. 生成随机 32 字节 DEK
2. 用 AES-256-GCM 加密 `fields` 的值 JSON
3. 用主密钥封装 DEK（AES-256-GCM）
4. KV 仅保存 `wrappedDek` 与 `secretsCipher`

用户 TOTP 密钥单独存 `totp:{userId}`，同样用主密钥加密。`otpauth` 与明文密钥只在编排开始当次返回，确认后不可再读。

IV / nonce 每次加密重新随机生成，与密文一并存储。

比较密钥、会话令牌、TOTP 码使用 `crypto.subtle.timingSafeEqual` 或等时长比较。随机数使用 `crypto.getRandomValues` / `crypto.randomUUID`，禁止 `Math.random()`。

## 开锁会话

`POST /api/unlock` 校验 TOTP 后：

- 写入 KV `unlock:{userId}`，TTL 600 秒
- 设置 HttpOnly、Secure、SameSite=Strict Cookie `fidelius_unlock`

`POST /api/lock` 删除会话与 Cookie。

`reveal` 必须同时满足：Cookie 有效、KV 会话存在、会话属于当前用户。

## TOTP 防爆破

键 `lockout:{userId}` 记录失败次数。连续 5 次失败后 15 分钟内拒绝校验。成功开锁清零。锁定期间返回 `{ code: "totp_locked" }`，不提示剩余次数。

TOTP 允许当前窗口及前后各一个窗口（共约 90 秒），防止时钟偏移。

## 审计

记录级日志最近 100 条，字段：

- `at` ISO 时间
- `actorId`、`actorEmail`
- `action`：`create` | `update` | `share` | `unshare` | `delete` | `reveal`
- `detail`：字段名或被分享用户 id，不含秘密值

开锁成功记在用户侧，不写入记录审计（避免把「谁在看」与字段值关联进同一条明文）。

## 密钥轮转

轮转 `MASTER_KEY` 需要离线重加密全部 `record:*` 与 `totp:*`。第一期不提供自动轮转工具。丢失主密钥等于丢失全部秘密，无法恢复。

## 日志纪律

结构化日志只允许：request id、user id、record id、action、error code。禁止记录 Authorization、Cookie、TOTP、字段值、PEM。
