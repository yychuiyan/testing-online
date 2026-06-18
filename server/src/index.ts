import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { mockRouter } from './routes/mock.js'
import { perfRouter } from './routes/perf.js'

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// 路由
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/mock', mockRouter)
app.use('/api/perf', perfRouter)

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🧪 test-online server running at http://localhost:${PORT}`)
})
