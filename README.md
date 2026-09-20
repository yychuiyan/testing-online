# testing-online

> 本地练习站：Playwright / Selenium 自动化、接口测试、JMeter 性能测试

本项目仅面向本地开发与测试练习，**不部署线上环境**。

---

## 快速开始

```bash
cd testing-online
npm run install:all   # 首次：安装依赖
npm run dev           # 启动 → 前端 http://localhost:5173  后端 http://localhost:3001
```

## 演示账号

| 角色         | 用户名    | 密码       | 用途                           |
| ------------ | --------- | ---------- | ------------------------------ |
| **管理员**   | `炊烟1号` | `admin123` | CRUD、角色分配、日志、性能测试 |
| **普通用户** | `炊烟2号` | `user123`  | 只读：商品/订单、购物车、下载  |

---

## 鉴权方式（Bearer Token）

1. `POST /api/auth/login` 拿到 `data.token`
2. 后续请求携带请求头：

```http
Authorization: Bearer <token>
```

前端会把 token 存在 `localStorage.auth_token`。

### 用 curl 验证

```bash
# 登录
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"炊烟1号","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 带 Token 访问
curl -s http://localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN"
curl -s 'http://localhost:3001/api/products?page=1&pageSize=6' -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3001/api/perf/stats -H "Authorization: Bearer $TOKEN"
```

### JMeter 配置要点

| 步骤 | 配置 |
|------|------|
| 1 | HTTP Header Manager 默认加 `Content-Type: application/json` |
| 2 | setUp：`POST /api/auth/login`，JSON Extractor 取 `$.data.token` → 变量 `token` |
| 3 | 全局 Header：`Authorization: Bearer ${token}` |
| 4 | 业务线程组压测：`GET /api/products`、`GET /api/health`（health 可不带 Token）等 |

---

## 功能与测试场景

### 登录 `/login`

- 表单校验、演示账号一键填入、失败提示
- 已登录再访问 → 跳转仪表盘

### 注册 `/register`

- 表单校验（用户名/邮箱/密码、确认密码、性别 Radio、爱好 Checkbox、协议）
- 当前页为前端模拟提交流程（练习 UI 自动化）；真实注册接口见 `POST /api/auth/register`

### 仪表盘 `/admin/dashboard`

- 统计卡片 + 全量 API 清单

### 用户管理 `/admin/users`（管理员）

- 搜索 / 角色筛选 / 分页 / 增删改 / 角色变更
- ID 1、2 为受保护演示账号，不可编辑删除

### 商品 `/admin/products`

- 管理员可增删改；普通用户只读
- 搜索、分类、分页、图片上传、加入购物车

### 购物车 `/admin/cart`

- 数量调整、移除、总价、空状态
- **去结算**：把购物车提交为订单，下单成功后购物车自动清空并跳转订单列表

### 订单 `/admin/orders` · 详情 `/admin/orders/:id`

- 状态筛选、分页、管理员改状态、步骤条详情
- **创建订单** `POST /api/orders`：不传 `items` 即结算当前购物车，传 `items: [{ productId, quantity }]` 则按商品直接下单（便于压测脚本跳过加购步骤）。下单会扣库存、加销量、写日志，并让订单列表缓存失效
- **并发正确性演示**：设 `ORDER_RACE_WINDOW_MS` 大于 0 可复现超卖，见下文「并发相关说明」

### 操作日志 `/admin/logs`

- 按用户名 / 操作类型筛选，分页列表

### 文件下载 `/admin/download`

- fetch blob 下载 / `<a>` 直链下载

### 性能测试 `/admin/perf`

- 服务器运行时指标：内存、数据量、**事件循环延迟、CPU 占用、活跃句柄、缓存命中率**
- 批量生成 / 清除商品、用户测试数据（最大 50000）
- 慢接口（可配 delay）
- 服务端并发压测（可配 concurrency，同一时刻只允许一个任务）
- **压测场景接口**：可配失败率、响应体大小、CPU 密集、缓存对照、SSE 流式、重定向、限流
- **一键清除数据**：位于页面右上角账号左侧，任意后台页面可用。按模块加载时的种子快照还原商品 / 用户 / 订单 / 购物车 / 日志，只清新增数据；种子内管理员会话保留，被删用户的会话自动失效

