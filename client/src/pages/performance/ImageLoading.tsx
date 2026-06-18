import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Image as ImageIcon } from 'lucide-react'

export default function ImageLoading() {
  const [count, setCount] = useState(20)
  const [showImages, setShowImages] = useState(true)

  // 使用不同大小的图片地址 (测试不同加载时间)
  const imageSizes = [
    { width: 400, height: 300, label: '400×300' },
    { width: 800, height: 600, label: '800×600' },
    { width: 1200, height: 900, label: '1200×900' },
    { width: 1600, height: 1200, label: '1600×1200' },
  ]

  const images = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    src: `/api/perf/image/400/300?t=${i}`,  // 添加时间戳避免缓存
    alt: `性能测试图片 ${i + 1}`,
  }))

  // 直接使用静态占位图测试大量 <img> 加载
  const directImages = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    src: `https://placehold.co/400x300/e2e8f0/94a3b8?text=Image+${i + 1}`,
    alt: `占位图 ${i + 1}`,
  }))

  return (
    <div>
      <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ArrowLeft size={16} className="mr-1" /> 返回首页
      </Link>

      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h1 className="text-2xl font-bold mb-1">图片加载性能</h1>
          <p className="text-sm text-gray-500">
            加载大量图片资源 —— 用于测试资源瀑布流、图片加载时间、LCP 等性能指标
          </p>
        </div>

        {/* 控制栏 */}
        <div className="px-6 py-3 border-b bg-gray-50 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">图片数量：</span>
            {[10, 20, 50, 100].map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  count === n
                    ? 'bg-primary-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-100'
                }`}
                data-testid={`img-count-${n}`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">图片尺寸：</span>
            {imageSizes.map(size => (
              <button
                key={size.label}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                {size.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImages(!showImages)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              data-testid="toggle-images-btn"
            >
              {showImages ? '隐藏图片' : '显示图片'}
            </button>
            <span className="text-xs text-gray-400">
              {showImages ? `正在显示 ${count} 张图片` : '图片已隐藏'}
            </span>
          </div>
        </div>

        {/* 图片网格 */}
        {showImages && (
          <div
            className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
            data-testid="image-grid"
          >
            {directImages.map(img => (
              <div key={img.id} className="border rounded-lg overflow-hidden bg-gray-50">
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-48 object-cover"
                  data-testid={`perf-image-${img.id}`}
                  onError={(e) => {
                    // 如果外部图片加载失败，显示占位符
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <div className="px-3 py-2">
                  <p className="text-xs text-gray-500 truncate">{img.alt}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 使用本机接口的图片区域 */}
        <div className="px-6 py-4 border-t">
          <h2 className="font-medium text-sm text-gray-500 mb-3">
            📡 本地 API 图片接口（/api/perf/image/:w/:h）
          </h2>
          <div className="flex gap-3 flex-wrap">
            {imageSizes.map(size => (
              <div key={size.label} className="border rounded-lg overflow-hidden">
                <img
                  src={`/api/perf/image/${size.width}/${size.height}`}
                  alt={`${size.width}×${size.height}`}
                  className="block"
                  data-testid={`api-image-${size.label}`}
                />
                <div className="px-2 py-1 text-xs text-gray-400 text-center">
                  {size.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
