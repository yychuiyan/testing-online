import { Router, Request, Response } from 'express'
import {
  requireAuth,
  extractBearerToken,
  users,
  invalidateUserIndex,
  pruneSessions,
} from '../middleware/auth.js'
import {
  productsData,
  invalidateProducts,
  productCacheStats,
  resetProducts,
  SEED_PRODUCT_COUNT,
} from './products.js'
import { resetUsers, SEED_USER_COUNT } from './users.js'
import { resetOrders, orderCount, SEED_ORDER_COUNT } from './orders.js'
import { resetCart } from './cart.js'
import { resetLogs, logCount, SEED_LOG_COUNT } from './logs.js'
import { resetScenarioCaches } from './scenarios.js'
import { envBool } from '../lib/env.js'

export const perfRouter = Router()

/** GET /api/perf/stats — 当前数据量 */
perfRouter.get('/stats', requireAuth, (_req: Request, res: Response) => {
  const mem = process.memoryUsage()
  const cache = productCacheStats()
  res.json({
    success: true,
    data: {
      users: users.length,
      products: productsData.length,
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      cache: {
        size: cache.size,
        hits: cache.hits,
        misses: cache.misses,
        hitRate: cache.hits + cache.misses > 0
          ? Math.round((cache.hits / (cache.hits + cache.misses)) * 1000) / 10
          : 0,
      },
    },
  })
})

