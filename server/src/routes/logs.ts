import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { setLogsRef } from './dashboard.js'

export const logsRouter = Router()

// Mock 操作日志
const logs: any[] = [
  { id: 1, userId: 1, username: '炊烟1号', action: 'login', module: 'auth', detail: '超级管理员登录系统', ip: '192.168.1.1', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, userId: 1, username: '炊烟1号', action: 'create', module: 'users', detail: '新增用户 admin', ip: '192.168.1.1', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 3, userId: 2, username: '炊烟2号', action: 'update', module: 'products', detail: '修改商品 iPhone 15 Pro', ip: '192.168.1.2', createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 4, userId: 2, username: '炊烟2号', action: 'view', module: 'products', detail: '查看商品列表', ip: '192.168.1.2', createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 5, userId: 1, username: '炊烟1号', action: 'delete', module: 'products', detail: '删除商品 测试商品A', ip: '192.168.1.1', createdAt: new Date(Date.now() - 18000000).toISOString() },
  { id: 6, userId: 1, username: '炊烟1号', action: 'export', module: 'orders', detail: '导出订单报表', ip: '192.168.1.1', createdAt: new Date(Date.now() - 21600000).toISOString() },
  { id: 7, userId: 2, username: '炊烟2号', action: 'view', module: 'products', detail: '查看商品列表', ip: '192.168.1.2', createdAt: new Date(Date.now() - 25200000).toISOString() },
  { id: 8, userId: 1, username: '炊烟1号', action: 'update', module: 'settings', detail: '修改系统配置：网站名称', ip: '192.168.1.1', createdAt: new Date(Date.now() - 86400000).toISOString() },
]

// 把日志引用传给 dashboard
setLogsRef(logs)

let nextLogId = 9

const MAX_LOGS = 50

export function addLog(userId: number, username: string, action: string, module: string, detail: string, ip: string = '127.0.0.1') {
  if (logs.length >= MAX_LOGS) {
    logs.pop() // 移除最旧的一条
  }
  logs.unshift({
    id: nextLogId++,
    userId,
    username,
    action,
    module,
    detail,
    ip,
    createdAt: new Date().toISOString(),
  })
}

/**
 * GET /api/logs
 * 操作日志列表
 */
logsRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || '1'))
  const pageSize = parseInt(String(req.query.pageSize || '5'))
  const username = String(req.query.username || '')
  const action = String(req.query.action || '')

  let filtered = [...logs]

  if (username) {
    filtered = filtered.filter(l => l.username.includes(username))
  }
  if (action) {
    filtered = filtered.filter(l => l.action === action)
  }

  const total = filtered.length
  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)

  return res.json({
    success: true,
    message: 'ok',
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  })
})