### 大模型控制台 `/admin/llm`

给大模型压测专用的操作台。与「性能测试入口」的分工：那边是压测场景总入口，这里是能动手的地方。

- **注入控制台**：点选即可打一次 Mock，覆盖五类注入——错误码（429/401/400/500/empty/timeout）、TTFT 抖动与长尾（`ttft_ms` / `ttft_jitter_ms` / `ttft_spike_rate` / `ttft_spike_ms`）、截断（`answer_tokens > max_tokens`）
- **TTFT 实测**：TTFT 只能在客户端从响应流里量（发出请求 → 第一个含内容的 chunk），非流式请求拿不到。页面直接显示实测的 TTFT 与总时长
- **假成功识别**：注入 `empty` 时 HTTP 200 但零输出 token，会给出显式告警——只统计错误率会漏掉这类问题
- **上游状态**：读 `GET /llm-real/v1/providers` 展示已配置的上游、默认上游、模型白名单；未启用时给出配置指引
- **指标口径**：TTFT / TPOT / E2E / Tokens/s / RPS 的算法与易错点
- **成本估算**：请求数 × 输入输出 token × 单价，跑之前先估，避免误用烧光余额

> 接口清单的单一数据源在 `client/src/lib/endpoints.ts`，仪表盘与大模型控制台都从它读，改一处即可。

---

## API 速查

> 基础地址：`http://localhost:3001/api`  
> 认证：`Authorization: Bearer <token>`（登录后获取；`/api/health`、登录/注册除外）

| 模块 | 接口 |
|------|------|
| 认证 | `POST /auth/login` `POST /auth/register` `POST /auth/logout` `GET /auth/me` |
| 用户 | `GET/POST /users` `GET/PUT/DELETE /users/:id` `PUT /users/:id/role` |
| 商品 | `GET/POST /products` `GET /products/categories` `GET/PUT/DELETE /products/:id` |
| 购物车 | `GET/POST /cart` `PUT/DELETE /cart/:id` |
| 订单 | `GET/POST /orders` `GET /orders/:id` `PUT /orders/:id/status` |
| 仪表盘 | `GET /dashboard/stats` `GET /dashboard/trends?days=7` |
| 日志 | `GET /logs` |
| 上传 | `POST /upload`（FormData `file`） |
| Mock | `GET /mock/timeout` `GET /mock/status/:code` `GET /mock/random` `POST /mock/echo` `GET /mock/download` |
| Perf | `GET /perf/stats` `POST /perf/generate` `POST /perf/clear` `POST /perf/reset` `GET /perf/slow` `POST /perf/stress` |
| 压测场景 | `GET /scenario/fail-rate` `GET /scenario/payload` `GET /scenario/cpu` `GET /scenario/cached` `GET /scenario/uncached` `GET /scenario/stream` `GET /scenario/redirect` `GET /scenario/rate-limited` `GET /scenario/metrics` `POST /scenario/metrics/reset` |
| 大模型 Mock | `POST /llm/v1/chat/completions`（OpenAI 兼容，支持 `stream` 与错误注入）`GET /llm/v1/models` |
| 大模型上游 | `POST /llm-real/v1[/:provider]/chat/completions` `GET /llm-real/v1[/:provider]/models` `GET /llm-real/v1/providers`（真实 API 透传，支持多上游，默认关闭且需鉴权） |
| 健康检查 | `GET /health` |

---

## 压测场景速查

这些接口本身不返回业务数据，而是为压测**制造可控的变量**。

