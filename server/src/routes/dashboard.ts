import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { users } from '../middleware/auth.js'
import { productsData } from './products.js'

export const dashboardRouter = Router()

// 订单 + 日志引用
let ordersData: any[] = []
let logsRef: any[] = []
let cartRef: any[] = []

export function setOrdersRef(data: any[]) { ordersData = data }
export function setLogsRef(data: any[]) { logsRef = data }
export function setCartRef(data: any[]) { cartRef = data }

/**
 * GET /api/dashboard/stats
 * 仪表盘统计卡片
 */
dashboardRouter.get('/stats', requireAuth, (_req: Request, res: Response) => {
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()

  // 单次遍历同时算出「今日营收」和「本月营收」，避免两次全表扫描
  let revenueToday = 0
  let revenueMonth = 0
  for (const o of ordersData) {
    if (o.createdAt.slice(0, 10) === today) revenueToday += o.actualAmount

    const orderDate = new Date(o.createdAt)
    if (orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear()) {
      revenueMonth += o.actualAmount
    }
  }

  return res.json({
    success: true,
    message: 'ok',
    data: {
      totalUsers: users.length,
      totalProducts: productsData.length,
      totalOrders: ordersData.length,
      cartCount: cartRef.length,
      revenueToday,
      revenueMonth,
    },
  })
})

/**
 * GET /api/dashboard/trends?days=7
 * 近 N 天趋势数据（基于日志）
 */
dashboardRouter.get('/trends', requireAuth, (req: Request, res: Response) => {
  const days = Math.min(Math.max(parseInt(String(req.query.days || '7'), 10) || 7, 1), 90)

  // 先按日期聚合一次，避免 days × logs 的双重循环
  const countByDate = new Map<string, number>()
  for (const l of logsRef) {
    const date = l.createdAt.slice(0, 10)
    countByDate.set(date, (countByDate.get(date) || 0) + 1)
  }

  const trends = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const dateStr = d.toISOString().slice(0, 10)
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      value: countByDate.get(dateStr) || 0,
    }
  })

  return res.json({ success: true, message: 'ok', data: trends })
})
