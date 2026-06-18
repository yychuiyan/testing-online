import { Router, Request, Response } from 'express'

export const usersRouter = Router()

// 模拟用户数据
let userList = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `用户${i + 1}`,
  email: `user${i + 1}@test.com`,
  role: i === 0 ? 'admin' : 'user',
  status: i % 5 === 0 ? 'disabled' : 'active',
  createdAt: new Date(2024, 0, i + 1).toISOString(),
}))

/**
 * GET /api/users
 * 用户列表 — 支持分页、搜索
 * query: page, pageSize, keyword
 */
usersRouter.get('/', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 10
  const keyword = (req.query.keyword as string) || ''

  let filtered = userList
  if (keyword) {
    filtered = userList.filter(
      u => u.name.includes(keyword) || u.email.includes(keyword)
    )
  }

  const total = filtered.length
  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)

  return res.json({
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

/**
 * POST /api/users
 * 新增用户
 */
usersRouter.post('/', (req: Request, res: Response) => {
  const { name, email, role } = req.body

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'name 和 email 为必填字段',
    })
  }

  const newUser = {
    id: userList.length + 1,
    name,
    email,
    role: role || 'user',
    status: 'active',
    createdAt: new Date().toISOString(),
  }

  userList.push(newUser)

  return res.status(201).json({
    success: true,
    message: '用户创建成功',
    data: newUser,
  })
})

/**
 * PUT /api/users/:id
 * 修改用户
 */
usersRouter.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id))
  const index = userList.findIndex(u => u.id === id)

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '用户不存在',
    })
  }

  userList[index] = { ...userList[index], ...req.body, id }
  return res.json({
    success: true,
    message: '用户更新成功',
    data: userList[index],
  })
})

/**
 * DELETE /api/users/:id
 * 删除用户
 */
usersRouter.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id))
  const index = userList.findIndex(u => u.id === id)

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '用户不存在',
    })
  }

  userList.splice(index, 1)
  return res.json({
    success: true,
    message: '用户删除成功',
  })
})
