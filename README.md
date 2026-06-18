# 🧪 Test Online

独立测试练习平台 —— 包含自动化测试靶场、性能测试场景和测试理论基础，可用于 Playwright、Selenium、JMeter 等工具的实战练习。

## 📂 项目结构

```
test-online/
├── client/                          # React 18 + Vite + Tailwind
│   ├── src/pages/
│   │   ├── Home.tsx                 # 首页（模块导航 + API 列表）
│   │   ├── automation/              # 7 个自动化练习页
│   │   │   ├── LoginForm.tsx        # 登录表单（Cookie 登录态）
│   │   │   ├── RegisterForm.tsx     # 注册表单（全字段校验）
│   │   │   ├── DataTable.tsx        # 数据表格（分页+搜索+删除）
│   │   │   ├── ModalDialog.tsx      # 弹窗（Alert/Confirm/嵌套）
│   │   │   ├── FileUpload.tsx       # 文件上传（单/多/拖拽）
│   │   │   ├── DynamicElements.tsx  # 动态元素（延迟/异步/计数器）
│   │   │   └── DragDropDemo.tsx     # 拖拽排序+目标区
│   │   ├── performance/             # 3 个性能测试页
│   │   │   ├── LargeList.tsx        # 大列表渲染（50~5000条）
│   │   │   ├── ImageLoading.tsx     # 图片加载（数量+尺寸可控）
│   │   │   └── DomComplexity.tsx    # DOM 复杂度（深度+分支可调）
│   │   └── theory/TheoryPage.tsx    # 测试理论（金字塔/等价类/边界值/POM）
│   └── dist/                        # 构建产物 → 直接部署
├── server/                          # Express 后端
│   └── src/routes/
│       ├── auth.ts                  # 登录/登出/会话 (3 个接口)
│       ├── users.ts                 # CRUD 用户管理 (4 个接口)
│       ├── mock.ts                  # 超时/状态码/随机/回显 (4 个接口)
│       └── perf.ts                  # 慢接口/大数据/占位图 (3 个接口)
└── package.json                     # concurrently 一键启动
```

## 📡 API 接口清单（共 14 个）

### 认证模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录（支持 Cookie/Session） |
| GET | `/api/auth/me` | 获取当前登录用户 |
| POST | `/api/auth/logout` | 用户登出 |

**测试账号**：
- 管理员：`admin` / `admin123`
- 测试用户：`testuser` / `test123`

### 用户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users?page=1&pageSize=10&keyword=xxx` | 用户列表（分页+搜索） |
| POST | `/api/users` | 新增用户 |
| PUT | `/api/users/:id` | 修改用户 |
| DELETE | `/api/users/:id` | 删除用户 |

### Mock 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/mock/timeout?delay=5000` | 模拟接口超时 |
| GET | `/api/mock/status/:code` | 返回指定 HTTP 状态码 |
| GET | `/api/mock/random` | 随机返回成功（70%）或失败（30%） |
| POST | `/api/mock/echo` | 回显请求头、请求体和查询参数 |

### 性能测试

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/perf/slow?delay=3000` | 慢接口响应 |
| GET | `/api/perf/large?rows=1000` | 返回大数据量 JSON |
| GET | `/api/perf/image/:width/:height` | 动态生成 SVG 占位图 |

## 🚀 本地开发

```bash
# 安装所有依赖
npm run install:all

# 开发模式（前端 :5173 + 后端 :3001 同时启动）
npm run dev

# 单独启动
npm run dev:client   # 前端 → http://localhost:5173
npm run dev:server   # 后端 → http://localhost:3001

# 生产构建
npm run build        # 前端 → client/dist/
```

## 🖥️ 宝塔部署

### 前端（静态文件）

1. 网站 → 添加站点 → `test-online.your-domain.com`
2. 网站目录指向 `client/dist/`

### 后端（Node 服务）

1. 先构建：`cd server && npm run build`
2. PM2 管理器 → 添加项目
   - 启动文件：`server/dist/index.js`
   - 端口：`3001`

### Nginx 反向代理

```
location /api {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 🎯 测试练习场景

### 自动化测试

| 页面 | 练习内容 |
|------|---------|
| 登录表单 | 表单填写、提交、Cookie/Session 管理、错误断言 |
| 注册表单 | 多控件操作（input/radio/select/checkbox）、前端验证 |
| 数据表格 | 表格遍历、分页点击、搜索、行定位 |
| 弹窗对话框 | Alert/Confirm/嵌套弹窗的定位和关闭 |
| 文件上传 | input[type=file]、多文件、拖拽上传 |
| 动态元素 | 延迟出现、异步加载、动态列表、计数器 |
| 拖拽操作 | 列表排序拖拽、放置目标区 |

### 性能测试

| 页面 | 练习内容 |
|------|---------|
| 大列表渲染 | 50~5000 条数据渲染、首屏时间、滚动性能 |
| 图片加载 | 10~100 张图片、资源瀑布流、LCP 分析 |
| DOM 复杂度 | 可调深度(1-6)和分支(2-5)、选择器性能 |

## 🛠️ 技术栈

- **前端**：React 18 + TypeScript + Vite 6 + Tailwind CSS 3 + React Router 6
- **后端**：Express 4 + TypeScript
- **部署**：纯静态 + PM2，适用于宝塔面板

## 📄 License

MIT
