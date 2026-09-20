import { useState, useEffect } from 'react'
import { UserOutlined, AppstoreOutlined, ShoppingOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { Tabs, Card, Statistic, Row, Col, Table, Tag, Typography, Button, Space } from 'antd'
import { api } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useAuth } from '../../lib/auth'
import { FUNCTION_ENDPOINTS, PERF_ENDPOINTS, type ApiEndpoint } from '../../lib/endpoints'
import type { DashboardStats } from '../../lib/types'

const methodColor = (m: string) => {
  switch (m) {
    case 'GET': return 'success'
    case 'POST': return 'processing'
    case 'PUT': return 'warning'
    case 'DELETE': return 'error'
    default: return 'default'
  }
}

/**
 * 把相邻同组行的「分组」列合并成一个单元格。
 * 依赖 dataSource 保持数组原顺序，所以 endpoints 里同组的要写在一起。
 */
function mergeGroup(list: ApiEndpoint[]) {
  return (record: ApiEndpoint) => {
    const firstIdx = list.findIndex(e => e.group === record.group)
    if (firstIdx === -1 || list[firstIdx] !== record) return { rowSpan: 0 }
    return { rowSpan: list.filter(e => e.group === record.group).length }
  }
}

/** 接口表格的列定义（功能列表与性能列表共用） */
function endpointColumns(list: ApiEndpoint[]) {
  return [
    {
      title: '分组', dataIndex: 'group', width: 96, onCell: mergeGroup(list),
      render: (g: string) => <Typography.Text strong style={{ fontSize: 12 }}>{g}</Typography.Text>,
    },
    { title: '方法', dataIndex: 'method', width: 68, render: (m: string) => <Tag color={methodColor(m)}>{m}</Tag> },
    { title: '路径', dataIndex: 'path', width: 260, render: (p: string) => <Typography.Text code style={{ fontSize: 12 }}>{p}</Typography.Text> },
    {
      title: '参数', width: 250, render: (_: unknown, ep: ApiEndpoint) => {
        if (ep.params) return <Typography.Text style={{ color: '#d48806', fontSize: 12 }}>{ep.params}</Typography.Text>
        if (ep.body) return <Typography.Text style={{ color: '#722ed1', fontSize: 12 }}>{ep.body}</Typography.Text>
        return <Typography.Text type="secondary">—</Typography.Text>
      },
    },
    {
      title: '鉴权', dataIndex: 'auth', width: 76,
      render: (a: string) => (a === 'required'
        ? <Tag color="gold">需要</Tag>
        : <Tag>免鉴权</Tag>),
    },
    { title: '说明', dataIndex: 'desc' },
  ]
}

