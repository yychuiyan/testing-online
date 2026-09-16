import { useState } from 'react'
import { ThunderboltOutlined, DeleteOutlined, ClockCircleOutlined, CloudServerOutlined, DashboardOutlined } from '@ant-design/icons'
import { Card, Button, InputNumber, Typography, Row, Col, Statistic, Space, Divider } from 'antd'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useToast } from '../../lib/toast'
import { useModal } from '../../lib/modal'
import { api } from '../../lib/api'

interface Stats {
  users: number
  products: number
  memory: { rss: number; heapUsed: number; heapTotal: number }
}

export default function PerfTest() {
  useDocumentTitle('性能测试')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [slowDelay, setSlowDelay] = useState(2000)
  const [slowResult, setSlowResult] = useState('')
  const [genCount, setGenCount] = useState({ products: 100, users: 50 })
  const [stressConcurrency, setStressConcurrency] = useState(10)
  const [stressResult, setStressResult] = useState<any>(null)
  const { success, error } = useToast()
  const { confirm } = useModal()

  const fetchStats = async () => {
    const res = await api.perf.stats()
    if (res.success && res.data) setStats(res.data)
    else error('获取失败', res.message)
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
    setSlowResult('请求中...')
    const t0 = performance.now()
    const res = await api.perf.slow(slowDelay)
    const elapsed = Math.round(performance.now() - t0)
    setSlowResult(res.success ? `响应 ${elapsed}ms（设定延迟 ${slowDelay}ms）` : `失败: ${res.message}`)
  }

  const handleStress = async () => {
    setStressResult(null)
    setLoading(true)
    const t0 = performance.now()
    const res = await api.perf.stress(stressConcurrency)
    const total = Math.round(performance.now() - t0)
    setStressResult(res.success && res.data ? { ...res.data, clientTotal: total } : { error: res.message })
    setLoading(false)
    if (res.success) fetchStats()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Typography.Title level={2} style={{ margin: 0 }}><ThunderboltOutlined /> 性能测试</Typography.Title>
        <Typography.Text type="secondary">本地练习环境 · 生成大数据量 / 慢接口 / 并发压测</Typography.Text>
      </div>

      <Card title={<><CloudServerOutlined /> 服务器状态</>} extra={
        <Space>
          <Button type="primary" onClick={fetchStats}>刷新状态</Button>
          <Button danger icon={<DeleteOutlined />} onClick={async () => {
            const ok = await confirm('确认清除', '将清除所有生成的商品和用户数据（保留原始数据）')
            if (!ok) return
            const res1 = await api.perf.clear('products')
            const res2 = await api.perf.clear('users')
            if (res1.success || res2.success) { success('已清除'); fetchStats() }
            else error(res1.message || res2.message)
          }}>清除全部</Button>
        </Space>
      }>
        {stats && (
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}><Card><Statistic title="用户数" value={stats.users} valueStyle={{ color: '#1677ff' }} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="商品数" value={stats.products} valueStyle={{ color: '#52c41a' }} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="堆内存 (MB)" value={stats.memory.heapUsed} valueStyle={{ color: '#722ed1' }} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="常驻内存 (MB)" value={stats.memory.rss} /></Card></Col>
          </Row>
        )}
      </Card>

      <Card title="📦 批量生成测试数据">
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card size="small" title="商品数据">
              <Space>
                <InputNumber min={1} max={50000} value={genCount.products} onChange={v => setGenCount(p => ({ ...p, products: v || 0 }))} />
                <Typography.Text type="secondary">条</Typography.Text>
              </Space>
              <Divider />
              <Space>
                <Button type="primary" loading={loading} onClick={() => handleGenerate('products')}>生成</Button>
                <Button onClick={() => handleClear('products')}>清除</Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="用户数据">
              <Space>
                <InputNumber min={1} max={50000} value={genCount.users} onChange={v => setGenCount(p => ({ ...p, users: v || 0 }))} />
                <Typography.Text type="secondary">条</Typography.Text>
              </Space>
              <Divider />
              <Space>
                <Button type="primary" loading={loading} onClick={() => handleGenerate('users')}>生成</Button>
                <Button onClick={() => handleClear('users')}>清除</Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card title={<><ClockCircleOutlined /> 慢接口测试</>}>
        <Space>
          <Typography.Text type="secondary">延迟</Typography.Text>
          <InputNumber min={100} max={30000} step={100} value={slowDelay} onChange={v => setSlowDelay(v || 2000)} />
          <Typography.Text type="secondary">ms（最大 30000）</Typography.Text>
          <Button type="primary" onClick={handleSlow}>发起请求</Button>
        </Space>
        {slowResult && <Card size="small" style={{ marginTop: 12 }}><Typography.Text>{slowResult}</Typography.Text></Card>}
      </Card>

      <Card title={<><DashboardOutlined /> 并发压测</>}>
        <Space>
          <Typography.Text type="secondary">并发数</Typography.Text>
          <InputNumber min={1} max={100} value={stressConcurrency} onChange={v => setStressConcurrency(v || 1)} />
          <Typography.Text type="secondary">（最大 100）</Typography.Text>
          <Button type="primary" danger loading={loading} onClick={handleStress}>开始压测</Button>
        </Space>
        {stressResult && !stressResult.error && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={6}><Card><Statistic title="并发数" value={stressResult.concurrency} /></Card></Col>
            <Col span={6}><Card><Statistic title="客户端总耗时" value={`${stressResult.clientTotal}ms`} /></Card></Col>
            <Col span={6}><Card><Statistic title="平均响应" value={stressResult.avgResponseTime} /></Card></Col>
            <Col span={6}><Card><Statistic title="最大响应" value={stressResult.maxResponseTime} /></Card></Col>
          </Row>
        )}
        {stressResult?.error && <Typography.Text type="danger" style={{ display: 'block', marginTop: 12 }}>{stressResult.error}</Typography.Text>}
      </Card>
    </div>
  )
}
