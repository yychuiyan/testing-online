import { Router, Request, Response } from 'express'

export const mockRouter = Router()

/**
 * GET /api/mock/timeout
 * 模拟接口超时 — query: delay (ms)，默认 5000
 */
mockRouter.get('/timeout', async (req: Request, res: Response) => {
  const delay = parseInt(req.query.delay as string) || 5000
  await new Promise(resolve => setTimeout(resolve, delay))
  return res.json({
    success: true,
    message: `响应延迟了 ${delay}ms`,
  })
})

/**
 * GET /api/mock/status/:code
 * 返回任意 HTTP 状态码
 */
mockRouter.get('/status/:code', (req: Request, res: Response) => {
  const code = parseInt(String(req.params.code)) || 200
  const messages: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  }

  return res.status(code).json({
    success: code < 400,
    code,
    message: messages[code] || `状态码 ${code}`,
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /api/mock/random
 * 随机返回成功或失败 — 用于练习不稳定接口的断言
 */
mockRouter.get('/random', (_req: Request, res: Response) => {
  const success = Math.random() > 0.3 // 70% 成功率
  if (success) {
    return res.json({ success: true, data: { value: Math.floor(Math.random() * 100) } })
  } else {
    return res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

/**
 * POST /api/mock/echo
 * 回显请求体 — 用于调试请求内容
 */
mockRouter.post('/echo', (req: Request, res: Response) => {
  return res.json({
    success: true,
    echo: {
      headers: req.headers,
      body: req.body,
      query: req.query,
    },
  })
})
