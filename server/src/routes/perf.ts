import { Router, Request, Response } from 'express'

export const perfRouter = Router()

/**
 * GET /api/perf/slow
 * 模拟慢接口 — 固定延迟响应
 * query: delay (ms)，默认 2000
 */
perfRouter.get('/slow', async (req: Request, res: Response) => {
  const delay = parseInt(req.query.delay as string) || 2000
  await new Promise(resolve => setTimeout(resolve, delay))
  return res.json({
    success: true,
    message: `这个接口响应耗时 ${delay}ms`,
    delay,
  })
})

/**
 * GET /api/perf/large
 * 返回大数据量 — query: rows (行数)，默认 1000
 */
perfRouter.get('/large', (req: Request, res: Response) => {
  const rows = parseInt(req.query.rows as string) || 1000
  const data = Array.from({ length: rows }, (_, i) => ({
    id: i + 1,
    name: `项目-${i + 1}`,
    description: `这是第 ${i + 1} 条数据的详细描述信息`,
    tags: ['tag-a', 'tag-b', 'tag-c'],
    metadata: {
      created: new Date().toISOString(),
      version: '1.0.0',
    },
  }))

  return res.json({
    success: true,
    total: rows,
    data,
  })
})

/**
 * GET /api/perf/image/:width/:height
 * 动态生成占位图片 — 模拟图片加载
 */
perfRouter.get('/image/:width/:height', (req: Request, res: Response) => {
  const width = parseInt(String(req.params.width)) || 400
  const height = parseInt(String(req.params.height)) || 300

  // 返回一个简单的 SVG 占位图
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#e2e8f0"/>
    <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#94a3b8" font-size="20" font-family="sans-serif">
      ${width}×${height}
    </text>
  </svg>`

  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'no-cache')
  return res.send(svg)
})
