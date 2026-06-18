import { Router, Request, Response } from 'express'

export const authRouter = Router()

// 模拟用户数据库
const users: { username: string; password: string; token: string }[] = [
  { username: 'admin', password: 'admin123', token: 'token-admin-abc123' },
  { username: 'testuser', password: 'test123', token: 'token-testuser-def456' },
]

// 存储当前登录会话
const sessions = new Map<string, string>()

/**
 * POST /api/auth/login
 * 登录接口 — 用于练习 Cookie/Session 管理
 */
authRouter.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body

  const user = users.find(u => u.username === username && u.password === password)

  if (!user) {
    return res.status(401).json({
      success: false,
      message: '用户名或密码错误',
    })
  }

  sessions.set(user.token, user.username)
  res.cookie('auth_token', user.token, {
    httpOnly: true,
    maxAge: 3600 * 1000, // 1 小时
    sameSite: 'lax',
  })

  return res.json({
    success: true,
    message: '登录成功',
    data: {
      username: user.username,
      token: user.token,
    },
  })
})

/**
 * POST /api/auth/logout
 * 登出接口
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.auth_token
  if (token) {
    sessions.delete(token)
  }
  res.clearCookie('auth_token')
  return res.json({ success: true, message: '已退出登录' })
})

/**
 * GET /api/auth/me
 * 获取当前登录用户 — 验证登录态
 */
authRouter.get('/me', (req: Request, res: Response) => {
  const token = req.cookies?.auth_token

  if (!token || !sessions.has(token)) {
    return res.status(401).json({
      success: false,
      message: '未登录或登录已过期',
    })
  }

  return res.json({
    success: true,
    data: {
      username: sessions.get(token),
      token,
    },
  })
})
