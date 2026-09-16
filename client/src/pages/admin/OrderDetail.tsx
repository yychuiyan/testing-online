import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeftOutlined, AppstoreOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { Steps, Card, Descriptions, List, Avatar, Typography, Row, Col, Skeleton } from 'antd'
import { api } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { ORDER_STATUS_MAP, type Order, type OrderStatus } from '../../lib/types'

const STATUS_STEPS: OrderStatus[] = ['pending_payment', 'pending_shipment', 'shipped', 'delivered', 'completed']

const paymentLabels: Record<string, string> = { wechat: '微信支付', alipay: '支付宝', card: '银行卡' }

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useDocumentTitle(order ? `订单 ${order.orderNo}` : '订单详情')

  useEffect(() => {
    if (!id) return
    api.orders.detail(parseInt(id)).then(res => {
      if (res.success && res.data) setOrder(res.data)
      setLoading(false)
    })
  }, [id])

  if (loading) return <Skeleton active paragraph={{ rows: 6 }} />
  if (!order) return <div style={{ textAlign: 'center', padding: 48, color: '#8c8c8c' }}>订单不存在</div>

  const currentStep = STATUS_STEPS.indexOf(order.status as OrderStatus)

  return (
    <div style={{ maxWidth: 960 }}>
      <Link to="/admin/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16, color: '#8c8c8c', fontSize: 13 }}>
        <ArrowLeftOutlined /> 返回订单列表
      </Link>

      <Typography.Title level={2} style={{ marginBottom: 24 }}>📋 订单详情 — {order.orderNo}</Typography.Title>

      {/* 进度条 */}
      <Card style={{ marginBottom: 24 }}>
        <Steps
          current={order.status === 'cancelled' ? -1 : currentStep}
          status={order.status === 'cancelled' ? 'error' : 'process'}
          items={STATUS_STEPS.map((step) => ({
            title: ORDER_STATUS_MAP[step],
          }))}
        />
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
          <Card title={<><AppstoreOutlined /> 商品清单</>} style={{ marginBottom: 24 }}>
            <List
              dataSource={order.items}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar shape="square" size={56} src={item.productImage} />}
                    title={item.productName}
                    description={`¥${item.price} × ${item.quantity}`}
                  />
                  <Typography.Text strong>¥{(item.price * item.quantity).toFixed(2)}</Typography.Text>
                </List.Item>
              )}
            />
          </Card>

          <Card title={<><EnvironmentOutlined /> 收货地址</>}>
            <Typography.Text>{order.address}</Typography.Text>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="订单信息" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="订单号">{order.orderNo}</Descriptions.Item>
              <Descriptions.Item label="用户">{order.username}</Descriptions.Item>
              <Descriptions.Item label="状态">{ORDER_STATUS_MAP[order.status as OrderStatus]}</Descriptions.Item>
              <Descriptions.Item label="支付方式">{paymentLabels[order.paymentMethod] || order.paymentMethod}</Descriptions.Item>
              <Descriptions.Item label="时间">{new Date(order.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="金额明细">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="商品总额">¥{order.totalAmount.toFixed(2)}</Descriptions.Item>
            </Descriptions>
            <Typography.Title level={3} type="danger" style={{ margin: '16px 0 0' }}>
              实付 ¥{order.actualAmount.toFixed(2)}
            </Typography.Title>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
