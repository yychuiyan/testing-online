import { Router, Request, Response } from 'express'
import { requireAuth, requirePermission, type ServerUser } from '../middleware/auth.js'
import { addLog } from './logs.js'
import { setOrdersRef } from './dashboard.js'
import { VersionedCache } from '../lib/query-cache.js'
import { parsePagination, paginated } from '../lib/pagination.js'
import { envInt } from '../lib/env.js'
import { productsData } from './products.js'
import { getUserCartItems, clearUserCart } from './cart.js'

export const ordersRouter = Router()

interface OrderItem { productId: number; productName: string; productImage: string; price: number; quantity: number }
interface Order {
  id: number; userId: number; username: string; orderNo: string; items: OrderItem[]
  totalAmount: number; actualAmount: number; status: string
  address: string; paymentMethod: string; createdAt: string
}

const ordersData: Order[] = [
  { id: 1, userId: 1, username: '炊烟1号', orderNo: 'ORD202601010001', items: [{ productId: 1, productName: 'iPhone 15 Pro Max', productImage: 'https://picsum.photos/seed/p1/200/200', price: 9999, quantity: 1 }], totalAmount: 9999, actualAmount: 9999, status: 'completed', address: '北京市朝阳区', paymentMethod: 'wechat', createdAt: '2026-01-15T10:30:00Z' },
  { id: 2, userId: 2, username: '炊烟2号', orderNo: 'ORD202603150002', items: [{ productId: 3, productName: 'MacBook Pro 14', productImage: 'https://picsum.photos/seed/p3/200/200', price: 14999, quantity: 1 }, { productId: 8, productName: 'Sony WH-1000XM5', productImage: 'https://picsum.photos/seed/p8/200/200', price: 2299, quantity: 1 }], totalAmount: 17298, actualAmount: 17288, status: 'shipped', address: '上海市浦东新区', paymentMethod: 'alipay', createdAt: '2026-03-15T14:20:00Z' },
  { id: 3, userId: 2, username: '炊烟2号', orderNo: 'ORD202605200003', items: [{ productId: 5, productName: 'Nike Air Jordan 1', productImage: 'https://picsum.photos/seed/p5/200/200', price: 1299, quantity: 2 }], totalAmount: 2598, actualAmount: 2588, status: 'pending_shipment', address: '深圳市南山区', paymentMethod: 'wechat', createdAt: '2026-05-20T09:15:00Z' },
  { id: 4, userId: 1, username: '炊烟1号', orderNo: 'ORD202606100004', items: [{ productId: 2, productName: '华为 Mate 60 Pro', productImage: 'https://picsum.photos/seed/p2/200/200', price: 6999, quantity: 1 }], totalAmount: 6999, actualAmount: 6989, status: 'delivered', address: '北京市朝阳区', paymentMethod: 'alipay', createdAt: '2026-06-10T11:00:00Z' },
  { id: 5, userId: 1, username: '炊烟1号', orderNo: 'ORD202606180005', items: [{ productId: 4, productName: 'Dyson V15', productImage: 'https://picsum.photos/seed/p4/200/200', price: 4990, quantity: 1 }, { productId: 6, productName: '智利车厘子', productImage: 'https://picsum.photos/seed/p6/200/200', price: 299, quantity: 2 }], totalAmount: 5588, actualAmount: 5578, status: 'pending_payment', address: '北京市朝阳区', paymentMethod: 'wechat', createdAt: new Date().toISOString() },
  { id: 6, userId: 2, username: '炊烟2号', orderNo: 'ORD202606150006', items: [{ productId: 4, productName: 'Dyson V15', productImage: 'https://picsum.photos/seed/p4/200/200', price: 4990, quantity: 1 }], totalAmount: 4990, actualAmount: 4980, status: 'completed', address: '上海市浦东新区', paymentMethod: 'wechat', createdAt: '2026-06-15T08:30:00Z' },
  { id: 7, userId: 1, username: '炊烟1号', orderNo: 'ORD202606160007', items: [{ productId: 5, productName: 'Nike Air Jordan 1', productImage: 'https://picsum.photos/seed/p5/200/200', price: 1299, quantity: 1 }], totalAmount: 1299, actualAmount: 1289, status: 'pending_payment', address: '广州市天河区', paymentMethod: 'alipay', createdAt: '2026-06-16T10:00:00Z' },
  { id: 8, userId: 2, username: '炊烟2号', orderNo: 'ORD202606160008', items: [{ productId: 7, productName: 'MUJI 懒人沙发', productImage: 'https://picsum.photos/seed/p7/200/200', price: 3499, quantity: 1 }, { productId: 6, productName: '智利车厘子', productImage: 'https://picsum.photos/seed/p6/200/200', price: 299, quantity: 3 }], totalAmount: 4396, actualAmount: 4386, status: 'shipped', address: '上海市静安区', paymentMethod: 'wechat', createdAt: '2026-06-16T14:30:00Z' },
  { id: 9, userId: 1, username: '炊烟1号', orderNo: 'ORD202606170009', items: [{ productId: 8, productName: 'Sony WH-1000XM5', productImage: 'https://picsum.photos/seed/p8/200/200', price: 2299, quantity: 1 }], totalAmount: 2299, actualAmount: 2289, status: 'delivered', address: '北京市朝阳区', paymentMethod: 'wechat', createdAt: '2026-06-17T09:00:00Z' },
  { id: 10, userId: 2, username: '炊烟2号', orderNo: 'ORD202606170010', items: [{ productId: 2, productName: '华为 Mate 60 Pro', productImage: 'https://picsum.photos/seed/p2/200/200', price: 6999, quantity: 1 }, { productId: 4, productName: 'Dyson V15', productImage: 'https://picsum.photos/seed/p4/200/200', price: 4990, quantity: 1 }], totalAmount: 11989, actualAmount: 11979, status: 'pending_shipment', address: '上海市浦东新区', paymentMethod: 'alipay', createdAt: '2026-06-17T16:00:00Z' },
  { id: 11, userId: 1, username: '炊烟1号', orderNo: 'ORD202606180011', items: [{ productId: 3, productName: 'MacBook Pro 14', productImage: 'https://picsum.photos/seed/p3/200/200', price: 14999, quantity: 1 }], totalAmount: 14999, actualAmount: 14989, status: 'cancelled', address: '北京市海淀区', paymentMethod: 'wechat', createdAt: '2026-06-18T11:30:00Z' },
  { id: 12, userId: 2, username: '炊烟2号', orderNo: 'ORD202606190012', items: [{ productId: 1, productName: 'iPhone 15 Pro Max', productImage: 'https://picsum.photos/seed/p1/200/200', price: 9999, quantity: 1 }, { productId: 8, productName: 'Sony WH-1000XM5', productImage: 'https://picsum.photos/seed/p8/200/200', price: 2299, quantity: 1 }], totalAmount: 12298, actualAmount: 12288, status: 'pending_payment', address: '杭州市西湖区', paymentMethod: 'alipay', createdAt: '2026-06-19T08:00:00Z' },
]

