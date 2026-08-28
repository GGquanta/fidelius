# Fidelius 浏览器 E2E 测试报告

对照 `SPEC.md` 用户故事与 `DESIGN.md` 界面约定，在清空本地 KV 后以 bootstrap 管理员走完整界面流程。

| 项 | 值 |
| --- | --- |
| 时间 | 2026-08-28 10:58–11:20 CST |
| 工具 | Chrome DevTools MCP |
| 地址 | `http://localhost:5174/` |
| 身份 | `admin@example.com`（`access.dev`） |
| 数据 | 本地 KV 已重置 |
| API 测试 | `npm test` · `test/api.spec.ts` · 9 passed |

**12 通过 · 1 失败 · 2 部分通过 · 6 项浏览器跳过**

## 阻塞：更换验证器

个人资料里核对当前验证码后，`POST /api/enroll/reset/start` 返回 200，但页面报错 `Invalid hex color: hsl(268, 70%, 58%)`。

`ProfilePanel` 把 CSS 变量 `--accent`（HSL）传给 `qrcode` 的 `color.dark`，该库只接受 hex。绑定页用的是写死的 `#8F49DF`，所以首次绑定能过。对应 SPEC 故事 9。

## 用例结果

身份固定为管理员。成员绑定、共享者只读、停用者门页无法在浏览器切换账号复现。

| # | 用例 | SPEC | 结果 | 实际 |
| --- | --- | --- | --- | --- |
| 1 | 绑定验证器 | 故事 1 | 通过 | 错误码显示「验证码不正确」；正确码进入工作台。`enroll/confirm` 两次 400 后一次 200。 |
| 2 | 概览与导航 | DESIGN `/` | 通过 | 问候、四张统计卡、分类瓷砖「暂无记录」、侧栏团队与用户卡。概览无开锁。有数据后全部/我的为 1。 |
| 3 | 按模板新建服务器 | 故事 3 | 通过 | 空密码+私钥返回「密码与 SSH 私钥至少填写一项」。补全后 201，详情标题 `jump-host`。 |
| 4 | 保险库列表 | DESIGN `/vault` | 通过 | 页签、搜索「jump-host」、数据库分类空状态。卡片与 `GET /api/records` 均无密文。 |
| 5 | 开锁、复制、下载 | 故事 4 | 通过 | 未开锁遮罩；reveal 401 `unlock_required`。开锁后明文、复制/下载按钮、审计「查看」。reveal 200。 |
| 6 | 离开即封存 | DESIGN 开锁 | 通过 | 返回保险库触发 `POST /api/lock` 200。再进详情需重新开锁。 |
| 7 | 编辑 | 记录 CRUD | 通过 | 未开锁：分类按钮禁用、字段空、保存禁用。开锁后改描述并保存，详情显示 `lab gateway updated`。 |
| 8 | 添加成员 | 故事 2 管理员侧 | 通过 | 名额 1/10 → 添加 `member@example.com` → 待绑定、2/10。成员首次绑定未测。 |
| 9 | 只读分享与收回 | 故事 5–6 | 部分 | 下拉可选「成员」，提交 `POST /share` 400「只能分享给已绑定验证器的成员」。happy path 需 active 成员。 |
| 10 | 删除须确认 | DESIGN | 通过 | 取消后记录仍在。确认删除 `intranet-login` 后回到保险库，登录分类计数归零。 |
| 11 | 停用用户 | 故事 7 管理员侧 | 通过 | 成员变为「已停用」，名额回到 1/10。被停用者门页未测。 |
| 12 | 改显示名 | 故事 8 | 通过 | 邮箱只读。空白名保存禁用。改为「阿波罗」后侧栏用户卡更新。 |
| 13 | 更换验证器 | 故事 9 | 失败 | 当前码校验通过，QR 生成抛 Invalid hex color。流程无法确认新密钥。API 层已有覆盖。 |
| 14 | 主题与视口 | DESIGN | 部分 | 主题切换 `html.dark` + `localStorage`。390 宽侧栏占满视口，主栏需横滑，无折叠导航。 |
| 15 | 登录账号模板 | templates `login` | 通过 | 默认分类为登录；创建 `intranet-login`，详情分类「登录账号」，侧栏计数 1。随后已删除。 |

测试中的秘密值均为假数据，如 `test-password-not-real`。

## 缺陷

### P1 · 更换验证器二维码使用 HSL accent

复现：个人资料 → 更换验证器 → 填当前 6 位码。接口成功，界面红字 `Invalid hex color: hsl(268, 70%, 58%)`。

`src/components/ProfilePanel.tsx` 的 `totpQr()` 读取 `--accent`；绑定页 `src/pages/Gate.tsx` 写死 hex。建议统一用 hex，或把 HSL 转成 `#RRGGBB` 再交给 `qrcode`。

### P2 · 分享名单包含未绑定用户

SPEC：只分享给 active 用户。详情下拉列出「待绑定」成员，点分享才 400。应在前端过滤 `status === "active"`，避免选完再失败。

### P3 · 390 宽无折叠导航

侧栏约 272px，窄屏几乎盖住主内容。DESIGN 只写了详情抬头折行，未要求抽屉；桌面主路径不受影响。

### P3 · 团队列表不随自己改名刷新

侧栏用户卡立即变为「阿波罗」，团队页该行仍显示 admin，需重新进入页面。

## 网络抽查

| 请求 | 状态 | 断言 |
| --- | --- | --- |
| `POST /api/enroll/start` | 200 ×2 | React Strict Mode 打两次；第二次密钥用于绑定 |
| `POST /api/enroll/confirm` | 400, 400, 200 | 错误码拒绝；正确码成功 |
| `GET /api/records` | 200 | 正文不含 `test-password-not-real` / `BEGIN OPENSSH` |
| `POST …/reveal`（未开锁） | 401 | `code = unlock_required` |
| `POST /api/unlock` → reveal | 200 / 200 | 开锁后返回明文 |
| `POST /api/lock` | 200 | 离开 `/records/*` 自动封存 |
| `POST …/share` | 400 | 待绑定成员被拒 |
| `POST /api/enroll/reset/start` | 200 | 服务端已开始更换；UI 卡在 QR |

## API 补证

`npm test` · `test/api.spec.ts` · 9 passed · 353ms

| 浏览器未覆盖 | API 结果 |
| --- | --- |
| 未开通邮箱 403 门页 | rejects unprovisioned emails |
| 5 次失败锁定 15 分钟 | locks after five failed totp attempts |
| 共享者只读、不能改删 | shares read-only and forbids foreign edits |
| 10 人上限 | enforces the ten-user limit |
| 新分类校验 / 未知分类 | accepts new categories and rejects invalid payloads |
| 更换验证器完整密钥轮换 | lets an active user reset totp after proving the current code |

## 范围

故事 1、3、4、8 与管理员侧的 2、7 已在界面走通。故事 5–6 的所有者分享因没有 active 成员停在校验；故事 9 被 QR 色值 bug 拦住。复制 toast 不在无障碍树中，自动化未读到剪贴板，但开锁后字段与按钮符合 DESIGN。
