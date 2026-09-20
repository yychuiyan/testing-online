import { Request, Response, NextFunction } from 'express'
import { envInt } from '../lib/env.js'

export interface ServerUser {
  id: number
  username: string
  email: string
  password: string
  token: string
  role: string
  status: string
  phone?: string
  realName?: string
  createdAt: string
  lastLoginAt?: string
}

export const users: ServerUser[] = [
  { id: 1, username: '炊烟1号', email: 'cy1@test.com', password: 'admin123', token: 'token-admin-001', role: 'admin', status: 'active', phone: '13800000001', realName: '管理员', createdAt: '2025-01-01T00:00:00Z' },
  { id: 2, username: '炊烟2号', email: 'cy2@test.com', password: 'user123', token: 'token-user-002', role: 'user', status: 'active', phone: '13800000002', realName: '普通用户', createdAt: '2025-02-01T00:00:00Z' },
]

/** 登录后生效的 session：token → username（logout 可失效） */
export const sessions = new Map<string, string>()

/**
 * session 上限。
 * 演示账号只有 2 个，但 /api/perf/generate 造出来的用户各有固定 token，
 * 压测「登录」场景时 sessions 会无界增长，这里加个容量上限做淘汰。
 */
const SESSION_LIMIT = envInt('SESSION_LIMIT', 10000)

/** 写入 session；超过上限时淘汰最早写入的一条（Map 保持插入序） */
export function setSession(token: string, username: string) {
  if (sessions.has(token)) sessions.delete(token)
  sessions.set(token, username)
  if (sessions.size > SESSION_LIMIT) {
    const oldest = sessions.keys().next().value
    if (oldest !== undefined) sessions.delete(oldest)
  }
}

/**
 * token → user 的索引。
 *
 * 原先 requireAuth 里是 `users.find(u => u.token === token)`，O(n) 线性扫描。
 * 而 users 可以被 /api/perf/generate 撑到 5 万条，于是每个请求都要扫 5 万次，
 * 高并发下这是最先崩的地方。
 *
 * 索引里存的是对象引用，所以改 role / status / password 不需要重建，
 * 只有「增删用户」才需要调用 invalidateUserIndex()。
 */
let tokenIndex: Map<string, ServerUser> | null = null

function userTokenIndex(): Map<string, ServerUser> {
  if (!tokenIndex) {
    tokenIndex = new Map()
    for (const u of users) tokenIndex.set(u.token, u)
  }
  return tokenIndex
}

/** users 数组发生增删后必须调用，否则索引会过期 */
export function invalidateUserIndex() {
  tokenIndex = null
}

/** O(1) 按 token 查用户 */
export function findUserByToken(token: string): ServerUser | undefined {
  return userTokenIndex().get(token)
}

/**
 * 数据重置后调用：踢掉已不存在用户的会话。
 * 种子用户的 token 是固定的，所以管理员自己不会被登出。
 */
export function pruneSessions() {
  const valid = new Set(users.map(u => u.token))
  for (const token of sessions.keys()) {
    if (!valid.has(token)) sessions.delete(token)
  }
  invalidateUserIndex()
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  user: ['users.read', 'products.read', 'orders.read'],
}

/** 从 Authorization: Bearer <token> 提取 token */
export function extractBearerToken(req: Request): string {
  const header = String(req.headers.authorization || '')
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

/** 校验 Bearer Token，写入 req.currentUser */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req)
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' })
  }
  const user = findUserByToken(token)
  if (!user || user.status === 'disabled') {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' })
  }
  ;(req as any).currentUser = user
  next()
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).currentUser as ServerUser | undefined
    if (!user) {
      return res.status(401).json({ success: false, message: '未登录' })
    }
    const perms = ROLE_PERMISSIONS[user.role] || []
    if (perms.includes('*') || perms.includes(permission)) {
      return next()
    }
    return res.status(403).json({ success: false, message: '无权限访问' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).currentUser as ServerUser | undefined
    if (!user) {
      return res.status(401).json({ success: false, message: '未登录' })
    }
    if (roles.includes(user.role)) {
      return next()
    }
    return res.status(403).json({ success: false, message: '无权限访问' })
  }
}
