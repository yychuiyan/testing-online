// ===== 后台管理系统共享类型 =====

// --- 角色与权限 ---
export type Role = 'admin' | 'user'

export const ROLES: { value: Role; label: string; color: string }[] = [
  { value: 'admin', label: '管理员', color: 'blue' },
  { value: 'user', label: '普通用户', color: 'default' },
]

/** 每个角色对应的权限列表 */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ['*'],
  user: ['users.read', 'products.read', 'orders.read'],
}

// --- 用户 ---
export interface User {
  id: number
  username: string
  email: string
  role: Role
  status: 'active' | 'disabled'
  avatar?: string
  createdAt: string
  lastLoginAt?: string
}

export interface AuthUser {
  username: string
  token: string
  role: Role
  permissions: string[]
}

// --- 商品 ---
export interface Product {
  id: number
  name: string
  description: string
  price: number
  originalPrice: number
  images: string[]
  category: string
  categoryId: number
  brand: string
  stock: number
  sales: number
  rating: number
  specs: Record<string, string>
  status: 'on' | 'off'
  createdAt: string
  updatedAt?: string
}

// --- 订单 ---
export type OrderStatus = 'pending_payment' | 'pending_shipment' | 'shipped' | 'delivered' | 'completed' | 'cancelled'

export const ORDER_STATUS_MAP: Record<OrderStatus, string> = {
  pending_payment: '待付款',
  pending_shipment: '待发货',
  shipped: '已发货',
  delivered: '已签收',
  completed: '已完成',
  cancelled: '已取消',
}

export interface OrderItem {
  productId: number
  productName: string
  productImage: string
  price: number
  quantity: number
}

export interface Order {
  id: number
  userId: number
  username: string
  orderNo: string
  items: OrderItem[]
  totalAmount: number
  actualAmount: number
  status: OrderStatus
  address: string
  paymentMethod: string
  createdAt: string
}

// --- 操作日志 ---
export interface LogEntry {
  id: number
  userId: number
  username: string
  action: string
  module: string
  detail: string
  ip: string
  createdAt: string
}

// --- 仪表盘 ---
export interface DashboardStats {
  totalUsers: number
  totalProducts: number
  totalOrders: number
  cartCount: number
  revenueToday: number
  revenueMonth: number
}

export interface TrendPoint {
  date: string
  value: number
}

// --- 分类 ---
export interface Category {
  id: number
  name: string
  icon: string
}

// --- API 通用 ---
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
