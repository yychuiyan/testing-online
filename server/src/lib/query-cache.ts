/**
 * 带版本号的 LRU 缓存。
 *
 * 场景：列表接口每次请求都要「全量过滤 + 全量排序」，数据量到 5 万条时
 * 单次开销是 O(n log n)。压测时同一个 URL 被反复请求、结果完全一样，
 * 缓存掉这部分重复计算是收益最大的一步。
 *
 * 一致性：任何写操作后调用 bump()，让所有已缓存结果失效，避免脏读。
 * 键空间由查询参数决定，所以用 maxSize 做容量上限，防止内存无界增长。
 */
export class VersionedCache<K, V> {
  private version = 0
  private store = new Map<K, { version: number; value: V }>()
  private hits = 0
  private misses = 0

  constructor(private maxSize = 200) {}

  /** 数据变更后调用：让所有已缓存结果失效 */
  bump() {
    this.version++
    this.store.clear()
  }

  get(key: K): V | undefined {
    const hit = this.store.get(key)
    if (!hit || hit.version !== this.version) {
      this.misses++
      return undefined
    }
    // 命中后移到队尾，保持 LRU 顺序
    this.store.delete(key)
    this.store.set(key, hit)
    this.hits++
    return hit.value
  }

  set(key: K, value: V): V {
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
    this.store.set(key, { version: this.version, value })
    return value
  }

  /** 命中则直接返回，否则计算并写入 */
  remember(key: K, build: () => V): V {
    const hit = this.get(key)
    if (hit !== undefined) return hit
    return this.set(key, build())
  }

  get size() {
    return this.store.size
  }

  get stats() {
    return { size: this.store.size, hits: this.hits, misses: this.misses }
  }
}
