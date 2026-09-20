import { Router, Request, Response } from 'express'
import { productsData } from './products.js'
import { metricsSnapshot, resetPeakLag } from '../middleware/metrics.js'

/**
 * 压测场景接口集。
 *
 * 定位：给 Locust / JMeter 练习提供「可控的变量」。
 * 已有 /api/mock/* 覆盖了超时、状态码、随机失败；这里补的是压测里更常需要、
 * 但原来没有的维度：失败率可变、响应体大小可变、CPU 密集、缓存对照、
 * 流式响应、重定向、限流、服务端指标。
 *
 * 与 /api/mock 保持一致，这些接口不加鉴权，
 * 这样可以把「纯服务端容量」和「带鉴权开销」分开测。
 */
export const scenariosRouter = Router()

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

function clampFloat(raw: unknown, min: number, max: number, fallback: number): number {
  const n = parseFloat(String(raw ?? ''))
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

/**
 * GET /api/scenario/fail-rate?rate=0.05
 *
 * 按指定概率返回 500。相比 /api/mock/random 写死的 50%，
 * 这里可以精确控制错误率，用来验证「错误率是否触发告警」这类断言。
 */
scenariosRouter.get('/fail-rate', (req: Request, res: Response) => {
  const rate = clampFloat(req.query.rate, 0, 1, 0.05)
  const injected = Math.random() < rate

  if (injected) {
    return res.status(500).json({
      success: false,
      message: `命中注入的失败（rate=${rate}）`,
      data: { injected: true, rate },
    })
  }
  return res.json({ success: true, message: 'ok', data: { injected: false, rate } })
})

/**
 * GET /api/scenario/payload?size=100
 *
 * 返回约 size KB 的 JSON。压测里带宽和 CPU 是两个独立瓶颈，
 * 原来的接口响应体都是几百字节，测不出带宽维度。
 * 响应体预生成并缓存，避免序列化开销混进带宽测量。
 */
const payloadCache = new Map<number, string>()
const MAX_PAYLOAD_KB = 10240

function buildPayload(kb: number): string {
  const cached = payloadCache.get(kb)
  if (cached) return cached

  const block = 'x'.repeat(1024)
  const blocks = Array.from({ length: kb }, (_, i) => ({ id: i, data: block }))
  const body = JSON.stringify({ success: true, message: 'ok', data: { sizeKb: kb, blocks } })

  if (payloadCache.size >= 20) payloadCache.clear()
  payloadCache.set(kb, body)
  return body
}

scenariosRouter.get('/payload', (req: Request, res: Response) => {
  const kb = clampInt(req.query.size, 1, MAX_PAYLOAD_KB, 100)
  const body = buildPayload(kb)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', Buffer.byteLength(body))
  res.send(body)
})

/**
 * GET /api/scenario/cpu?rounds=500
 *
 * 纯计算、不碰 IO。用来观察 CPU 瓶颈：
 * 并发上去后 RPS 不再涨、event loop lag 飙升，就是 CPU 打满了。
 *
 * 一次 rounds 约等于 2 万次浮点运算，默认 500 轮 ≈ 1000 万次，
 * 稳态耗时 10ms 上下，足够形成明显瓶颈。
 *
 * 注意：前几个请求会明显更慢（V8 先解释执行，跑够次数才编译优化），
 * 这不是接口的问题，是 JIT 预热——本身也是压测里值得观察的现象，
 * 所以压测前通常要先「预热」再取数。
 */
scenariosRouter.get('/cpu', (req: Request, res: Response) => {
  const rounds = clampInt(req.query.rounds, 1, 5000, 500)

  const t0 = process.hrtime.bigint()
  let acc = 0
  for (let r = 1; r <= rounds; r++) {
    for (let i = 1; i <= 20000; i++) {
      acc += Math.sqrt(i * r + 1)
    }
  }
  const computeMs = Number(process.hrtime.bigint() - t0) / 1e6

  return res.json({
    success: true,
    message: 'ok',
    data: {
      rounds,
      iterations: rounds * 20000,
      serverComputeMs: Math.round(computeMs * 10) / 10,
      checksum: Math.round(acc),
    },
  })
})

/**
 * GET /api/scenario/cached  与  GET /api/scenario/uncached
 *
 * 一组对照接口：做同一件「全表聚合」的事，一个走缓存、一个每次真算。
 * 用来演示优化前后的差距，也是「缓存到底有没有用」的量化依据。
 */
const CACHE_TTL_MS = 5000
let scanCache: { at: number; value: ReturnType<typeof fullScan> } | null = null

/**
 * 数据被重置（/api/perf/reset）后调用，丢弃基于旧商品数组算出的缓存，
 * 否则 /scenario/cached 会继续返回重置前的统计值。
 */
export function resetScenarioCaches() {
  scanCache = null
  payloadCache.clear()
}

function fullScan() {
  let priceSum = 0
  let maxPrice = -Infinity
  let onSale = 0
  for (const p of productsData) {
    priceSum += p.price
    if (p.price > maxPrice) maxPrice = p.price
    if (p.status === 'on') onSale++
  }
  return {
    count: productsData.length,
    priceSum: Math.round(priceSum),
    maxPrice: maxPrice === -Infinity ? 0 : maxPrice,
    onSale,
  }
}

scenariosRouter.get('/cached', (_req: Request, res: Response) => {
  const now = Date.now()
  const hit = scanCache !== null && now - scanCache.at < CACHE_TTL_MS
  if (!hit) scanCache = { at: now, value: fullScan() }

  return res.json({
    success: true,
    message: 'ok',
    data: { ...scanCache!.value, cacheHit: hit, ttlMs: CACHE_TTL_MS },
  })
})

scenariosRouter.get('/uncached', (req: Request, res: Response) => {
  // rounds 放大全表扫描次数；配合 /api/perf/generate 造出大数据量后差距才明显
  const rounds = clampInt(req.query.rounds, 1, 5000, 1000)
  let last = fullScan()
  for (let i = 1; i < rounds; i++) last = fullScan()

  return res.json({
    success: true,
    message: 'ok',
    data: { ...last, rounds, cacheHit: false },
  })
})

/**
 * GET /api/scenario/stream?chunks=20&interval=50&ttft=0
 *
 * SSE 流式响应。用于练习「流式接口」压测：
 * 首字节时间（TTFT）和总时长是分开的两个指标，和普通接口的统计口径不同。
 * 也是大模型压测（/api/llm/v1）的简化版。
 */
scenariosRouter.get('/stream', (req: Request, res: Response) => {
  const chunks = clampInt(req.query.chunks, 1, 2000, 20)
  const interval = clampInt(req.query.interval, 0, 5000, 50)
  const ttft = clampInt(req.query.ttft, 0, 30000, 0)

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  let index = 0
  let timer: NodeJS.Timeout | null = null
  let closed = false

  const stop = () => {
    closed = true
    if (timer) clearTimeout(timer)
    timer = null
  }

  const send = () => {
    if (closed || res.writableEnded) return

    if (index >= chunks) {
      res.write('data: [DONE]\n\n')
      res.end()
      stop()
      return
    }

    res.write(`data: ${JSON.stringify({ index, content: `chunk-${index}`, ts: Date.now() })}\n\n`)
    index++
    timer = setTimeout(send, interval)
  }

  // 判断客户端断开必须用 res 的 close：
  // req 的 close 在「请求体读完」时就会触发（Node 16+ 行为），
  // POST 带 body 的流式接口会被误判成已断开，导致响应写不出去。
  res.on('close', stop)
  timer = setTimeout(send, ttft)
})

/**
 * GET /api/scenario/redirect?n=1
 *
 * 302 跳转链，n 为剩余跳数。用于练习断言与「重定向是否被跟随」。
 */
scenariosRouter.get('/redirect', (req: Request, res: Response) => {
  const n = clampInt(req.query.n, 0, 10, 1)
  if (n <= 0) {
    return res.json({ success: true, message: 'ok', data: { hops: 0, landed: true } })
  }
  return res.redirect(302, `/api/scenario/redirect?n=${n - 1}`)
})

/**
 * GET /api/scenario/rate-limited?limit=20&window=1000
 *
 * 固定窗口限流，超过阈值返回 429 + Retry-After。
 * 用来验证压测脚本是否正确处理「被限流」而不是当成失败。
 */
const buckets = new Map<string, { count: number; resetAt: number }>()
const MAX_BUCKETS = 5000

function sweepBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS) return
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key)
  }
  if (buckets.size >= MAX_BUCKETS) buckets.clear()
}