let nextOrderId = ordersData.length + 1

/** 种子数据快照：模块加载时深拷贝一份，重置时整体还原 */
const SEED_ORDERS = structuredClone(ordersData)

/** 种子订单条数 */
export const SEED_ORDER_COUNT = SEED_ORDERS.length

/** 当前订单条数 */
export function orderCount() {
  return ordersData.length
}

/** 还原为初始种子订单 */
export function resetOrders() {
  ordersData.length = 0
  ordersData.push(...structuredClone(SEED_ORDERS))
  nextOrderId = ordersData.length + 1
  invalidateOrders()
}

/** id → 订单 索引，避免详情接口做 O(n) 线性扫描 */
let orderIndex: Map<number, Order> | null = null

function orderById(id: number) {
  if (!orderIndex) {
    orderIndex = new Map()
    for (const o of ordersData) orderIndex.set(o.id, o)
  }
  return orderIndex.get(id)
}

/** 列表查询结果缓存：订单列表每次都要全量过滤 + 全量排序 */
const listCache = new VersionedCache<string, any>(200)

/** 订单发生变更后必须调用 */
function invalidateOrders() {
  orderIndex = null
  listCache.bump()
}

// 初始化仪表盘引用
setOrdersRef(ordersData)

/**
 * GET /api/orders — 订单列表
 */
