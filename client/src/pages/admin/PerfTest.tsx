import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThunderboltOutlined, ExperimentOutlined, LineChartOutlined } from '@ant-design/icons'
import { Card, Button, InputNumber, Typography, Row, Col, Statistic, Space, Table, Tag, Tooltip } from 'antd'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useToast } from '../../lib/toast'
import { useModal } from '../../lib/modal'
import { api, type ServerMetrics } from '../../lib/api'
import { LLM_ENDPOINTS } from '../../lib/endpoints'

/** 大模型两条的文案取自 lib/endpoints，与「仪表盘 → 性能接口列表」同源，避免改了这边忘了那边 */
const llmMockEp = LLM_ENDPOINTS.find(e => e.path.includes('/llm/v1/'))
const llmRealEp = LLM_ENDPOINTS.find(e => e.path.includes('/llm-real/'))

interface Stats {
  users: number
  products: number
  memory: { rss: number; heapUsed: number; heapTotal: number }
  cache: { size: number; hits: number; misses: number; hitRate: number }
}

export default function PerfTest() {
  useDocumentTitle('性能测试入口')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [genCount, setGenCount] = useState({ products: 100, users: 50 })
  const [slowDelay, setSlowDelay] = useState(2000)
  const [stressConcurrency, setStressConcurrency] = useState(10)
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null)
  const [failRate, setFailRate] = useState(0.05)
  const [payloadKb, setPayloadKb] = useState(100)
  const [cpuRounds, setCpuRounds] = useState(500)
  const [uncachedRounds, setUncachedRounds] = useState(1000)
  const [scenarioMsg, setScenarioMsg] = useState('')
  const { success, error } = useToast()
  const { confirm } = useModal()
  const navigate = useNavigate()

  const fetchStats = useCallback(async () => {
    const res = await api.perf.stats()
    if (res.success && res.data) setStats(res.data)
  }, [])

  const fetchMetrics = useCallback(async () => {
    const res = await api.scenario.metrics()
    if (res.success && res.data) setMetrics(res.data)
  }, [])

  // 运行时指标是持续采样的，进页面后定时刷新才能看出趋势
  useEffect(() => {
    fetchStats()
    fetchMetrics()
    const timer = setInterval(fetchMetrics, 3000)
    return () => clearInterval(timer)
  }, [fetchStats, fetchMetrics])

  // 头部「清除数据」把数据还原成种子后，本页统计需要同步（本页已不再放清除按钮）
  useEffect(() => {
    const onReset = () => fetchStats()
    window.addEventListener('app:data-reset', onReset)
    return () => window.removeEventListener('app:data-reset', onReset)
  }, [fetchStats])

  /** 调用场景接口并把结果摘要展示出来 */
  const runScenario = async (label: string, fn: () => Promise<any>) => {
    const t0 = performance.now()
    try {
      const res = await fn()
      const ms = Math.round(performance.now() - t0)
      const detail = res?.data ? JSON.stringify(res.data).slice(0, 160) : ''
      setScenarioMsg(`${label} → ${res?.success ? '成功' : '失败'}，客户端耗时 ${ms}ms${detail ? `\n${detail}` : ''}`)
    } catch {
      setScenarioMsg(`${label} → 请求异常`)
    }
  }

  const handleGenerate = async (type: 'products' | 'users') => {
    setLoading(true)
    const count = genCount[type]
    const ok = await confirm('确认生成', `将生成 ${count} 条${type === 'products' ? '商品' : '用户'}测试数据，可能导致内存增长。`)
    if (!ok) { setLoading(false); return }
    const res = await api.perf.generate(type, count)
    if (res.success && res.data) {
      success(res.message || '生成成功', `耗时 ${res.data.elapsed}`)
      fetchStats()
    } else {
      error(res.message)
    }
    setLoading(false)
  }

  const handleClear = async (type: 'products' | 'users') => {
    const ok = await confirm('确认清除', `将清除所有生成的${type === 'products' ? '商品' : '用户'}数据（保留原始数据）`)
    if (!ok) return
    const res = await api.perf.clear(type)
    if (res.success) {
      const removed = res.data?.removed || 0
      if (removed > 0) { success(res.message); fetchStats() }
      else { success('没有需要清除的数据') }
    } else {
      error(res.message)
    }
  }

  const handleSlow = async () => {
    const t0 = performance.now()
    const res = await api.perf.slow(slowDelay)
    const ms = Math.round(performance.now() - t0)
    setScenarioMsg(
      res.success
        ? `慢接口 → 客户端耗时 ${ms}ms（设定延迟 ${slowDelay}ms）`
        : `慢接口 → 失败：${res.message}`
    )
  }

  const handleStress = async () => {
    setLoading(true)
    const t0 = performance.now()
    const res = await api.perf.stress(stressConcurrency)
    const total = Math.round(performance.now() - t0)
    setLoading(false)

    if (res.success && res.data) {
      const d = res.data
      setScenarioMsg(
        [
          `服务端并发压测 → 并发 ${d.concurrency}，客户端总耗时 ${total}ms`,
          `平均 ${d.avgResponseTime} · 最大 ${d.maxResponseTime} · 最小 ${d.minResponseTime}`,
          d.hint,
        ]
          .filter(Boolean)
          .join('\n')
      )
      fetchStats()
    } else {
      setScenarioMsg(`服务端并发压测 → 失败：${res.message}`)
    }
  }

  /** 各场景的可操作入口 */
  const scenarioRows = [
    {
      key: 'gen-products',
      name: '商品测试数据',
      api: 'POST /api/perf/generate',
      desc: `批量造商品数据，用于测分页、排序、缓存对照。当前 ${stats?.products ?? '—'} 条`,
      control: (
        <Space size={4}>
          <InputNumber min={1} max={50000} value={genCount.products} onChange={v => setGenCount(p => ({ ...p, products: v || 0 }))} style={{ width: 88 }} />
          <Button size="small" type="primary" loading={loading} onClick={() => handleGenerate('products')}>生成</Button>
          <Button size="small" onClick={() => handleClear('products')}>清除</Button>
        </Space>
      ),
    },
    {
      key: 'gen-users',
      name: '用户测试数据',
      api: 'POST /api/perf/generate',
      desc: `批量造用户数据，用于测登录鉴权、用户列表。当前 ${stats?.users ?? '—'} 条`,
      control: (
        <Space size={4}>
          <InputNumber min={1} max={50000} value={genCount.users} onChange={v => setGenCount(p => ({ ...p, users: v || 0 }))} style={{ width: 88 }} />
          <Button size="small" type="primary" loading={loading} onClick={() => handleGenerate('users')}>生成</Button>
          <Button size="small" onClick={() => handleClear('users')}>清除</Button>
        </Space>
      ),
    },
    {
      key: 'slow',
      name: '慢接口',
      api: `/api/perf/slow?delay=${slowDelay}`,
      desc: '固定延迟返回，用来验证「响应时间」类断言和超时设置',
      control: (
        <Space size={4}>
          <InputNumber min={100} max={30000} step={100} value={slowDelay} onChange={v => setSlowDelay(v || 2000)} style={{ width: 88 }} />
          <Button size="small" onClick={handleSlow}>试一下</Button>
        </Space>
      ),
    },
    {
      key: 'fail-rate',
      name: '可配失败率',
      api: `/api/scenario/fail-rate?rate=${failRate}`,
      desc: '按概率返回 500，用来验证「错误率」类断言（/mock/random 写死 50%，这里可调）',
      control: (
        <Space size={4}>
          <InputNumber min={0} max={1} step={0.05} value={failRate} onChange={v => setFailRate(v ?? 0)} style={{ width: 88 }} />
          <Button size="small" onClick={() => runScenario('失败率', () => api.scenario.failRate(failRate))}>试一下</Button>
        </Space>
      ),
    },
    {
      key: 'payload',
      name: '响应体大小',
      api: `/api/scenario/payload?size=${payloadKb}`,
      desc: '返回指定大小的 JSON，用来区分「带宽瓶颈」和「CPU 瓶颈」',
      control: (
        <Space size={4}>
          <InputNumber min={1} max={1024} step={100} value={payloadKb} onChange={v => setPayloadKb(v ?? 1)} style={{ width: 88 }} />
          <Button size="small" onClick={() => runScenario('响应体大小', () => api.scenario.payload(payloadKb))}>试一下</Button>
        </Space>
      ),
    },
    {
      key: 'cpu',
      name: 'CPU 密集',
      api: `/api/scenario/cpu?rounds=${cpuRounds}`,
      desc: '纯计算不碰 IO。并发上去 RPS 不涨、事件循环延迟飙升，就是 CPU 打满',
      control: (
        <Space size={4}>
          <InputNumber min={1} max={5000} step={100} value={cpuRounds} onChange={v => setCpuRounds(v ?? 1)} style={{ width: 88 }} />
          <Button size="small" onClick={() => runScenario('CPU 密集', () => api.scenario.cpu(cpuRounds))}>试一下</Button>
        </Space>
      ),
    },
    {
      key: 'cache',
      name: '缓存对照（快）',
      api: '/api/scenario/cached',
      desc: '全表聚合走缓存。和下一行对比，就是「缓存到底有没有用」的量化依据',
      control: (
        <Button size="small" onClick={() => runScenario('缓存（快）', () => api.scenario.cached())}>试一下</Button>
      ),
    },
    {
      key: 'uncached',
      name: '缓存对照（慢）',
      api: `/api/scenario/uncached?rounds=${uncachedRounds}`,
      desc: '每次真算。先生成商品数据再来对比，差距才明显',
      control: (
        <Space size={4}>
          <InputNumber min={1} max={5000} step={500} value={uncachedRounds} onChange={v => setUncachedRounds(v ?? 1)} style={{ width: 88 }} />
          <Button size="small" onClick={() => runScenario('缓存（慢）', () => api.scenario.uncached(uncachedRounds))}>试一下</Button>
        </Space>
      ),
    },
    {
      key: 'stream',
      name: '流式响应（SSE）',
      api: '/api/scenario/stream?chunks=20&interval=50',
      desc: '流式接口要分开看「首字节时间」和「总时长」，统计口径和普通接口不同',
      control: (
        <Button size="small" onClick={() => window.open('/api/scenario/stream?chunks=20&interval=100', '_blank')}>打开看看</Button>
      ),
    },
    {
      key: 'redirect',
      name: '302 重定向',
      api: '/api/scenario/redirect?n=2',
      desc: '跳转链，用来验证压测脚本是否正确跟随重定向',
      control: (
        <Button size="small" onClick={() => window.open('/api/scenario/redirect?n=2', '_blank')}>打开看看</Button>
      ),
    },
    {
      key: 'rate-limited',
      name: '限流（429）',
      api: '/api/scenario/rate-limited?limit=20&window=1000',
      desc: '超过阈值返回 429 + Retry-After，验证脚本把「被限流」和「真失败」区分开',
      control: (
        <Button size="small" onClick={() => runScenario('限流', () => api.scenario.rateLimited(20, 1000))}>试一下</Button>
      ),
    },
    {
      key: 'stress',
      name: '服务端并发压测',
      api: 'POST /api/perf/stress',
      desc: '服务端打自己，统计含调度开销，数据不如 Locust 可信，仅作功能演示',
      control: (
        <Space size={4}>
          <InputNumber min={1} max={100} value={stressConcurrency} onChange={v => setStressConcurrency(v || 1)} style={{ width: 88 }} />
          <Button size="small" danger loading={loading} onClick={handleStress}>开始</Button>
        </Space>
      ),
    },
    {
      key: 'llm',
      name: '大模型接口（Mock）',
      api: llmMockEp ? `${llmMockEp.method} ${llmMockEp.path}` : 'POST /api/llm/v1/chat/completions',
      desc: 'OpenAI 兼容 Mock，零成本、可注入错误/长尾/截断，适合 CI 回归与边界演练。详情与注入入口在「大模型控制台」',
      control: (
        <Space size={4}>
          <Tag color="purple">免费</Tag>
          <Button size="small" onClick={() => navigate('/admin/llm')}>控制台</Button>
        </Space>
      ),
    },
    {
      key: 'llm-real',
      name: '大模型接口（真实）',
      api: llmRealEp ? `${llmRealEp.method} ${llmRealEp.path}` : 'POST /api/llm-real/v1/chat/completions',
      desc: '透传真实上游（默认 DeepSeek），指标与计费都是真的。默认关闭，需 ENABLE_LLM_UPSTREAM=true 且必须登录；多上游用 /api/llm-real/v1/<provider>/chat/completions',
      control: (
        <Space size={4}>
          <Tag color="blue">需鉴权</Tag>
          <Button size="small" onClick={() => navigate('/admin/llm')}>控制台</Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Typography.Title level={2} style={{ margin: 0 }}><ThunderboltOutlined /> 性能测试入口</Typography.Title>
        <Typography.Text type="secondary">本地练习环境 · 数据生成 / 慢接口 / 并发压测</Typography.Text>
      </div>

      <Card
        title={<><LineChartOutlined /> 服务端运行时指标</>}
        extra={
          <Space>
            <Button onClick={fetchMetrics}>刷新</Button>
            <Button onClick={async () => {
              await api.scenario.resetMetrics()
              fetchMetrics()
              success('已清零事件循环延迟峰值')
            }}>重置峰值</Button>
          </Space>
        }
      >
        {metrics ? (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={12} md={6}>
                <Tooltip title="事件循环被同步任务阻塞的时长。持续偏高说明有 CPU 密集的同步代码在拖慢所有请求">
                  <Card>
                    <Statistic
                      title="事件循环延迟 (ms)"
                      value={metrics.eventLoop.currentLagMs}
                      valueStyle={{ color: metrics.eventLoop.currentLagMs > 50 ? '#cf1322' : undefined }}
                    />
                  </Card>
                </Tooltip>
              </Col>
              <Col xs={12} md={6}><Card><Statistic title="延迟峰值 (ms)" value={metrics.eventLoop.peakLagMs} /></Card></Col>
              <Col xs={12} md={6}><Card><Statistic title="CPU 占用 (%)" value={metrics.cpuPercent} /></Card></Col>
              <Col xs={12} md={6}><Card><Statistic title="活跃句柄" value={metrics.handles} /></Card></Col>
            </Row>
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
              运行 {metrics.uptimeSec}s · 堆内存 {metrics.memory.heapUsedMb}MB / 常驻 {metrics.memory.rssMb}MB · 每 {metrics.eventLoop.sampleIntervalMs}ms 采样一次并自动刷新
            </Typography.Text>
          </>
        ) : (
          <Typography.Text type="secondary">加载中…</Typography.Text>
        )}
      </Card>

      <Card
        title={<><ExperimentOutlined /> 压测场景接口</>}
      >
        <Table
          size="small"
          pagination={false}
          rowKey="key"
          dataSource={scenarioRows}
          columns={[
            { title: '场景', dataIndex: 'name', width: 130 },
            {
              title: '接口',
              dataIndex: 'api',
              width: 300,
              render: (v: string) => <Typography.Text code copyable style={{ fontSize: 12 }}>{v}</Typography.Text>,
            },
            { title: '说明', dataIndex: 'desc' },
            { title: '操作', dataIndex: 'control', width: 230 },
          ]}
        />
        {scenarioMsg && (
          <Card size="small" style={{ marginTop: 12 }}>
            <Typography.Text style={{ whiteSpace: 'pre-wrap' }}>{scenarioMsg}</Typography.Text>
          </Card>
        )}
      </Card>
    </div>
  )
}
