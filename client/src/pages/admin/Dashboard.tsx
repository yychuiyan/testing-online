import { useState, useEffect } from 'react'
import { UserOutlined, AppstoreOutlined, ShoppingOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { Tabs, Card, Statistic, Row, Col, Table, Tag, Typography, Button, Space } from 'antd'
import { api } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useAuth } from '../../lib/auth'
import type { DashboardStats } from '../../lib/types'

interface ApiEndpoint {
  method: string
  path: string
  desc: string
  params?: string
  body?: string
}

const API_ENDPOINTS: ApiEndpoint[] = [
  { method: 'POST', path: '/api/auth/login', desc: '用户登录，返回 Bearer Token', body: '{ username, password }' },
  { method: 'POST', path: '/api/auth/register', desc: '注册新账号（默认禁用）', body: '{ username, email, password, phone?, role? }' },
  { method: 'POST', path: '/api/auth/logout', desc: '用户登出（需 Authorization）' },
  { method: 'GET', path: '/api/auth/me', desc: '获取当前用户信息（需 Authorization）' },
  { method: 'GET', path: '/api/users', desc: '用户列表', params: '?page=1&pageSize=5&keyword=&role=' },
  { method: 'GET', path: '/api/users/:id', desc: '用户详情' },
  { method: 'POST', path: '/api/users', desc: '新增用户', body: '{ username, email, password, role? }' },
  { method: 'PUT', path: '/api/users/:id', desc: '编辑用户', body: '{ username?, email?, status?, password? }' },
  { method: 'DELETE', path: '/api/users/:id', desc: '删除用户（仅超管）' },
  { method: 'PUT', path: '/api/users/:id/role', desc: '修改角色（仅超管）', body: '{ role }' },
  { method: 'GET', path: '/api/products', desc: '商品列表', params: '?page=1&pageSize=6&keyword=&categoryId=&sortBy=price' },
  { method: 'GET', path: '/api/products/categories', desc: '商品分类列表' },
  { method: 'GET', path: '/api/products/:id', desc: '商品详情' },
  { method: 'POST', path: '/api/products', desc: '新增商品', body: '{ name, price, description?, brand?, stock?, ... }' },
  { method: 'PUT', path: '/api/products/:id', desc: '编辑商品', body: '{ name?, price?, status?, ... }' },
  { method: 'DELETE', path: '/api/products/:id', desc: '删除商品' },
  { method: 'POST', path: '/api/upload', desc: '上传图片', body: 'FormData { file }' },
  { method: 'GET', path: '/api/cart', desc: '获取购物车' },
  { method: 'POST', path: '/api/cart', desc: '加入购物车', body: '{ productId, quantity? }' },
  { method: 'PUT', path: '/api/cart/:id', desc: '修改数量', body: '{ quantity }' },
  { method: 'DELETE', path: '/api/cart/:id', desc: '移除购物车项' },
  { method: 'GET', path: '/api/orders', desc: '订单列表', params: '?page=1&pageSize=5&keyword=&status=' },
  { method: 'GET', path: '/api/orders/:id', desc: '订单详情' },
  { method: 'PUT', path: '/api/orders/:id/status', desc: '修改订单状态', body: '{ status }' },
  { method: 'GET', path: '/api/dashboard/stats', desc: '仪表盘统计数据' },
  { method: 'GET', path: '/api/dashboard/trends', desc: '近 N 天趋势', params: '?days=7' },
  { method: 'GET', path: '/api/logs', desc: '操作日志列表', params: '?page=1&pageSize=5&username=&action=' },
  { method: 'GET', path: '/api/perf/stats', desc: '服务器资源统计' },
  { method: 'POST', path: '/api/perf/generate', desc: '批量生成测试数据', body: '{ type, count }' },
  { method: 'POST', path: '/api/perf/clear', desc: '清除生成的数据', body: '{ type }' },
  { method: 'GET', path: '/api/mock/timeout', desc: '模拟超时', params: '?delay=3000' },
  { method: 'GET', path: '/api/mock/status/:code', desc: '返回指定状态码' },
  { method: 'GET', path: '/api/mock/random', desc: '随机成功/失败' },
  { method: 'POST', path: '/api/mock/echo', desc: '回显请求信息', body: '{ ... }' },
  { method: 'GET', path: '/api/mock/download', desc: '模拟文件下载' },
  { method: 'GET', path: '/api/perf/slow', desc: '慢接口测试', params: '?delay=2000' },
  { method: 'POST', path: '/api/perf/stress', desc: '并发压测', body: '{ concurrency }' },
]

const methodColor = (m: string) => {
  switch (m) {
    case 'GET': return 'success'
    case 'POST': return 'processing'
    case 'PUT': return 'warning'
    case 'DELETE': return 'error'
    default: return 'default'
  }
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

  const apiColumns = [
    { title: '方法', dataIndex: 'method', width: 80, render: (m: string) => <Tag color={methodColor(m)}>{m}</Tag> },
    { title: '路径', dataIndex: 'path', render: (p: string) => <Typography.Text code style={{ fontSize: 12 }}>{p}</Typography.Text> },
    { title: '参数', width: 220, render: (_: unknown, ep: ApiEndpoint) => {
      if (ep.params) return <Typography.Text style={{ color: '#d48806', fontSize: 12 }}>{ep.params}</Typography.Text>
      if (ep.body) return <Typography.Text style={{ color: '#722ed1', fontSize: 12 }}>{ep.body}</Typography.Text>
      return <Typography.Text type="secondary">—</Typography.Text>
    }},
    { title: '说明', dataIndex: 'desc' },
  ]

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

  const apiContent = (
    <Card title={`可用 API 接口（${API_ENDPOINTS.length} 个）`} extra={
      <Space size="middle">
        <Typography.Text style={{ fontSize: 12, color: '#d48806' }}>橙色 = Query 参数</Typography.Text>
        <Typography.Text style={{ fontSize: 12, color: '#722ed1' }}>紫色 = Body 参数</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>灰色 — = 无参数</Typography.Text>
      </Space>
    }>
      <Table
        dataSource={API_ENDPOINTS}
        rowKey={(ep) => ep.path + ep.method}
        columns={apiColumns}
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
          { key: 'api', label: '接口列表', children: apiContent },
        ]}
      />
    </div>
  )
}
