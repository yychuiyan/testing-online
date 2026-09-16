import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MinusOutlined, PlusOutlined, DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { List, Avatar, Button, InputNumber, Typography, Card, Empty, Space, Skeleton } from 'antd'
import { api } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useModal } from '../../lib/modal'
import { useToast } from '../../lib/toast'

export default function Cart() {
  useDocumentTitle('购物车')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { confirm } = useModal()
  const { success } = useToast()

  const fetchCart = useCallback(async () => {
    const res = await api.cart.list()
    if (res.success && res.data) setItems(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCart() }, [fetchCart])

  const handleQuantity = async (id: number, qty: number) => {
    if (qty < 1) return
    await api.cart.update(id, qty)
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
  }

  const handleRemove = async (id: number, name: string) => {
    const ok = await confirm('移除商品', `确定将 "${name}" 移出购物车？`)
    if (!ok) return
    await api.cart.remove(id)
    setItems(prev => prev.filter(i => i.id !== id))
    success('已移除')
  }

  const total = items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0)

  if (loading) return <Skeleton active paragraph={{ rows: 4 }} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={2}>🛒 购物车</Typography.Title>

      {items.length === 0 ? (
        <Card>
          <Empty
            image={<ShoppingCartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
            description="购物车为空"
          >
            <Link to="/admin/products"><Button type="link">去商品管理</Button></Link>
          </Empty>
        </Card>
      ) : (
        <>
          <Card>
            <List
              dataSource={items}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Space key="qty">
                      <Button size="small" icon={<MinusOutlined />} disabled={item.quantity <= 1} onClick={() => handleQuantity(item.id, item.quantity - 1)} />
                      <InputNumber size="small" value={item.quantity} min={1} onChange={v => handleQuantity(item.id, v || 1)} style={{ width: 60 }} />
                      <Button size="small" icon={<PlusOutlined />} onClick={() => handleQuantity(item.id, item.quantity + 1)} />
                    </Space>,
                    <Typography.Text strong type="danger" key="total">¥{(item.product?.price * item.quantity).toFixed(2)}</Typography.Text>,
                    <Button key="del" type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemove(item.id, item.product?.name)} />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar shape="square" size={56} src={item.product?.images?.[0]} />}
                    title={item.product?.name}
                    description={`¥${item.product?.price}`}
                  />
                </List.Item>
              )}
            />
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography.Text type="secondary">共 {items.length} 件</Typography.Text>
              <Space>
                <Typography.Text type="secondary">合计：</Typography.Text>
                <Typography.Title level={3} type="danger" style={{ margin: 0 }}>¥{total.toFixed(2)}</Typography.Title>
              </Space>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