| 场景 | 接口 | 说明 |
|------|------|------|
| 可配失败率 | `GET /api/scenario/fail-rate?rate=0.05` | 按概率返回 500，验证「错误率」类断言（`/mock/random` 是固定 50%） |
| 响应体大小 | `GET /api/scenario/payload?size=100` | 返回约 `size` KB 的 JSON，用来区分带宽瓶颈与 CPU 瓶颈（预生成缓存，不含序列化开销） |
| CPU 密集 | `GET /api/scenario/cpu?rounds=500` | 纯计算不碰 IO，默认约 10ms。**前几次会明显更慢（JIT 预热），取稳态数据** |
| 缓存对照（快） | `GET /api/scenario/cached` | 全表聚合走缓存，5s TTL |
| 缓存对照（慢） | `GET /api/scenario/uncached?rounds=1000` | 每次真算。**先批量生成商品数据再来对比**，差距才明显 |
| 流式响应 | `GET /api/scenario/stream?chunks=20&interval=50&ttft=0` | SSE。流式接口的「首字节时间」和「总时长」是两个指标 |
| 302 重定向 | `GET /api/scenario/redirect?n=2` | 跳转链，验证脚本是否正确跟随重定向 |
| 限流 | `GET /api/scenario/rate-limited?limit=20&window=1000` | 超阈值返回 429 + `Retry-After`，验证脚本把「被限流」和「真失败」分开统计 |
| 服务端指标 | `GET /api/scenario/metrics` | 事件循环延迟、CPU、句柄数、内存 |
| 重置延迟峰值 | `POST /api/scenario/metrics/reset` | 清零 `peakLagMs` |

### 延迟注入

任意接口都可以临时变慢，不用改业务代码：

```bash
curl "http://localhost:3001/api/products?__delay=300" -H "Authorization: Bearer $TOKEN"
curl "http://localhost:3001/api/orders" -H "Authorization: Bearer $TOKEN" -H "x-delay-ms: 300"
```

只有显式带上 `?__delay=` 或 `x-delay-ms` 头才生效，正常流量不受影响。

### 大模型接口 Mock

`/api/llm/v1` 是 OpenAI 兼容实现，供 Locust 的 `locust.contrib.oai.OpenAIUser` 练习：

```python
from locust.contrib.oai import OpenAIUser

class LLMUser(OpenAIUser):
    def __init__(self, env):
        super().__init__(env)
        self.client.base_url = "http://localhost:3001/api/llm/v1"
```

响应带 `usage`（prompt / completion / total tokens），流式模式支持 `stream_options.include_usage`。
默认模拟 20ms 首 token 延迟、每 token 2ms，可用 `ttft_ms` / `token_interval_ms` 覆盖。

`/api/llm/v1` 只模拟**接口契约与行为特征**，不对应任何真实算力，因此不能用来得出容量结论；
真实容量必须把 `base_url` 换成线上地址再跑一次。它的价值在于零成本、无限流、参数可控。

下面这些注入开关**所有标量参数 query 与 body 都认，query 优先**，方便 curl 直接加 `?`，
也方便 OpenAI client 按标准写在 body 里。只有两个结构性字段例外，必须放 body：
`messages`（数组）与 `stream_options`（对象）。

> 之所以统一成一条规则：参数放错位置会被静默忽略（返回 200，看不出问题），比报错更难排查。

| 开关 | 作用 |
| --- | --- |
| `?error=429` | 返回 OpenAI 结构体限流错误，并带 `Retry-After`、`X-RateLimit-*` |
| `?error=401` | 模拟凭证失效，带 `WWW-Authenticate: Bearer` |
| `?error=400` / `?error=500` | 模拟参数错误 / 服务端错误 |
| `?error=empty` | 返回 200 但内容为空（高并发下最常见的「假成功」） |
| `?error=timeout` | 不响应，`timeout_ms`（默认 30000）后主动断开 |
| `ttft_jitter_ms` | 首 token 延迟叠加均匀抖动，上限为该毫秒数 |
| `ttft_spike_rate` / `ttft_spike_ms` | 按百分比概率注入长尾尖峰，否则百分位平得像一条线 |
| `max_tokens` / `answer_tokens` | `answer_tokens > max_tokens` 时截断，`finish_reason` 返回 `length` |

`max_tokens` / `answer_tokens` 越界、prompt 超过 20000 字符，都会返回 400 而不是静默钳制。

`stream` 与 `model` 同样 query 与 body 都认：`?stream=true&model=custom-model` 等价于写在 body 里。
`stream` 的布尔解析接受 `true` / `1` / `yes` / `on`（query 里都是字符串，不能只判断 `=== true`）。

