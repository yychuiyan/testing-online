import { Skeleton, Card } from 'antd'

/** 商品卡片骨架 */
export function ProductCardSkeleton() {
  return (
    <Card>
      <Skeleton.Image active style={{ width: '100%', aspectRatio: '1' }} />
      <Skeleton active paragraph={{ rows: 2 }} />
    </Card>
  )
}

/** 商品列表骨架（N 个卡片） */
export function ProductListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** 页面加载骨架 */
export function PageSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <Skeleton active paragraph={{ rows: 1 }} style={{ width: '25%', marginBottom: 16 }} />
      <Skeleton active paragraph={{ rows: 1 }} style={{ width: '50%', marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <Skeleton.Image active style={{ width: '100%' }} />
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Skeleton