export default function Dashboard() {
  useDocumentTitle('仪表盘')
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    api.dashboard.stats().then(res => { if (res.success && res.data) setStats(res.data) })
  }, [])

  const statCards = stats ? [
    { label: '用户总数', value: stats.totalUsers, icon: <UserOutlined />, color: '#1677ff' },
    { label: '商品总数', value: stats.totalProducts, icon: <AppstoreOutlined />, color: '#52c41a' },
    { label: '订单总数', value: stats.totalOrders, icon: <ShoppingOutlined />, color: '#722ed1' },
    { label: '购物车数量', value: stats.cartCount, icon: <ShoppingCartOutlined />, color: '#fa8c16' },
  ] : []

  const apiColumns = endpointColumns(FUNCTION_ENDPOINTS)

  const overviewContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        {statCards.map(card => (
          <Col xs={12} lg={6} key={card.label}>
            <Card hoverable>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Statistic title={card.label} value={card.value} />
                <div style={{ width: 48, height: 48, backgroundColor: card.color, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22 }}>
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ background: '#f0f5ff', border: '1px solid #adc6ff', textAlign: 'center' }}>
        <Typography.Text strong style={{ color: '#2563eb' }}>📚 更多测试知识</Typography.Text>
        <br />
        <Typography.Text style={{ color: '#2563eb', fontSize: 13 }}>查看完整的测试教程文档，涵盖 Playwright、Selenium、JMeter 等工具实战</Typography.Text>
        <br />
        <Button type="primary" href="https://docs.yychuiyan.com/" target="_blank" style={{ marginTop: 12 }}>前往文档站 →</Button>
      </Card>
    </div>
  )

  const paramLegend = (
    <Space size="middle">
      <Typography.Text style={{ fontSize: 12, color: '#d48806' }}>橙色 = Query 参数</Typography.Text>
      <Typography.Text style={{ fontSize: 12, color: '#722ed1' }}>紫色 = Body 参数</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>灰色 — = 无参数</Typography.Text>
    </Space>
  )

  /** 功能接口：业务能力本身，也是压测时要打的「真实负载」 */
  const functionContent = (
    <Card title={`功能接口（${FUNCTION_ENDPOINTS.length} 个）`} extra={paramLegend}>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: -8 }}>
        业务能力接口。做性能测试时，压的就是这些接口——它们才是要称的「货」。
      </Typography.Paragraph>
      <Table
        dataSource={FUNCTION_ENDPOINTS}
        rowKey={(ep) => ep.group + ep.method + ep.path}
        columns={apiColumns}
        pagination={false}
        size="small"
      />
    </Card>
  )

  /** 性能接口：压测目标清单——业务功能接口 + 大模型接口，按压测视角组织 */
  const perfContent = (
    <Card title={`性能接口列表（${PERF_ENDPOINTS.length} 个）`} extra={paramLegend}>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: -8 }}>
        这里是压测要打的<b>实际目标</b>，按压测视角从业务接口中挑出值得压的，每组只留代表性接口，并标注关注点与常见陷阱。
        它<b>不是</b>功能接口全量：低频后台管理类写操作（改/删商品、改/删用户、改角色）与全部 DELETE 未收录；
        性能特征重合的只留一条代表（如列表只留「有缓存」的商品列表与「无缓存」的日志列表作对照，详情只留商品详情）；
        极轻量的（分类列表、模型列表）也不列入。要看完整清单请切到「功能接口列表」。
        <br />
        压测不只看吞吐：<Typography.Text code style={{ fontSize: 12 }}>POST /api/orders</Typography.Text>{' '}
        还支持<b>并发正确性</b>验证——默认并发安全，把环境变量{' '}
        <Typography.Text code style={{ fontSize: 12 }}>ORDER_RACE_WINDOW_MS</Typography.Text>{' '}
        设为大于 0，会在「校验库存」与「扣减库存」之间插入 await，人为制造 TOCTOU 窗口，
        用并发下单复现<b>超卖</b>（实测：库存 5、20 并发全部成功，库存被扣成 −15）。
        <br />
        合成类辅助接口（
        <Typography.Text code style={{ fontSize: 12 }}>/api/scenario/*</Typography.Text>、
        <Typography.Text code style={{ fontSize: 12 }}>/api/mock/*</Typography.Text>、
        数据生成与清数、延迟注入）不是业务接口，入口在侧边栏的「性能测试入口」页面。
      </Typography.Paragraph>
      <Table
        dataSource={PERF_ENDPOINTS}
        rowKey={(ep) => ep.group + ep.method + ep.path}
        columns={endpointColumns(PERF_ENDPOINTS)}
        pagination={false}
        size="small"
      />
    </Card>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Typography.Title level={2} style={{ margin: 0 }}>👋 欢迎回来，{user?.username}</Typography.Title>
        <Typography.Text type="secondary">炊烟小站测试平台</Typography.Text>
      </div>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'overview', label: '概览', children: overviewContent },
          { key: 'function', label: '功能接口列表', children: functionContent },
          { key: 'performance', label: '性能接口列表', children: perfContent },
        ]}
      />
    </div>
  )
}