### 真实上游接口

`/api/llm-real/v1` 把请求透传给真实的大模型 API，与上面的 Mock 并列：

| | `/api/llm/v1`（Mock） | `/api/llm-real/v1`（真实） |
| --- | --- | --- |
| 成本 | 零 | 按上游计费 |
| 指标 | 模拟 | 真实 |
| 错误注入 | 支持 | 不支持（上游自己会报错） |
| 鉴权 | 故意不加 | **必须登录**，因为它直接花钱 |
| 默认状态 | 开启 | **关闭**，需 `ENABLE_LLM_UPSTREAM=true` |

#### 多上游

可以同时配置多个供应商，用路径段区分，互不干扰：

```
POST /api/llm-real/v1/chat/completions            默认上游
POST /api/llm-real/v1/deepseek/chat/completions   provider = deepseek
POST /api/llm-real/v1/openai/chat/completions     provider = openai
GET  /api/llm-real/v1/providers                   列出已配置的上游
```

供应商是**从环境变量自动发现**的，按约定命名即可，不用改代码。

推荐写进 `server/.env`（已被 `.gitignore` 忽略），复制模板后修改即可：

```bash
cp server/.env.example server/.env
# 编辑 server/.env，填入真实 Key
```

```ini
# server/.env
ENABLE_LLM_UPSTREAM=true
LLM_UPSTREAM_DEEPSEEK_KEY=sk-xxx
LLM_UPSTREAM_DEEPSEEK_BASE=https://api.deepseek.com
LLM_UPSTREAM_DEEPSEEK_MODELS=deepseek-flash,deepseek-v4-pro
LLM_UPSTREAM_OPENAI_KEY=sk-yyy
LLM_UPSTREAM_OPENAI_BASE=https://api.openai.com/v1
LLM_UPSTREAM_OPENAI_MODELS=gpt-4o-mini
```

`server/package.json` 的 `dev` / `start` 脚本带了 `--env-file-if-exists=.env`，所以 `npm run dev` 会自动读取，文件不存在也能正常启动。

也可以临时用命令行前缀，不改文件（shell 变量优先级高于 `.env`）：

```bash
ENABLE_LLM_UPSTREAM=true \
LLM_UPSTREAM_DEEPSEEK_KEY=sk-xxx \
npm run dev:server
```

改完 `.env` 需要**重启服务端**才生效。

也兼容不带名字的旧写法，它会注册成名为 `default` 的上游：
`LLM_UPSTREAM_KEY` / `LLM_UPSTREAM_BASE` / `LLM_UPSTREAM_MODELS`。

默认上游的优先级：`LLM_UPSTREAM_DEFAULT` 指定的名字 > `default` > 第一个（按字母序）。
指定的名字不存在时会自动回退，不会启动失败。

每个上游的**模型白名单相互独立**——在 openai 上游传 `deepseek-flash` 会被拒绝。
`LLM_UPSTREAM_<NAME>_MODELS` 里写 `*` 表示放行上游返回的全部模型（不推荐，会失去成本保护）。

#### 使用要点

调用方式与 Mock 完全一致，只换 `base_url`；响应会带 `X-Upstream-Provider` 头便于排查：

```python
self.client.base_url = "http://localhost:3001/api/llm-real/v1/deepseek"
```

默认强制关闭思考模式（`thinking.type=disabled`），这样 TTFT / token 计数才干净；
需要测思考模式时加 `?thinking=enabled`。`max_tokens` 超过 `LLM_UPSTREAM_MAX_TOKENS` 会被拒绝
（防止误用烧光余额）。上游的状态码与 `Retry-After` 原样回传，可用来真实演练 429 退避。

> ⚠️ **压测请直连上游，不要打这个接口。**
> 它自己是 Node 单进程，事件循环会先饱和（实测约 3.4k req/s），
> 打出来的数据反映的是本服务而非上游。这里的定位是「统一入口 + 前端演示 + 低频验证」。

---

## 并发相关说明

### 已做的优化

高并发下这几个点原先会先崩，现已修复：