scenariosRouter.get('/rate-limited', (req: Request, res: Response) => {
  const limit = clampInt(req.query.limit, 1, 1000000, 20)
  const windowMs = clampInt(req.query.window, 100, 60000, 1000)
  const key = req.ip || 'unknown'
  const now = Date.now()

  sweepBuckets(now)

  let bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }
  bucket.count++

  res.setHeader('X-RateLimit-Limit', String(limit))
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - bucket.count)))

  if (bucket.count > limit) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))))
    return res.status(429).json({
      success: false,
      message: '请求过于频繁（限流演示）',
      data: { count: bucket.count, limit, windowMs },
    })
  }

  return res.json({
    success: true,
    message: 'ok',
    data: { count: bucket.count, limit, windowMs, remaining: limit - bucket.count },
  })
})

/**
 * GET /api/scenario/metrics
 *
 * 服务端运行时指标。压测时对照客户端的 RPS / 响应时间看，
 * 才能判断瓶颈在服务端 CPU、事件循环，还是网络。
 */
scenariosRouter.get('/metrics', (_req: Request, res: Response) => {
  return res.json({ success: true, message: 'ok', data: metricsSnapshot() })
})

/** POST /api/scenario/metrics/reset — 清零事件循环延迟峰值 */
scenariosRouter.post('/metrics/reset', (_req: Request, res: Response) => {
  resetPeakLag()
  return res.json({ success: true, message: 'ok', data: metricsSnapshot() })
})
