import { Router, Request, Response } from 'express'
import { requireAuth, requirePermission, type ServerUser } from '../middleware/auth.js'
import { addLog } from './logs.js'

export const productsRouter = Router()

// 分类数据
const categories = [
  { id: 1, name: '手机数码', icon: '📱' },
  { id: 2, name: '电脑办公', icon: '💻' },
  { id: 3, name: '家用电器', icon: '🏠' },
  { id: 4, name: '服饰鞋包', icon: '👗' },
  { id: 5, name: '食品生鲜', icon: '🍎' },
  { id: 6, name: '家居家具', icon: '🛋️' },
]

// 商品数据
export const productsData = [
  { id: 1, name: 'iPhone 15 Pro Max 256GB', description: 'A17 Pro 芯片 | 钛金属设计 | 4800万像素主摄', price: 9999, originalPrice: 10999, images: ['https://picsum.photos/seed/p1/600/600'], category: '手机数码', categoryId: 1, brand: 'Apple', stock: 150, sales: 3280, rating: 4.9, specs: { '屏幕': '6.7英寸 OLED', '芯片': 'A17 Pro' }, status: 'on', createdAt: '2025-09-15T00:00:00Z', updatedAt: '2025-09-15T00:00:00Z' },
  { id: 2, name: '华为 Mate 60 Pro', description: '麒麟 9000S | 卫星通话 | 昆仑玻璃', price: 6999, originalPrice: 7999, images: ['https://picsum.photos/seed/p2/600/600'], category: '手机数码', categoryId: 1, brand: '华为', stock: 200, sales: 5600, rating: 4.8, specs: { '屏幕': '6.82英寸 OLED', '芯片': '麒麟9000S' }, status: 'on', createdAt: '2025-08-28T00:00:00Z', updatedAt: '2025-08-28T00:00:00Z' },
  { id: 3, name: 'MacBook Pro 14 M4 Pro', description: 'M4 Pro芯片 | Liquid Retina XDR | 18小时续航', price: 14999, originalPrice: 16499, images: ['https://picsum.photos/seed/p3/600/600'], category: '电脑办公', categoryId: 2, brand: 'Apple', stock: 90, sales: 2100, rating: 4.9, specs: { '芯片': 'M4 Pro', '内存': '18GB' }, status: 'on', createdAt: '2025-08-01T00:00:00Z', updatedAt: '2025-08-01T00:00:00Z' },
  { id: 4, name: 'Dyson V15 无线吸尘器', description: '激光探测微尘 | LCD实时数据 | 60分钟续航', price: 4990, originalPrice: 5990, images: ['https://picsum.photos/seed/p4/600/600'], category: '家用电器', categoryId: 3, brand: '戴森', stock: 70, sales: 3200, rating: 4.8, specs: { '吸力': '230AW', '续航': '60分钟' }, status: 'on', createdAt: '2025-06-01T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 5, name: 'Nike Air Jordan 1 Retro', description: '经典高帮 | 全粒面皮革 | Air-Sole缓震', price: 1299, originalPrice: 1499, images: ['https://picsum.photos/seed/p5/600/600'], category: '服饰鞋包', categoryId: 4, brand: 'Nike', stock: 300, sales: 8900, rating: 4.9, specs: { '鞋帮': '高帮', '面料': '全粒面皮革' }, status: 'on', createdAt: '2025-07-01T00:00:00Z', updatedAt: '2025-07-01T00:00:00Z' },
  { id: 6, name: '智利车厘子 JJ级 5斤', description: 'JJ级大果 | 空运直达 | 新鲜甜脆', price: 299, originalPrice: 399, images: ['https://picsum.photos/seed/p6/600/600'], category: '食品生鲜', categoryId: 5, brand: '进口水果', stock: 200, sales: 15000, rating: 4.6, specs: { '规格': '5斤装', '等级': 'JJ级' }, status: 'on', createdAt: '2025-08-05T00:00:00Z', updatedAt: '2025-08-05T00:00:00Z' },
  { id: 7, name: 'MUJI 懒人沙发', description: '微粒填充 | 可拆洗外套 | 人体工学', price: 799, originalPrice: 999, images: ['https://picsum.photos/seed/p7/600/600'], category: '家居家具', categoryId: 6, brand: 'MUJI', stock: 80, sales: 1900, rating: 4.5, specs: { '填充': '发泡聚苯乙烯', '尺寸': '65×65cm' }, status: 'on', createdAt: '2025-07-10T00:00:00Z', updatedAt: '2025-07-10T00:00:00Z' },
  { id: 8, name: 'Sony WH-1000XM5', description: '行业领先降噪 | 30小时续航 | 轻盈舒适', price: 2299, originalPrice: 2999, images: ['https://picsum.photos/seed/p8/600/600'], category: '手机数码', categoryId: 1, brand: 'Sony', stock: 150, sales: 6100, rating: 4.8, specs: { '降噪': '双芯降噪', '续航': '30小时' }, status: 'on', createdAt: '2025-03-20T00:00:00Z', updatedAt: '2025-03-20T00:00:00Z' },
]

let nextProductId = productsData.length + 1

/**
 * GET /api/products — 商品列表
 */
productsRouter.get('/', requireAuth, requirePermission('products.read'), (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || '1'))
  const pageSize = parseInt(String(req.query.pageSize || '6'))
  const keyword = String(req.query.keyword || '').toLowerCase()
  const categoryId = parseInt(String(req.query.categoryId || '0'))
  const sortBy = String(req.query.sortBy || 'id')
  const order = String(req.query.order || 'desc')

  let filtered = [...productsData]

  if (keyword) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.brand.toLowerCase().includes(keyword)
    )
  }
  if (categoryId) {
    filtered = filtered.filter(p => p.categoryId === categoryId)
  }
  if (sortBy in (productsData[0] || {})) {
    filtered.sort((a: any, b: any) => {
      const mul = order === 'asc' ? 1 : -1
      return (a[sortBy] - b[sortBy]) * mul
    })
  }

  const total = filtered.length
  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)

  return res.json({ success: true, message: 'ok', data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } })
})