| 问题 | 原因 | 处理 |
|------|------|------|
| 鉴权 O(n) 扫描 | `requireAuth` 里 `users.find(u => u.token === token)`，用户被撑到 5 万后每请求扫全表 | 建 token 索引，降为 O(1) |
| 列表接口 O(n log n) | 每请求「全量拷贝 + 全量排序」，只取 6 条 | 过滤结果加版本化 LRU 缓存，写操作后自动失效 |
| 详情接口 O(n) 扫描 | `productsData.find` / `ordersData.find` | 建 id 索引 |
| 分页参数无边界 | `?pageSize=999999` 会返回全量数据，`?page=-1` 产生负下标 | 入口钳制：`page ≥ 1`、`pageSize ≤ 100` |
| 写接口硬上限 | `MAX_PRODUCTS=20` / `MAX_USERS=10`，导致写场景压测全 429 | 改为环境变量可配，默认 1000 |
| session 无上限 | 压测登录会无界增长 | 容量上限 + 淘汰 |
| 服务端自压放大 | `/perf/stress` 会 fetch 自己 | 加开关，且同一时刻只允许一个任务 |
| 仪表盘重复全表扫描 | `ordersData.filter` 跑两遍、趋势是 `days × logs` 双重循环 | 改为单次遍历聚合 |

写操作会自动让相关缓存失效，所以「新增商品后列表立刻能看到」这类行为不受影响。

### 环境变量

**写在 `server/.env`**（复制 `server/.env.example` 即可，该文件已被 `.gitignore` 忽略）。
`dev` / `start` 脚本带了 `--env-file-if-exists=.env`，会自动加载；文件不存在也能正常启动。
临时覆盖可以在命令前加前缀，例如 `PORT=3002 npm run dev:server`（优先级高于 `.env`）。

模板分两段：**① 最小可用**（只有几行，实际生效，看完就能跑）、**② 完整参考**（全部是注释的「菜单」，
按需取消注释）。不需要的变量不用复制进去——所有变量在代码里都有默认值。
改完 `.env` 需要重启服务端才生效。

| 变量 | 默认 | 说明 |
|------|------|------|
| `PORT` | `3001` | 服务端口 |
| `MAX_PRODUCTS` | `1000` | 商品数上限，超出返回 429 |
| `MAX_USERS` | `1000` | 用户数上限，超出返回 429 |
| `SESSION_LIMIT` | `10000` | session 容量上限 |
| `ENABLE_PERF_STRESS` | `true` | 设为 `false` 关闭 `/perf/stress`（正式压测建议关闭） |
| `ENABLE_DELAY_INJECTION` | `true` | 设为 `false` 关闭延迟注入 |
| `LLM_TTFT_MS` | `20` | 大模型 Mock 的首 token 延迟 |
| `LLM_TOKEN_INTERVAL_MS` | `2` | 大模型 Mock 的逐 token 间隔 |
| `LLM_TIMEOUT_MS` | `30000` | `?error=timeout` 挂住多久后断开 |
| `ENABLE_LLM_AUTH` | `false` | 设为 `true` 时 `/api/llm/v1` 要求 Bearer Token（走正常登录态），便于单独测量鉴权开销 |
| `ENABLE_LLM_UPSTREAM` | `false` | 设为 `true` 才启用 `/api/llm-real/v1`（会产生真实费用） |
| `LLM_UPSTREAM_<NAME>_KEY` | 无 | 某个上游的 API Key，服务名即 `<NAME>`（小写）。**不要提交进仓库** |
| `LLM_UPSTREAM_<NAME>_BASE` | `https://api.deepseek.com` | 该上游地址。如 OpenAI 填 `https://api.openai.com/v1` |
| `LLM_UPSTREAM_<NAME>_MODELS` | `deepseek-flash,deepseek-v4-pro` | 该上游的模型白名单，`*` 表示不限制 |
| `LLM_UPSTREAM_DEFAULT` | 字母序第一个 | 默认上游的名字 |
| `LLM_UPSTREAM_KEY` 等 | 无 | 旧写法（不带名字），注册为上游 `default` |
| `LLM_UPSTREAM_MAX_TOKENS` | `1024` | 单次请求的 `max_tokens` 硬上限（全局） |
| `LLM_UPSTREAM_TIMEOUT_MS` | `120000` | 上游超时（全局） |
| `LLM_UPSTREAM_DISABLE_THINKING` | `true` | 强制关闭思考模式；调用时加 `?thinking=enabled` 可单独覆盖 |
| `ORDER_RACE_WINDOW_MS` | `0` | 下单接口的人为并发窗口（毫秒）。`0` = 关闭，行为与同步版本一致；`>0` 用于复现超卖，**正式压测请保持 0** |

