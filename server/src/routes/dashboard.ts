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

  const todayOrders = ordersData.filter((o: any) => o.createdAt.slice(0, 10) === today)
  const monthOrders = ordersData.filter((o: any) => {
    const orderDate = new Date(o.createdAt)
    const now = new Date()
    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear()
  })

  return res.json({
    success: true,
    message: 'ok',
    data: {
      totalUsers: users.length,
      totalProducts: productsData.length,
      totalOrders: ordersData.length,
      cartCount: cartRef.length,
      revenueToday: todayOrders.reduce((sum: number, o: any) => sum + o.actualAmount, 0),
      revenueMonth: monthOrders.reduce((sum: number, o: any) => sum + o.actualAmount, 0),
    },
  })
})

/**
 * GET /api/dashboard/trends?days=7
 * 近 N 天趋势数据（基于日志）
 */
dashboardRouter.get('/trends', requireAuth, (req: Request, res: Response) => {
  const days = parseInt(String(req.query.days || '7'))

  const trends = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const count = logsRef.filter((l: any) => l.createdAt.slice(0, 10) === dateStr).length
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      value: count,
    }
  })

  return res.json({ success: true, message: 'ok', data: trends })
})
