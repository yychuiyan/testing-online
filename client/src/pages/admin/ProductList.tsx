import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, StarFilled, ShoppingCartOutlined } from '@ant-design/icons'
import { Table, Input, Select, Button, Space, Tag, Typography, Tooltip, Avatar, Card } from 'antd'
import { api } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../lib/toast'
import { useModal } from '../../lib/modal'
import type { Product, Category } from '../../lib/types'

export default function ProductList() {
  useDocumentTitle('商品管理')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const { success, error } = useToast()
  const { confirm } = useModal()

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params: Record<string, string | number> = { page, pageSize: 20 }
    if (keyword) params.keyword = keyword
    if (categoryId) params.categoryId = categoryId
    const res = await api.products.list(params)
    if (res.success && res.data) {
      setProducts(res.data.items)
      setTotal(res.data.total)
    }
    setLoading(false)
  }, [page, keyword, categoryId])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => {
    api.products.categories().then(res => { if (res.success && res.data) setCategories(res.data) })
  }, [])

  const handleAddCart = async (productId: number, name: string) => {
    const res = await api.cart.add(productId, 1)
    if (res.success) success('已加入购物车', name)
    else error(res.message || '添加失败')
  }

  const handleDelete = async (id: number, name: string) => {
    if (!isAdmin) { error('无权限', '仅管理员及以上可删除商品'); return }
    const ok = await confirm('删除商品', `确定要删除 "${name}" 吗？`)
    if (!ok) return
    const res = await api.products.remove(id)
    if (res.success) { success('商品已删除'); fetchProducts() }
    else { error(res.message || '删除失败') }
  }

  const columns = [
    {
      title: '商品', render: (_: unknown, p: Product) => (
        <Space>
          <Avatar shape="square" size={40} src={p.images[0]} />
          <div>
            <Typography.Text strong style={{ display: 'block' }}>{p.name}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.brand}</Typography.Text>
          </div>
        </Space>
      ),
    },
    { title: '分类', dataIndex: 'category', render: (c: string) => <Typography.Text type="secondary">{c}</Typography.Text> },
    {
      title: '价格', render: (_: unknown, p: Product) => (
        <Space>
          <Typography.Text type="danger" strong>¥{p.price}</Typography.Text>
          {p.originalPrice > p.price && <Typography.Text delete type="secondary" style={{ fontSize: 12 }}>¥{p.originalPrice}</Typography.Text>}
        </Space>
      ),
    },
    { title: '库存', dataIndex: 'stock' },
    { title: '销量', dataIndex: 'sales' },
    { title: '评分', render: (_: unknown, p: Product) => <span style={{ color: '#faad14' }}><StarFilled /> {p.rating}</span> },
    { title: '状态', render: (_: unknown, p: Product) => <Tag color={p.status === 'on' ? 'green' : 'default'}>{p.status === 'on' ? '上架' : '下架'}</Tag> },
    {
      title: '操作', width: 150, render: (_: unknown, p: Product) => (
        <Space>
          <Tooltip title="加入购物车"><Button size="small" type="text" icon={<ShoppingCartOutlined />} onClick={() => handleAddCart(p.id, p.name)} /></Tooltip>
          {isAdmin && <Link to={`/admin/products/${p.id}`}><Button size="small" type="text" icon={<EditOutlined />} /></Link>}
          {isAdmin && <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(p.id, p.name)} />}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>📦 商品管理</Typography.Title>
          <Typography.Text type="secondary">管理平台商品信息</Typography.Text>
        </div>
        {isAdmin && (
          <Link to="/admin/products/new"><Button type="primary" icon={<PlusOutlined />}>新增商品</Button></Link>
        )}
      </div>

      <Card size="small">
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索商品名..."
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(1) }}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            value={categoryId}
            onChange={v => { setCategoryId(v); setPage(1) }}
            placeholder="全部分类"
            style={{ width: 160 }}
            allowClear
            options={categories.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
          />
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          dataSource={products}
          columns={columns}
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
            showTotal: (t) => `共 ${t} 条`,
          }}
          locale={{ emptyText: '暂无商品数据' }}
        />
      </Card>
    </div>
  )
}
