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

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true }))
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))

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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`⚙️  server running at http://localhost:${PORT}`)
})