/** POST /api/perf/generate — 批量生成测试数据 */
perfRouter.post('/generate', requireAuth, (req: Request, res: Response) => {
  const { type, count = 10 } = req.body
  const n = Math.min(parseInt(count) || 10, 50000)
  const startTime = Date.now()

  switch (type) {
    case 'products': {
      const cats = ['手机数码', '电脑办公', '家用电器', '服饰鞋包', '食品生鲜', '家居家具']
      const brands = ['Apple', '华为', '小米', 'Sony', '戴森', 'Nike', 'MUJI', '联想']
      const lastId = productsData.length > 0 ? productsData[productsData.length - 1].id : 0
      for (let i = 0; i < n; i++) {
        productsData.push({
          id: lastId + i + 1,
          name: `性能测试商品-${lastId + i + 1}`,
          description: '性能测试生成的模拟商品数据',
          price: Math.floor(Math.random() * 5000) + 99,
          originalPrice: Math.floor(Math.random() * 8000) + 199,
          images: [`https://picsum.photos/seed/p${lastId + i + 1}/200/200`],
          category: cats[Math.floor(Math.random() * cats.length)],
          categoryId: Math.floor(Math.random() * 6) + 1,
          brand: brands[Math.floor(Math.random() * brands.length)],
          stock: Math.floor(Math.random() * 1000),
          sales: Math.floor(Math.random() * 10000),
          rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
          specs: {} as any,
          status: 'on' as const,
          createdAt: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
      invalidateProducts()
      break
    }
    case 'users': {
      for (let i = 0; i < n; i++) {
        users.push({
          id: users.length + 1,
          username: `perf_user_${users.length + 1}`,
          email: `perf${users.length + 1}@test.com`,
          password: 'test123',
          token: `token-perf-${users.length + 1}`,
          role: 'user',
          status: 'active',
          createdAt: new Date().toISOString(),
        })
      }
      invalidateUserIndex()
      break
    }
    default:
      return res.status(400).json({ success: false, message: '不支持的数据类型' })
  }

  const elapsed = Date.now() - startTime
  res.json({
    success: true,
    message: `成功生成 ${n} 条${type === 'products' ? '商品' : '用户'}数据`,
    data: { count: n, elapsed: `${elapsed}ms` },
  })
})

/** POST /api/perf/clear — 清除生成的数据 */
perfRouter.post('/clear', requireAuth, (req: Request, res: Response) => {
  const { type } = req.body

  switch (type) {
    case 'products': {
      const removed = Math.max(0, productsData.length - SEED_PRODUCT_COUNT)
      resetProducts()
      res.json({
        success: true,
        message: `已清除 ${removed} 条商品数据（保留原始 ${SEED_PRODUCT_COUNT} 条）`,
        data: { removed },
      })
      break
    }
    case 'users': {
      const removed = Math.max(0, users.length - SEED_USER_COUNT)
      resetUsers()
      pruneSessions()
      res.json({
        success: true,
        message: `已清除 ${removed} 条用户数据（保留原始 ${SEED_USER_COUNT} 条）`,
        data: { removed },
      })
      break
    }
    default:
      return res.status(400).json({ success: false, message: '不支持的数据类型' })
  }
})

/**
 * POST /api/perf/reset — 一键还原为初始种子数据
 *
 * 「除了固定的种子数据，新增的全部清掉」：商品 / 用户 / 订单 / 购物车 / 日志
 * 一律按模块加载时拍下的快照还原。相比原先「截断前 N 条」的做法，
 * 即便种子数据被删改过、或日志因 unshift 导致顺序颠倒，也能正确还原。
 */
perfRouter.post('/reset', requireAuth, (_req: Request, res: Response) => {
  const before = {
    products: productsData.length,
    users: users.length,
    orders: orderCount(),
    logs: logCount(),
  }

  resetProducts()
  resetUsers()
  resetOrders()
  resetCart()
  resetLogs()
  resetScenarioCaches()
  pruneSessions() // 清掉已删除用户的会话，种子管理员保持登录

  res.json({
    success: true,
    message: `已还原为初始数据（商品 ${SEED_PRODUCT_COUNT} / 用户 ${SEED_USER_COUNT} / 订单 ${SEED_ORDER_COUNT} / 日志 ${SEED_LOG_COUNT}）`,
    data: {
      before,
      after: {
        products: productsData.length,
        users: users.length,
        orders: orderCount(),
        logs: logCount(),
      },
    },
  })
})

/** GET /api/perf/slow?delay=2000 — 慢接口 */
perfRouter.get('/slow', requireAuth, (req: Request, res: Response) => {
  const delay = Math.min(parseInt(String(req.query.delay || '2000')), 30000)
  setTimeout(() => {
    res.json({ success: true, data: { delay, timestamp: new Date().toISOString() } })
  }, delay)
})

/**
 * POST /api/perf/stress — 并发压测（服务端发起 N 次 self-request）
 *
 * 注意：这个接口是「服务端打自己」，不是真正的压测工具替代品：
 *   1. 统计的响应时间包含自身调度开销，数据不如 Locust 可信；
 *   2. 压测过程中如果被调用，会造成请求量成倍放大。
 * 所以加了两个保护：ENABLE_PERF_STRESS=false 可整体关闭，同一时刻只允许一个任务。
 */
let stressRunning = false

perfRouter.post('/stress', requireAuth, async (req: Request, res: Response) => {
  if (!envBool('ENABLE_PERF_STRESS', true)) {
    return res.status(403).json({
      success: false,
      message: '已禁用：/perf/stress 会在服务端自我放大，压测请用 Locust 等外部工具（ENABLE_PERF_STRESS=false 生效中）',
    })
  }
  if (stressRunning) {
    return res.status(429).json({ success: false, message: '已有压测任务在执行，请稍后再试' })
  }

  const { concurrency = 10, url = '/api/health' } = req.body
  const n = Math.min(parseInt(concurrency) || 10, 100)
  const start = Date.now()
  const results: number[] = []
  const authHeader = req.headers.authorization || `Bearer ${extractBearerToken(req)}`

  stressRunning = true
  try {
    const tasks = Array.from({ length: n }, async () => {
      const t0 = Date.now()
      try {
        await fetch(`http://localhost:${process.env.PORT || 3001}${url}`, {
          headers: { Authorization: authHeader },
        })
      } catch { /* ignore */ }
      results.push(Date.now() - t0)
    })

    await Promise.all(tasks)
    const elapsed = Date.now() - start
    const avg = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0

    res.json({
      success: true,
      data: {
        concurrency: n,
        totalElapsed: `${elapsed}ms`,
        avgResponseTime: `${avg}ms`,
        maxResponseTime: `${Math.max(...results, 0)}ms`,
        minResponseTime: `${Math.min(...results, 0)}ms`,
        hint: '该结果由服务端自身发起，包含调度开销，正式压测请用 Locust',
      },
    })
  } finally {
    stressRunning = false
  }
})
