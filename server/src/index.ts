import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { productsRouter } from './routes/products.js'
import { ordersRouter } from './routes/orders.js'
import { logsRouter } from './routes/logs.js'
import { cartRouter } from './routes/cart.js'
import { uploadRouter } from './routes/upload.js'
import { perfRouter } from './routes/perf.js'
import { mockRouter } from './routes/mock.js'
import { dashboardRouter } from './routes/dashboard.js'
import { scenariosRouter } from './routes/scenarios.js'
import { llmRouter } from './routes/llm.js'
import { llmRealRouter } from './routes/llm-real.js'
import { delayInjection } from './middleware/delay.js'
import { startMetricsSampler } from './middleware/metrics.js'

const app = express()
const PORT = process.env.PORT || 3001

app.disable('x-powered-by')
app.use(cors({ origin: true }))
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))

// 延迟注入：只在请求显式带 ?__delay= 或 x-delay-ms 头时生效，不影响正常流量
app.use(delayInjection)

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/products', productsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/logs', logsRouter)
app.use('/uploads', express.static('uploads'))
app.use('/api/upload', uploadRouter)
app.use('/api/mock', mockRouter)
app.use('/api/perf', perfRouter)
app.use('/api/cart', cartRouter)
app.use('/api/dashboard', dashboardRouter)
// 压测场景接口（失败率 / 响应体大小 / CPU / 缓存对照 / 流式 / 限流 / 服务端指标）
app.use('/api/scenario', scenariosRouter)
// OpenAI 兼容 Mock，供大模型压测使用
app.use('/api/llm/v1', llmRouter)
// 上游大模型透传（真实 API，会产生费用），需 ENABLE_LLM_UPSTREAM=true 才可用
app.use('/api/llm-real/v1', llmRealRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 事件循环延迟等运行时指标需要持续采样
startMetricsSampler()

const server = app.listen(PORT, () => {
  console.log(`⚙️  server running at http://localhost:${PORT}`)
})

// 端口被占用时明确报错并退出。
// 否则 tsx --watch 下进程会「活着但没监听」，前端一直连不上却看不到原因。
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n❌ 端口 ${PORT} 已被占用，服务端启动失败。\n` +
        `   查看占用：lsof -nP -iTCP:${PORT} -sTCP:LISTEN\n` +
        `   处理方式：结束占用进程，或换端口启动，如 PORT=3002 npm run dev\n`
    )
    process.exit(1)
  }
  throw err
})
