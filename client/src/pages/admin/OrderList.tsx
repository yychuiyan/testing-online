import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { SearchOutlined, EyeOutlined } from '@ant-design/icons'
import { Table, Input, Select, Button, Tag, Typography, Segmented, Card, Space } from 'antd'
import { api } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../lib/toast'
import { ORDER_STATUS_MAP, type Order, type OrderStatus } from '../../lib/types'

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'pending_payment', label: '待付款' },
  { key: 'pending_shipment', label: '待发货' },
  { key: 'shipped', label: '已发货' },
  { key: 'delivered', label: '已签收' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
]

const statusColor = (s: OrderStatus) => {
  switch (s) {
    case 'pending_payment': return 'orange'
    case 'pending_shipment': return 'blue'
    case 'shipped': return 'purple'
    case 'delivered': return 'green'
    case 'completed': return 'default'
    case 'cancelled': return 'red'
    default: return 'default'
  }
}

export default function OrderList() {
  useDocumentTitle('订单管理')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const { success, error } = useToast()

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params: Record<string, string | number> = { page, pageSize: 5 }
    if (keyword) params.keyword = keyword
    if (statusFilter) params.status = statusFilter
    const res = await api.orders.list(params)
    if (res.success && res.data) {
      setOrders(res.data.items)
      setTotal(res.data.total)
    }
    setLoading(false)
  }, [page, keyword, statusFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleStatusChange = async (id: number, newStatus: string, orderNo: string) => {
    if (!isAdmin) { error('无权限', '仅管理员及以上可修改订单状态'); return }
    const res = await api.orders.updateStatus(id, newStatus)
    if (res.success) { success(`订单 ${orderNo} 状态已更新`); fetchOrders() }
    else { error(res.message || '更新失败') }
  }

  const columns = [
    { title: '订单号', dataIndex: 'orderNo', render: (no: string) => <Typography.Text code style={{ fontSize: 12 }}>{no}</Typography.Text> },
    { title: '用户', dataIndex: 'username' },
    { title: '金额', render: (_: unknown, o: Order) => <Typography.Text strong>¥{o.actualAmount.toFixed(2)}</Typography.Text> },
    {
      title: '状态', render: (_: unknown, o: Order) => {
        if (isAdmin) {
          return (
            <Select
              key={o.id}
              size="small"
              defaultValue={o.status}
              onChange={v => handleStatusChange(o.id, v as string, o.orderNo)}
              style={{ width: 90 }}
              options={Object.entries(ORDER_STATUS_MAP).map(([k, v]) => ({ value: k, label: v }))}
            />
          )
        }
        return <Tag color={statusColor(o.status as OrderStatus)}>{ORDER_STATUS_MAP[o.status as OrderStatus]}</Tag>
      },
    },
    { title: '时间', dataIndex: 'createdAt', render: (d: string) => new Date(d).toLocaleDateString('zh-CN') },
    {
      title: '操作', render: (_: unknown, o: Order) => (
        <Link to={`/admin/orders/${o.id}`}><Button size="small" type="text" icon={<EyeOutlined />} /></Link>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Typography.Title level={2} style={{ margin: 0 }}>📋 订单管理</Typography.Title>
        <Typography.Text type="secondary">查看和管理所有订单</Typography.Text>
      </div>

      <Card size="small">
        <Segmented
          options={STATUS_TABS.map(t => ({ value: t.key, label: t.label }))}
          value={statusFilter}
          onChange={v => { setStatusFilter(v as string); setPage(1) }}
        />
      </Card>

      <Space>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索订单号或用户名..."
          value={keyword}
          onChange={e => { setKeyword(e.target.value); setPage(1) }}
          style={{ width: 280 }}
          allowClear
        />
      </Space>

      <Card>
        <Table
          rowKey="id"
          dataSource={orders}
          columns={columns}
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 5,
            onChange: setPage,
            showTotal: (t) => `共 ${t} 条`,
          }}
          locale={{ emptyText: '暂无订单数据' }}
        />
      </Card>
    </div>
  )
}
