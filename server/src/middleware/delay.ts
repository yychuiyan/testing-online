import type { Request, Response, NextFunction } from 'express'
import { envBool } from '../lib/env.js'

/**
 * 延迟注入中间件。
 *
 * 用途：把「这个接口变慢」的场景套到任意现有接口上（模拟慢 SQL、下游超时），
 * 不用改业务代码，也不用专门为每个接口准备一个慢版本。
 *
 * 用法：请求带 `?__delay=200` 或请求头 `x-delay-ms: 200` 即可。
 * 因为是显式参数才生效，正常流量完全不受影响。
 *
 * 设 ENABLE_DELAY_INJECTION=false 可整体关闭。
 */

const MAX_DELAY_MS = 30000

export function delayInjection(req: Request, _res: Response, next: NextFunction) {
  if (!envBool('ENABLE_DELAY_INJECTION', true)) return next()

  const raw = req.headers['x-delay-ms'] ?? req.query.__delay
  if (raw === undefined) return next()

  const delay = Math.min(Math.max(parseInt(String(raw), 10) || 0, 0), MAX_DELAY_MS)
  if (delay <= 0) return next()

  setTimeout(next, delay)
}