ordersRouter.get('/', requireAuth, requirePermission('orders.read'), (req: Request, res: Response) => {
  const p = parsePagination(req, 5)
  const keyword = String(req.query.keyword || '').toLowerCase()
  const status = String(req.query.status || '')

  const cacheKey = `${p.page}|${p.pageSize}|${keyword}|${status}`
  const data = listCache.remember(cacheKey, () => {
    let filtered: Order[] = ordersData
    if (keyword) {
      filtered = filtered.filter((o) => o.orderNo.includes(keyword) || o.username.includes(keyword))
    }
    if (status) {
      filtered = filtered.filter((o) => o.status === status)
    }

    // 按创建时间倒序；filter 已产生新数组时可直接排序，否则先拷贝
    const sorted = [...filtered]
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const total = sorted.length
    return paginated(sorted.slice(p.start, p.start + p.pageSize), total, p)
  })

  return res.json({ success: true, message: 'ok', data })
})

/** 允许的支付方式（与种子订单保持一致） */
const VALID_PAYMENT_METHODS = ['wechat', 'alipay']

/**
 * 人为并发窗口（毫秒）。默认 0 = 不插入 await，行为与同步版本完全一致。
 * 设为 >0 时，下单会在「校验库存」与「扣减库存」之间让出事件循环，用于演示超卖。
 */
const ORDER_RACE_WINDOW_MS = envInt('ORDER_RACE_WINDOW_MS', 0)

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

/**
 * POST /api/orders — 创建订单（下单）
 *
 * 两种用法：
 *   1) 不传 items：结算当前用户购物车（真实链路），下单成功后清空购物车；
 *   2) 传 items: [{ productId, quantity }]，直接下单，便于压测脚本省去加购步骤。
 *
 * 这是唯一「多步写 + 跨模块联动」的接口：扣库存、加销量、建订单、清购物车、写日志，
 * 并让订单列表缓存整体失效，是写入链路里最值得压的一条。
 *
 * 并发提示（重要）：
 *   默认（ORDER_RACE_WINDOW_MS=0）下单是同步的，Node 单线程下「校验库存 → 扣减库存」
 *   之间不让出事件循环，因此并发下单不会超卖，压它压的是多步写的吞吐。
 *   把 ORDER_RACE_WINDOW_MS 设为 >0，会在校验与扣减之间插入一个 await，
 *   人为造出 TOCTOU 窗口：多个请求可先后通过同一个库存快照，再各自扣减 → 超卖（库存为负）。
 *   这是用于演示「竞态条件」的开关，正式压测请保持 0。
 */
ordersRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).currentUser as ServerUser
  const body = req.body || {}
  const { address, paymentMethod = 'wechat' } = body
  const rawItems = body.items

  // —— 边界校验：以下全部来自请求体，一律不可信 ——
  if (rawItems !== undefined && !Array.isArray(rawItems)) {
    return res.status(400).json({ success: false, message: 'items 必须是数组' })
  }
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: `无效的支付方式，可选：${VALID_PAYMENT_METHODS.join(' / ')}` })
  }

  // 组装来源项：显式 items 优先，否则结算购物车
  let source: any[]
  let fromCart = false
  if (Array.isArray(rawItems)) {
    source = rawItems
  } else {
    fromCart = true
    source = getUserCartItems(user.token)
    if (source.length === 0) {
      return res.status(400).json({ success: false, message: '购物车为空，无法下单' })
    }
  }
  if (source.length === 0) {
    return res.status(400).json({ success: false, message: '订单不能为空' })
  }

  // 逐项校验，并按 productId 合并重复项，避免同一商品被重复扣减
  const merged = new Map<number, number>()
  for (const it of source) {
    const productId = Number(it?.productId)
    const quantity = Number(it?.quantity ?? 1)
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: 'productId 必须是正整数' })
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'quantity 必须是正整数' })
    }
    merged.set(productId, (merged.get(productId) || 0) + quantity)
  }

  // 先全部校验通过，再改动任何状态，避免校验失败留下「半成品」订单
  const items: OrderItem[] = []
  for (const [productId, quantity] of merged) {
    const product = productsData.find(p => p.id === productId)
    if (!product) {
      return res.status(404).json({ success: false, message: `商品 ${productId} 不存在` })
    }
    const stock = product.stock ?? 0
    if (stock < quantity) {
      return res.status(409).json({ success: false, message: `商品「${product.name}」库存不足（剩余 ${stock}）` })
    }
    items.push({
      productId,
      productName: product.name,
      productImage: product.images?.[0] || '',
      price: product.price,
      quantity,
    })
  }

  // —— 人为并发窗口：默认关闭 ——
  // 在此让出事件循环，其他请求可趁机完成「校验通过」，
  // 于是多个请求拿着同一份库存快照进入写入段 → 扣减时超卖（库存为负）。
  if (ORDER_RACE_WINDOW_MS > 0) {
    await sleep(ORDER_RACE_WINDOW_MS)
  }

  // —— 校验通过，开始写入 ——
  for (const it of items) {
    const product = productsData.find(p => p.id === it.productId)!
    product.stock = (product.stock ?? 0) - it.quantity
    product.sales = (product.sales ?? 0) + it.quantity
  }

  const totalAmount = items.reduce((sum, it) => sum + it.price * it.quantity, 0)
  const id = nextOrderId++
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const orderNo = `ORD${stamp}${String(id).padStart(4, '0')}`

  const order: Order = {
    id,
    // 关键：订单用用户 id(number)，而购物车用 token(string)，此处必须取 user.id
    userId: user.id,
    username: user.username,
    orderNo,
    items,
    totalAmount,
    actualAmount: totalAmount,
    status: 'pending_payment',
    address: typeof address === 'string' && address.trim() ? address.trim() : '北京市朝阳区',
    paymentMethod,
    createdAt: now.toISOString(),
  }
  ordersData.push(order)

  if (fromCart) clearUserCart(user.token)

  invalidateOrders()
  addLog(user.id, user.username, 'create', 'orders', `创建订单 ${orderNo}，${items.length} 项，合计 ¥${totalAmount}`)

  return res.status(201).json({ success: true, message: '下单成功', data: order })
})

/**
 * GET /api/orders/:id — 订单详情
 */
ordersRouter.get('/:id', requireAuth, requirePermission('orders.read'), (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id))
  const order = orderById(id)
  if (!order) return res.status(404).json({ success: false, message: '订单不存在' })
  return res.json({ success: true, message: 'ok', data: order })
})

/**
 * PUT /api/orders/:id/status — 修改订单状态 [admin+]
 */
ordersRouter.put('/:id/status', requireAuth, requirePermission('orders.write'), (req: Request, res: Response) => {
  const user = (req as any).currentUser as ServerUser
  const id = parseInt(String(req.params.id))
  const { status } = req.body

  const order = ordersData.find(o => o.id === id)
  if (!order) return res.status(404).json({ success: false, message: '订单不存在' })

  const validStatuses = ['pending_payment', 'pending_shipment', 'shipped', 'delivered', 'completed', 'cancelled']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: '无效的状态' })
  }

  order.status = status
  invalidateOrders()
  addLog(user.id, user.username, 'update', 'orders', `修改订单 ${order.orderNo} 状态为 ${status}`)

  return res.json({ success: true, message: '状态更新成功', data: order })
})
