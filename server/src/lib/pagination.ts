import type { Request } from 'express'

/**
 * 分页参数解析与钳制。
 *
 * 背景：原先 page / pageSize 直接 parseInt 就用，没有上下界。
 * `?pageSize=999999` 会把全量数据一次性序列化返回，`?page=-1` 会算出负的起始下标。
 * 压测时参数由脚本生成，很容易造出这种请求把服务打挂，所以在入口就钳死。
 */

/** 单页最大条数 */
export const MAX_PAGE_SIZE = 100

export interface Pagination {
  /** 已钳制，>= 1 */
  page: number
  /** 已钳制，1 <= pageSize <= maxPageSize */
  pageSize: number
  /** 起始下标，保证 >= 0 */
  start: number
}

/** 页码上限，避免 page 极大时 start 溢出 */
const MAX_PAGE = 1_000_000

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

export function parsePagination(
  req: Request,
  defaultPageSize: number,
  maxPageSize: number = MAX_PAGE_SIZE
): Pagination {
  const page = clampInt(req.query.page, 1, MAX_PAGE, 1)
  const pageSize = clampInt(req.query.pageSize, 1, maxPageSize, defaultPageSize)
  return { page, pageSize, start: (page - 1) * pageSize }
}

/** 统一的分页响应结构 */
export function paginated<T>(items: T[], total: number, p: Pagination) {
  return {
    items,
    total,
    page: p.page,
    pageSize: p.pageSize,
    totalPages: Math.ceil(total / p.pageSize),
  }
}