### 下单的并发正确性（超卖演示）

`POST /api/orders` 是唯一「多步写 + 跨模块联动」的接口：扣库存 → 加销量 → 建订单 → 清购物车 → 写日志。

- **默认（`ORDER_RACE_WINDOW_MS=0`）不会超卖**：Node 单线程下「校验库存 → 扣减库存」之间不让出事件循环，并发下单仍严格按库存上限放行。

  实测：库存 5，20 个并发下单 → 成功 5、409 共 15、库存归零。

- **设 `ORDER_RACE_WINDOW_MS=50` 即可复现超卖**：该值会在校验与扣减之间插入 `await`，制造 TOCTOU 窗口——多个请求先后通过同一个库存快照，再各自扣减。

  实测：库存 5，20 个并发下单 → **成功 20**、库存被扣成 **−15**。

复现命令：

```bash
# 终端 1：带并发窗口启动
cd server && PORT=3002 ORDER_RACE_WINDOW_MS=50 npx tsx src/index.ts

# 终端 2：先把某商品库存调小，再并发下单
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"炊烟1号","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["token"])')

curl -s -X PUT http://localhost:3002/api/products/1 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"stock":5}'

seq 20 | xargs -P 20 -I{} curl -s -o /dev/null -X POST http://localhost:3002/api/orders \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":[{"productId":1,"quantity":1}]}'

# 查看库存：会看到被扣成负数
curl -s http://localhost:3002/api/products/1 -H "Authorization: Bearer $TOKEN" \
  | grep -o '"stock":[^,]*'
# 期望输出： "stock":-15
```

同样的 20 个并发、同样的库存 5，把启动参数换回 `ORDER_RACE_WINDOW_MS=0`（或直接不设），
就会看到 5 个 `201` 与 15 个 `409`，库存停在 `0`。

> 这是刻意留出的教学开关，不是缺陷。真实系统里对应的正确做法是：库存扣减做成原子操作（数据库 `UPDATE ... WHERE stock >= n`）、加锁、或用乐观锁版本号。

### 压测时的两个提醒

1. **`npm run dev` 用 `tsx` 直接跑 TS，有转译开销，压测数据不真实。**
   正式取数请先 `npm run build`，再 `node dist/index.js`。

2. **`/api/perf/stress` 是服务端打自己**，统计里包含调度开销，不能替代 Locust。
   它只用于功能演示，正式压测请用外部工具。

---

## 技术栈

| 层   | 技术                                                           |
| ---- | -------------------------------------------------------------- |
| 前端 | React 18 + TypeScript + Vite 6 + Ant Design 5 + React Router 6 |
| 后端 | Express 4 + tsx（内存数据，重启即恢复种子数据）                |

## 数据重置

重启后端进程后恢复初始状态：

| 数据     | 初始量               |
| -------- | -------------------- |
| 用户     | 2（炊烟1号/炊烟2号） |
| 商品     | 8（6 个分类）        |
| 订单     | 12（6 种状态）       |
| 操作日志 | 8 条                 |
| 购物车   | 空                   |
| 上传图片 | 文件在 `server/uploads/`（已 gitignore） |

---

## 常见问题

| 问题             | 解决                                           |
| ---------------- | ---------------------------------------------- |
| 接口 401         | 先登录拿 Token，检查 `Authorization: Bearer …` |
| 登录后刷新掉登录 | 确认 localStorage 有 `auth_token`，后端未重启丢 session |
| 删改按钮不可见   | 普通用户无写权限，请用管理员账号               |
| API 连不上       | 确认 `npm run dev` 已起，后端端口 3001         |
