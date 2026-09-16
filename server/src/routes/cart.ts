import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { productsData } from './products.js'
import { setCartRef } from './dashboard.js'

export const cartRouter = Router()

interface CartItem {
  id: number
  userId: string
  productId: number
  quantity: number
}

const cartItems: CartItem[] = []
setCartRef(cartItems)
let nextId = 1

function getUserId(req: Request): string {
  const user = (req as any).currentUser
  return user?.token || 'anonymous'
}

function getProduct(id: number) {
  return productsData.find(p => p.id === id) || null
}

/** GET /api/cart — 获取购物车 */
cartRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const userId = getUserId(req)
  const items = cartItems
    .filter(ci => ci.userId === userId)
    .map(ci => ({ ...ci, product: getProduct(ci.productId) }))
    .filter(ci => ci.product)

  return res.json({ success: true, message: 'ok', data: items })
})

/** POST /api/cart — 加入购物车 */
cartRouter.post('/', requireAuth, (req: Request, res: Response) => {
  const userId = getUserId(req)
  const { productId, quantity = 1 } = req.body

  const product = getProduct(productId)
  if (!product) return res.status(404).json({ success: false, message: '商品不存在' })

  const exist = cartItems.find(ci => ci.userId === userId && ci.productId === productId)
  if (exist) {
    exist.quantity += quantity
    return res.json({ success: true, message: '已更新数量', data: { ...exist, product } })
  }

  const item: CartItem = { id: nextId++, userId, productId, quantity }
  cartItems.push(item)
  return res.status(201).json({ success: true, message: '已加入购物车', data: { ...item, product } })
})

/** PUT /api/cart/:id — 修改数量 */
cartRouter.put('/:id', requireAuth, (req: Request, res: Response) => {
  const userId = getUserId(req)
  const id = parseInt(String(req.params.id))
  const { quantity } = req.body

  const index = cartItems.findIndex(ci => ci.id === id && ci.userId === userId)
  if (index === -1) return res.status(404).json({ success: false, message: '购物车项不存在' })

  cartItems[index].quantity = Math.max(1, quantity)
  return res.json({ success: true, message: '已更新', data: { ...cartItems[index], product: getProduct(cartItems[index].productId) } })
})

/** DELETE /api/cart/:id — 移除 */
cartRouter.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const userId = getUserId(req)
  const id = parseInt(String(req.params.id))
  const index = cartItems.findIndex(ci => ci.id === id && ci.userId === userId)
  if (index === -1) return res.status(404).json({ success: false, message: '购物车项不存在' })

  cartItems.splice(index, 1)
  return res.json({ success: true, message: '已移除' })
})
