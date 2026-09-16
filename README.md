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

### 订单 `/admin/orders` · 详情 `/admin/orders/:id`

- 状态筛选、分页、管理员改状态、步骤条详情

### 操作日志 `/admin/logs`

- 按用户名 / 操作类型筛选，分页列表

### 文件下载 `/admin/download`

- fetch blob 下载 / `<a>` 直链下载

### 性能测试 `/admin/perf`

- 服务器内存与数据量统计
- 批量生成 / 清除商品、用户测试数据（最大 50000）
- 慢接口（可配 delay）
- 服务端并发压测（可配 concurrency）

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
| 订单 | `GET /orders` `GET /orders/:id` `PUT /orders/:id/status` |
| 仪表盘 | `GET /dashboard/stats` `GET /dashboard/trends?days=7` |
| 日志 | `GET /logs` |
| 上传 | `POST /upload`（FormData `file`） |
| Mock | `GET /mock/timeout` `GET /mock/status/:code` `GET /mock/random` `POST /mock/echo` `GET /mock/download` |
| Perf | `GET /perf/stats` `POST /perf/generate` `POST /perf/clear` `GET /perf/slow` `POST /perf/stress` |
| 健康检查 | `GET /health` |

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
