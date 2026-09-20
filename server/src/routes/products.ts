import { Router, Request, Response } from 'express'
import { requireAuth, requirePermission, type ServerUser } from '../middleware/auth.js'
import { addLog } from './logs.js'
import { envInt } from '../lib/env.js'
import { VersionedCache } from '../lib/query-cache.js'
import { parsePagination, paginated } from '../lib/pagination.js'

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
 * 种子数据快照：模块加载时深拷贝一份。
 * 重置时用它整体还原，而不是「按位置截断」——后者在种子被删改过之后就不准了。
 */
const SEED_PRODUCTS = structuredClone(productsData)

/** 还原为初始种子商品 */
export function resetProducts() {
  productsData.length = 0
  productsData.push(...structuredClone(SEED_PRODUCTS))
  nextProductId = productsData.length + 1
  invalidateProducts()
}

/** 种子商品条数（种子就是前 N 条，供展示用） */
export const SEED_PRODUCT_COUNT = SEED_PRODUCTS.length

/**
 * id → 商品 的索引。
 * 原先 GET /products/:id 走 productsData.find，是 O(n) 线性扫描；
 * 数据量被 /api/perf/generate 撑到 5 万条后，每次详情请求都要扫全表。
 * 存的是对象引用，所以改字段不用重建，只有增删商品才需要 invalidateProducts()。
 */
let productIndex: Map<number, any> | null = null

function productById(id: number) {
  if (!productIndex) {
    productIndex = new Map()
    for (const p of productsData) productIndex.set(p.id, p)
  }
  return productIndex.get(id)
}

/**
 * 列表查询结果缓存。
 * 列表接口每次都要「过滤 + 排序 + 分页」，数据量大时单请求就是 O(n log n)，
 * 而压测反复打的是同一个 URL，缓存掉重复计算收益最大。
 */
const listCache = new VersionedCache<string, ReturnType<typeof buildList>>(200)

/** 商品数据发生任何写操作后必须调用 */
export function invalidateProducts() {
  productIndex = null
  listCache.bump()
}

/** 供 /api/perf/stats 与压测场景接口读取缓存命中情况 */
export function productCacheStats() {
  return listCache.stats
}

function buildList(opts: {
  keyword: string
  categoryId: number
  sortBy: string
  order: string
  p: ReturnType<typeof parsePagination>
}) {
  const { keyword, categoryId, sortBy, order, p } = opts

  // 有过滤条件时 filter 已产生新数组，无需再拷贝
  let filtered: any[] = productsData
  if (keyword) {
    filtered = filtered.filter(
      (prod) => prod.name.toLowerCase().includes(keyword) || prod.brand.toLowerCase().includes(keyword)
    )
  }
  if (categoryId) {
    filtered = filtered.filter((prod) => prod.categoryId === categoryId)
  }

  // 只有需要排序时才拷贝，避免每请求多一次全量复制
  if (sortBy in (productsData[0] || {})) {
    const sortable = filtered === productsData ? [...filtered] : filtered
    const mul = order === 'asc' ? 1 : -1
    sortable.sort((a: any, b: any) => (a[sortBy] - b[sortBy]) * mul)
    filtered = sortable
  }

  const total = filtered.length
  return paginated(filtered.slice(p.start, p.start + p.pageSize), total, p)
}

/**
 * GET /api/products — 商品列表
 */
productsRouter.get('/', requireAuth, requirePermission('products.read'), (req: Request, res: Response) => {
  const p = parsePagination(req, 6)
  const keyword = String(req.query.keyword || '').toLowerCase()
  const categoryId = parseInt(String(req.query.categoryId || '0'))
  const sortBy = String(req.query.sortBy || 'id')
  const order = String(req.query.order || 'desc')

  // 同一个查询串在数据未变更时复用结果，避免重复的过滤 + 排序
  const cacheKey = `${p.page}|${p.pageSize}|${keyword}|${categoryId}|${sortBy}|${order}`
  const data = listCache.remember(cacheKey, () =>
    buildList({ keyword, categoryId, sortBy, order, p })
  )

  return res.json({ success: true, message: 'ok', data })
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
  const product = productById(id)
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

  // 商品数上限可用环境变量调整：压测「新增商品」场景时放开，默认保留保护
  const MAX_PRODUCTS = envInt('MAX_PRODUCTS', 1000)
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
  invalidateProducts()

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
  invalidateProducts()

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
  invalidateProducts()
  addLog(user.id, user.username, 'delete', 'products', `删除商品 ${deleted.name}`)

  return res.json({ success: true, message: '商品已删除' })
})
