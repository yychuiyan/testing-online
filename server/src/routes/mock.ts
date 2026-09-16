import { Router, Request, Response } from 'express'

export const mockRouter = Router()

/**
 * GET /api/mock/timeout?delay=5000
 * 模拟接口超时
 */
mockRouter.get('/timeout', (req: Request, res: Response) => {
  const delay = Math.min(parseInt(String(req.query.delay || '3000')), 30000)
  setTimeout(() => {
    res.json({ success: true, data: { delay, message: `延迟 ${delay}ms 后响应` } })
  }, delay)
})

/**
 * GET /api/mock/status/:code
 * 返回指定 HTTP 状态码
 */
mockRouter.get('/status/:code', (req: Request, res: Response) => {
  const code = parseInt(String(req.params.code)) || 200
  if (code < 100 || code > 599) {
    return res.status(400).json({ success: false, message: '无效的状态码' })
  }
  res.status(code).json({
    success: code < 400,
    message: `返回状态码 ${code}`,
    code,
  })
})

/**
 * GET /api/mock/random
 * 随机成功（50%）或失败（50%）
 */
mockRouter.get('/random', (_req: Request, res: Response) => {
  const success = Math.random() > 0.5
  if (success) {
    res.json({ success: true, message: '随机成功', data: { value: Math.floor(Math.random() * 100) } })
  } else {
    res.status(500).json({ success: false, message: '随机失败' })
  }
})

/**
 * POST /api/mock/echo
 * 回显请求信息
 */
mockRouter.post('/echo', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'ok',
    data: {
      headers: req.headers,
      body: req.body,
      query: req.query,
      method: req.method,
      url: req.originalUrl,
    },
  })
})

/**
 * GET /api/mock/download
 * 模拟文件下载
 */
mockRouter.get('/download', (_req: Request, res: Response) => {
  const content = `炊烟小站测试平台 - 测试文件下载\n生成时间：${new Date().toISOString()}\n这是一份模拟的测试数据文件，用于验证 Playwright 文件下载功能。\n`
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Content-Disposition', 'attachment; filename="test-data.txt"')
  res.send(content)
})