/**
 * GET /api/products/categories
 */
productsRouter.get('/categories', requireAuth, (_req: Request, res: Response) => {
  return res.json({ success: true, message: 'ok', data: categories })
})

/**
 * GET /api/products/:id — 商品详情
 */
productsRouter.get('/:id', requireAuth, requirePermission('products.read'), (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id))
  const product = productsData.find(p => p.id === id)
  if (!product) return res.status(404).json({ success: false, message: '商品不存在' })
  return res.json({ success: true, message: 'ok', data: product })
})

/**
 * POST /api/products — 新增商品
 */
productsRouter.post('/', requireAuth, requirePermission('products.write'), (req: Request, res: Response) => {
  const user = (req as any).currentUser as ServerUser
  const { name, description, price, originalPrice, categoryId, category, brand, stock, images, specs } = req.body

  if (!name || !price) {
    return res.status(400).json({ success: false, message: '商品名称和价格为必填项' })
  }
  if (images && images.length > 2) {
    return res.status(400).json({ success: false, message: '最多只能上传 2 张图片' })
  }

  const MAX_PRODUCTS = 20
  if (productsData.length >= MAX_PRODUCTS) {
    return res.status(429).json({ success: false, message: `商品数已达上限（${MAX_PRODUCTS}），请清理后重试` })
  }

  const newProduct: any = {
    id: nextProductId++,
    name,
    description: description || '',
    price: parseFloat(price),
    originalPrice: parseFloat(originalPrice) || parseFloat(price),
    images: images || [`https://picsum.photos/seed/p${nextProductId}/600/600`],
    category: category || '未分类',
    categoryId: categoryId || 0,
    brand: brand || '',
    stock: parseInt(stock) || 0,
    sales: 0,
    rating: 5.0,
    specs: specs || {},
    status: 'on',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  productsData.push(newProduct)

  addLog(user.id, user.username, 'create', 'products', `新增商品 ${name}`)

  return res.status(201).json({ success: true, message: '商品创建成功', data: newProduct })
})

/**
 * PUT /api/products/:id — 编辑商品
 */
productsRouter.put('/:id', requireAuth, requirePermission('products.write'), (req: Request, res: Response) => {
  const user = (req as any).currentUser as ServerUser
  const id = parseInt(String(req.params.id))
  const index = productsData.findIndex(p => p.id === id)
  if (index === -1) return res.status(404).json({ success: false, message: '商品不存在' })
  if (req.body.images && req.body.images.length > 2) {
    return res.status(400).json({ success: false, message: '最多只能上传 2 张图片' })
  }

  const allowed = ['name', 'description', 'price', 'originalPrice', 'category', 'categoryId', 'brand', 'stock', 'images', 'specs', 'status']
  allowed.forEach(key => {
    if (req.body[key] !== undefined) {
      (productsData[index] as any)[key] = req.body[key]
    }
  })
  productsData[index].updatedAt = new Date().toISOString()

  addLog(user.id, user.username, 'update', 'products', `修改商品 ${productsData[index].name}`)

  return res.json({ success: true, message: '商品更新成功', data: productsData[index] })
})

/**
 * DELETE /api/products/:id — 删除商品 [admin+]
 */
productsRouter.delete('/:id', requireAuth, requirePermission('products.delete'), (req: Request, res: Response) => {
  const user = (req as any).currentUser as ServerUser
  const id = parseInt(String(req.params.id))
  const index = productsData.findIndex(p => p.id === id)
  if (index === -1) return res.status(404).json({ success: false, message: '商品不存在' })

  const deleted = productsData.splice(index, 1)[0]
  addLog(user.id, user.username, 'delete', 'products', `删除商品 ${deleted.name}`)

  return res.json({ success: true, message: '商品已删除' })
})
