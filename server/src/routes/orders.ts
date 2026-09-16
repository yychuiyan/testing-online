import { Router, Request, Response } from 'express'
import { requireAuth, requirePermission, type ServerUser } from '../middleware/auth.js'
import { addLog } from './logs.js'
import { setOrdersRef } from './dashboard.js'

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

// 初始化仪表盘引用
setOrdersRef(ordersData)

/**
 * GET /api/orders — 订单列表
 */
ordersRouter.get('/', requireAuth, requirePermission('orders.read'), (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || '1'))
  const pageSize = parseInt(String(req.query.pageSize || '5'))
  const keyword = String(req.query.keyword || '').toLowerCase()
  const status = String(req.query.status || '')

  let filtered = [...ordersData]
  if (keyword) filtered = filtered.filter(o => o.orderNo.includes(keyword) || o.username.includes(keyword))
  if (status) filtered = filtered.filter(o => o.status === status)

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const total = filtered.length
  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)

  return res.json({ success: true, message: 'ok', data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } })
})

/**
 * GET /api/orders/:id — 订单详情
 */
ordersRouter.get('/:id', requireAuth, requirePermission('orders.read'), (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id))
  const order = ordersData.find(o => o.id === id)
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
  addLog(user.id, user.username, 'update', 'orders', `修改订单 ${order.orderNo} 状态为 ${status}`)

  return res.json({ success: true, message: '状态更新成功', data: order })
})
