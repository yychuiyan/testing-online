import { Router, Request, Response } from 'express'
import { users, ROLE_PERMISSIONS, sessions, extractBearerToken } from '../middleware/auth.js'
import { addLog } from './logs.js'

export const authRouter = Router()

let nextTokenId = 100

/**
 * POST /api/auth/login
 * 返回 Bearer Token，客户端需在后续请求中携带 Authorization: Bearer <token>
 */
authRouter.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body
  const user = users.find(u => u.username === username && u.password === password)

  if (!user || user.status === 'disabled') {
    return res.status(401).json({ success: false, message: '用户名或密码错误' })
  }

  sessions.set(user.token, user.username)
  user.lastLoginAt = new Date().toISOString()

  addLog(user.id, user.username, 'login', 'auth', '用户登录系统')

  return res.json({
    success: true,
    message: '登录成功',
    data: {
      username: user.username,
      token: user.token,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || [],
    },
  })
})

/**
 * POST /api/auth/register
 * 公开注册 — 默认角色为 user，状态为禁用，需管理员激活
 */
authRouter.post('/register', (req: Request, res: Response) => {
  const currentUser = (req as any).currentUser
  const { username, email, password, phone, role } = req.body

  if (!username || username.trim().length < 3) {
    return res.status(400).json({ success: false, message: '用户名至少 3 个字符' })
  }
  if (/[^a-zA-Z0-9_一-龥]/.test(username)) {
    return res.status(400).json({ success: false, message: '用户名只能包含字母、数字、下划线和中文' })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: '请输入有效的邮箱地址' })
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: '密码至少 6 个字符' })
  }
  if (password.length > 20) {
    return res.status(400).json({ success: false, message: '密码最多 20 个字符' })
  }
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ success: false, message: '用户名已被注册' })
  }
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ success: false, message: '邮箱已被注册' })
  }

  const MAX_USERS = 10
  if (users.length >= MAX_USERS) {
    return res.status(429).json({ success: false, message: `用户数已达上限（${MAX_USERS}），请联系管理员` })
  }

  const assignedRole = role || 'user'
  if (currentUser && currentUser.role !== 'admin' && assignedRole === 'admin') {
    return res.status(403).json({ success: false, message: '仅管理员可创建管理员账号' })
  }

  const token = `token-${username}-${nextTokenId++}`
  const newUser = {
    id: users.length + 1,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || '',
    password,
    token,
    role: assignedRole,
    status: 'disabled' as const,
    createdAt: new Date().toISOString(),
  }
  users.push(newUser)

  if (currentUser) {
    addLog(currentUser.id, currentUser.username, 'create', 'auth', `创建用户 ${username}（${assignedRole}）`)
  } else {
    addLog(newUser.id, username, 'register', 'auth', `自主注册（${assignedRole}）`)
  }

  return res.status(201).json({
    success: true,
    message: '注册成功，请等待管理员激活后登录',
    data: {
      username,
      role: assignedRole,
      permissions: ROLE_PERMISSIONS[assignedRole] || [],
    },
  })
})

/**
 * POST /api/auth/logout
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  const token = extractBearerToken(req)
  if (token) {
    const username = sessions.get(token)
    sessions.delete(token)
    if (username) {
      const user = users.find(u => u.username === username)
      if (user) addLog(user.id, user.username, 'logout', 'auth', '用户退出登录')
    }
  }
  return res.json({ success: true, message: '已退出登录' })
})

/**
 * GET /api/auth/me
 */
authRouter.get('/me', (req: Request, res: Response) => {
  const token = extractBearerToken(req)
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' })
  }

  const user = users.find(u => u.token === token)
  if (!user) {
    return res.status(401).json({ success: false, message: '用户不存在' })
  }

  return res.json({
    success: true,
    message: 'ok',
    data: {
      username: user.username,
      token: user.token,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || [],
    },
  })
})
