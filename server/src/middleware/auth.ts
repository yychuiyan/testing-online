import { Request, Response, NextFunction } from 'express'

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
  const user = users.find(u => u.token === token)
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
