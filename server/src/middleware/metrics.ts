/**
 * 运行时指标采集：事件循环延迟、CPU 占用、活跃句柄数。
 *
 * 为什么要看 event loop 延迟：
 * Node 是单线程事件循环，一个同步耗时的接口（比如 5 万条数据的全量排序）
 * 会把整个进程卡住，表现为「所有接口一起变慢」。
 * 只看内存和 RPS 是发现不了的，event loop lag 是最直接的证据。
 */

const SAMPLE_INTERVAL = 500

let timer: NodeJS.Timeout | null = null
let lastTick = 0
let currentLagMs = 0
let peakLagMs = 0

let lastCpuUsage = process.cpuUsage()
let lastCpuAt = 0
let cpuPercent = 0

/** 活跃句柄数；Node 未暴露该私有 API 时返回 -1 */
function activeHandles(): number {
  const fn = (process as any)._getActiveHandles
  if (typeof fn !== 'function') return -1
  try {
    const handles = fn.call(process)
    return Array.isArray(handles) ? handles.length : -1
  } catch {
    return -1
  }
}

export function startMetricsSampler() {
  if (timer) return

  lastTick = Date.now()
  lastCpuUsage = process.cpuUsage()
  lastCpuAt = Date.now()

  timer = setInterval(() => {
    const now = Date.now()

    // 实际间隔比预期多出来的那部分，就是被同步任务阻塞的时间
    const drift = now - lastTick - SAMPLE_INTERVAL
    lastTick = now
    currentLagMs = Math.max(0, drift)
    if (currentLagMs > peakLagMs) peakLagMs = currentLagMs

    const diff = process.cpuUsage(lastCpuUsage)
    lastCpuUsage = process.cpuUsage()
    const elapsedMs = now - lastCpuAt
    lastCpuAt = now
    const usedMs = (diff.user + diff.system) / 1000
    // 多线程（libuv 线程池）场景下可能超过 100%
    cpuPercent = elapsedMs > 0 ? Math.round((usedMs / elapsedMs) * 1000) / 10 : 0
  }, SAMPLE_INTERVAL)

  // 不要因为这个采样器把进程钉住
  timer.unref?.()
}

export function resetPeakLag() {
  peakLagMs = 0
}

export function metricsSnapshot() {
  const mem = process.memoryUsage()
  return {
    eventLoop: {
      currentLagMs,
      peakLagMs,
      sampleIntervalMs: SAMPLE_INTERVAL,
    },
    cpuPercent,
    uptimeSec: Math.round(process.uptime()),
    handles: activeHandles(),
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      externalMb: Math.round(mem.external / 1024 / 1024),
    },
  }
}
