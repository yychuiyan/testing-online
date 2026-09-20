import type { ApiResponse, PaginatedData, Product, Order, User, LogEntry, DashboardStats, TrendPoint, AuthUser, Category } from './types'

const BASE_URL = '/api'
const DEFAULT_TIMEOUT = 15000
const TOKEN_KEY = 'auth_token'

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

  try {
    const headers = new Headers(authHeaders(options.headers))
    if (!headers.has('Content-Type') && options.body != null) {
      headers.set('Content-Type', 'application/json')
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.status === 401 && onUnauthorized) {
      clearToken()
      onUnauthorized()
    }

    if (res.status === 403) {
      return { success: false, message: '无权限访问' }
    }

    const data = await res.json().catch(() => ({
      success: false,
      message: `请求失败: ${res.status}`,
    }))

    return data as ApiResponse<T>
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { success: false, message: '请求超时' }
    }
    // fetch 连不上后端时抛 TypeError（与网络断开、凭证错误区分开），
    // 否则统一提示「检查网络连接」会把人往密码/网络方向带偏
    if (err instanceof TypeError) {
      return { success: false, message: '无法连接服务器，请确认后端已启动（默认 http://localhost:3001）' }
    }
    return { success: false, message: '网络错误，请检查网络连接' }
  }
}

function get<T>(path: string) {
  return request<T>(path, { method: 'GET' })
}

function post<T>(path: string, body?: unknown) {
  return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
}

function put<T>(path: string, body?: unknown) {
  return request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
}

function del<T>(path: string) {
  return request<T>(path, { method: 'DELETE' })
}

/** FormData 上传（不设 Content-Type，由浏览器自动带 boundary） */
export async function uploadFile(file: File): Promise<ApiResponse<{ url: string; filename: string }>> {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    })
    if (res.status === 401 && onUnauthorized) {
      clearToken()
      onUnauthorized()
    }
    return await res.json()
  } catch {
    return { success: false, message: '上传失败' }
  }
}

/**
 * 大模型接口的原始请求入口。
 *
 * 为什么不走 request()：
 *   1. 大模型接口是 OpenAI 兼容格式，没有 { success, data } 信封，强转会拿到错东西；
 *   2. 测 TTFT 必须逐块读响应流，request() 一次性 await res.json() 拿不到中间态。
 * 这里只负责把鉴权头带上，其余交给调用方。
 */
export function llmFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(authHeaders(init.headers))
  if (!headers.has('Content-Type') && init.body != null) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${BASE_URL}${path}`, { ...init, headers })
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      post<AuthUser>('/auth/login', { username, password }),
    register: (username: string, email: string, password: string, role?: string) =>
      post<AuthUser>('/auth/register', { username, email, password, role }),
    logout: () => post<void>('/auth/logout'),
    me: () => get<AuthUser>('/auth/me'),
  },

  dashboard: {
    stats: () => get<DashboardStats>('/dashboard/stats'),
    trends: (days?: number) => get<TrendPoint[]>(`/dashboard/trends${days ? `?days=${days}` : ''}`),
  },

  users: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString() : ''
      return get<PaginatedData<User>>(`/users${qs}`)
    },
    detail: (id: number) => get<User>(`/users/${id}`),
    create: (data: Partial<User>) => post<User>('/users', data),
    update: (id: number, data: Partial<User>) => put<User>(`/users/${id}`, data),
    remove: (id: number) => del<void>(`/users/${id}`),
    updateRole: (id: number, role: string) => put<User>(`/users/${id}/role`, { role }),
  },

  products: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString() : ''
      return get<PaginatedData<Product>>(`/products${qs}`)
    },
    detail: (id: number) => get<Product>(`/products/${id}`),
    create: (data: Partial<Product>) => post<Product>('/products', data),
    update: (id: number, data: Partial<Product>) => put<Product>(`/products/${id}`, data),
    remove: (id: number) => del<void>(`/products/${id}`),
    categories: () => get<Category[]>('/products/categories'),
  },

  cart: {
    list: () => get<any[]>('/cart'),
    add: (productId: number, quantity?: number) => post<any>('/cart', { productId, quantity }),
    update: (id: number, quantity: number) => put<any>(`/cart/${id}`, { quantity }),
    remove: (id: number) => del<void>(`/cart/${id}`),
  },

  orders: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString() : ''
      return get<PaginatedData<Order>>(`/orders${qs}`)
    },
    detail: (id: number) => get<Order>(`/orders/${id}`),
    updateStatus: (id: number, status: string) => put<Order>(`/orders/${id}/status`, { status }),
    /** 下单。不传 items 即结算购物车；传 items 则按商品直接下单 */
    create: (payload?: { items?: { productId: number; quantity: number }[]; address?: string; paymentMethod?: string }) =>
      post<Order>('/orders', payload ?? {}),
  },

  logs: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString() : ''
      return get<PaginatedData<LogEntry>>(`/logs${qs}`)
    },
  },

  perf: {
    stats: () => get<{
      users: number
      products: number
      memory: { rss: number; heapUsed: number; heapTotal: number }
      cache: { size: number; hits: number; misses: number; hitRate: number }
    }>('/perf/stats'),
    generate: (type: 'products' | 'users', count: number) =>
      post<{ count: number; elapsed: string }>('/perf/generate', { type, count }),
    clear: (type: 'products' | 'users') =>
      post<{ removed: number }>('/perf/clear', { type }),
    reset: () =>
      post<{
        before: { products: number; users: number; orders: number; logs: number }
        after: { products: number; users: number; orders: number; logs: number }
      }>('/perf/reset'),
    slow: (delay: number) => get<{ delay: number; timestamp: string }>(`/perf/slow?delay=${delay}`),
    stress: (concurrency: number) =>
      post<{
        concurrency: number
        totalElapsed: string
        avgResponseTime: string
        maxResponseTime: string
        minResponseTime: string
        hint?: string
      }>('/perf/stress', { concurrency }),
  },

  /** 压测场景接口：给 Locust / JMeter 练习用的可控变量 */
  scenario: {
    failRate: (rate: number) =>
      get<{ injected: boolean; rate: number }>(`/scenario/fail-rate?rate=${rate}`),
    payload: (sizeKb: number) =>
      get<{ sizeKb: number }>(`/scenario/payload?size=${sizeKb}`),
    cpu: (rounds: number) =>
      get<{ rounds: number; iterations: number; serverComputeMs: number }>(`/scenario/cpu?rounds=${rounds}`),
    cached: () =>
      get<{ count: number; priceSum: number; maxPrice: number; onSale: number; cacheHit: boolean; ttlMs: number }>('/scenario/cached'),
    uncached: (rounds: number) =>
      get<{ count: number; rounds: number; cacheHit: boolean }>(`/scenario/uncached?rounds=${rounds}`),
    rateLimited: (limit: number, windowMs: number) =>
      get<{ count: number; limit: number; remaining: number }>(`/scenario/rate-limited?limit=${limit}&window=${windowMs}`),
    metrics: () => get<ServerMetrics>('/scenario/metrics'),
    resetMetrics: () => post<ServerMetrics>('/scenario/metrics/reset'),
  },
}

export interface ServerMetrics {
  eventLoop: { currentLagMs: number; peakLagMs: number; sampleIntervalMs: number }
  cpuPercent: number
  uptimeSec: number
  handles: number
  memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number; externalMb: number }
}
