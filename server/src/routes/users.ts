import { Router, Request, Response } from 'express'
import { requireAuth, requirePermission, requireRole, users as userList, invalidateUserIndex, type ServerUser } from '../middleware/auth.js'
import { addLog } from './logs.js'
import { VersionedCache } from '../lib/query-cache.js'
import { parsePagination, paginated } from '../lib/pagination.js'

export const usersRouter = Router()

// 四个演示账号不可操作
const PROTECTED_IDS = [1, 2]
const PROTECTED_NAMES = ['炊烟1号', '炊烟2号']

let nextUserId = userList.length + 1

/** 种子数据快照：模块加载时深拷贝一份，重置时整体还原 */
const SEED_USERS = structuredClone(userList)

/** 种子用户条数 */
export const SEED_USER_COUNT = SEED_USERS.length

/** 还原为初始种子用户 */
export function resetUsers() {
  userList.length = 0
  userList.push(...structuredClone(SEED_USERS))
  nextUserId = userList.length + 1
  invalidateUsers()
}

/**
 * id → 用户 的索引。
 * 原先 GET /users/:id 是 O(n) 线性扫描，用户被撑到 5 万条后每次都要扫全表。
 */
let userIndex: Map<number, ServerUser> | null = null

function userById(id: number) {
  if (!userIndex) {
    userIndex = new Map()
    for (const u of userList) userIndex.set(u.id, u)
  }
  return userIndex.get(id)
}

/** 列表查询结果缓存：数据未变更时复用「过滤 + 分页」结果 */
const listCache = new VersionedCache<string, any>(200)

/** 用户数组发生增删后必须调用 */
function invalidateUsers() {
  userIndex = null
  listCache.bump()
  invalidateUserIndex()
}

/**
 * GET /api/users
 * 用户列表 — 分页、搜索、角色筛选
 */
usersRouter.get('/', requireAuth, requirePermission('users.read'), (req: Request, res: Response) => {
  const p = parsePagination(req, 5)
  const keyword = String(req.query.keyword || '').toLowerCase()
  const role = String(req.query.role || '')

  const cacheKey = `${p.page}|${p.pageSize}|${keyword}|${role}`
  const data = listCache.remember(cacheKey, () => {
    let filtered: ServerUser[] = userList
    if (keyword) {
      filtered = filtered.filter(
        (u) => u.username.toLowerCase().includes(keyword) || u.email.toLowerCase().includes(keyword)
      )
    }
    if (role) {
      filtered = filtered.filter((u) => u.role === role)
    }

    const total = filtered.length
    const items = filtered
      .slice(p.start, p.start + p.pageSize)
      .map(({ password, ...rest }) => rest)
    return paginated(items, total, p)
  })

  return res.json({ success: true, message: 'ok', data })
})

/**
 * GET /api/users/:id
 * 用户详情
 */
usersRouter.get('/:id', requireAuth, requirePermission('users.read'), (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id))
  const user = userById(id)
  if (!user) return res.status(404).json({ success: false, message: '用户不存在' })

  const { password, ...rest } = user
  return res.json({ success: true, message: 'ok', data: rest })
})

/**
 * POST /api/users
 * 新增用户
 */
usersRouter.post('/', requireAuth, requirePermission('users.write'), (req: Request, res: Response) => {
  const { username, email, password, role } = req.body
  const currentUser = (req as any).currentUser as ServerUser

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: '用户名、邮箱、密码为必填字段' })
  }
  if (userList.find(u => u.username === username)) {
    return res.status(409).json({ success: false, message: '用户名已存在' })
  }

  // 非超管不能创建管理员以上角色
  const assignedRole = role || 'user'
  if (currentUser.role !== 'admin') {
    return res.status(403).json({ success: false, message: '仅管理员可创建用户' })
  }

  const newUser: ServerUser = {
    id: nextUserId++,
    username,
    email,
    password,
    token: `token-${username}-${Date.now()}`,
    role: assignedRole,
    status: 'active',
    createdAt: new Date().toISOString(),
  }
  userList.push(newUser)
  invalidateUsers()

  addLog(currentUser.id, currentUser.username, 'create', 'users', `新增用户 ${username}（${assignedRole}）`)

  const { password: _, ...rest } = newUser
  return res.status(201).json({ success: true, message: '用户创建成功', data: rest })
})

/**
 * PUT /api/users/:id
 * 编辑用户
 */
usersRouter.put('/:id', requireAuth, requirePermission('users.write'), (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id))
  const index = userList.findIndex(u => u.id === id)
  if (index === -1) return res.status(404).json({ success: false, message: '用户不存在' })
  if (PROTECTED_IDS.includes(id)) return res.status(403).json({ success: false, message: '演示账号不可编辑' })

  const currentUser = (req as any).currentUser as ServerUser
  const { username, email, status, password } = req.body

  if (username) userList[index].username = username
  if (email) userList[index].email = email
  if (status) userList[index].status = status
  if (password) userList[index].password = password
  invalidateUsers()

  addLog(currentUser.id, currentUser.username, 'update', 'users', `修改用户 ${userList[index].username}`)

  const { password: _, ...rest } = userList[index]
  return res.json({ success: true, message: '用户更新成功', data: rest })
})

/**
 * DELETE /api/users/:id
 * 删除用户 [super_admin only]
 */
usersRouter.delete('/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id))
  const index = userList.findIndex(u => u.id === id)
  if (index === -1) return res.status(404).json({ success: false, message: '用户不存在' })
  if (PROTECTED_IDS.includes(id)) return res.status(403).json({ success: false, message: '演示账号不可删除' })

  const deletedUser = userList[index]

  // 不能删除自己
  const currentUser = (req as any).currentUser as ServerUser
  if (currentUser.id === id) {
    return res.status(400).json({ success: false, message: '不能删除自己' })
  }

  userList.splice(index, 1)
  invalidateUsers()
  addLog(currentUser.id, currentUser.username, 'delete', 'users', `删除用户 ${deletedUser.username}`)

  return res.json({ success: true, message: '用户已删除' })
})

/**
 * PUT /api/users/:id/role
 * 修改用户角色 [super_admin only]
 */
usersRouter.put('/:id/role', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id))
  const user = userList.find(u => u.id === id)
  if (!user) return res.status(404).json({ success: false, message: '用户不存在' })
  if (PROTECTED_IDS.includes(id)) return res.status(403).json({ success: false, message: '演示账号不可修改角色' })

  const { role } = req.body
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ success: false, message: '无效的角色' })
  }

  user.role = role
  const currentUser = (req as any).currentUser as ServerUser
  addLog(currentUser.id, currentUser.username, 'update', 'users', `修改用户 ${user.username} 角色为 ${role}`)

  const { password: _, ...rest } = user
  return res.json({ success: true, message: '角色修改成功', data: rest })
})
