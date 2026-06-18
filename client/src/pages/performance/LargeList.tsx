import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function LargeList() {
  const [count, setCount] = useState(100)
  const [renderKey, setRenderKey] = useState(0)

  const items = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      title: `列表项 #${i + 1}`,
      description: `这是第 ${i + 1} 条数据的描述信息，用于测试大列表渲染性能。`,
      tags: i % 3 === 0 ? ['A', 'B'] : i % 3 === 1 ? ['C'] : ['A', 'C'],
    }))
  }, [count, renderKey])

  return (
    <div>
      <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ArrowLeft size={16} className="mr-1" /> 返回首页
      </Link>

      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h1 className="text-2xl font-bold mb-1">大列表渲染</h1>
          <p className="text-sm text-gray-500">
            渲染大量 DOM 节点 —— 可用于性能基准测试、首屏时间测量、Lighthouse 分析
          </p>
        </div>

        {/* 控制栏 */}
        <div className="px-6 py-3 border-b bg-gray-50 flex items-center gap-3">
          <span className="text-sm text-gray-500">渲染数量：</span>
          {[50, 100, 500, 1000, 5000].map(n => (
            <button
              key={n}
              onClick={() => { setCount(n); setRenderKey(k => k + 1) }}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                count === n
                  ? 'bg-primary-600 text-white'
                  : 'border border-gray-300 hover:bg-gray-100'
              }`}
              data-testid={`list-count-${n}`}
            >
              {n.toLocaleString()}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">
            当前 {count.toLocaleString()} 条
          </span>
        </div>

        {/* 列表 */}
        <div className="divide-y max-h-[600px] overflow-y-auto" data-testid="large-list-container">
          {items.map(item => (
            <div
              key={item.id}
              className="px-6 py-3 hover:bg-gray-50 flex items-center gap-4"
              data-testid={`list-item-${item.id}`}
            >
              <span className="text-xs text-gray-300 w-12 text-right">{item.id}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-gray-400 truncate">{item.description}</p>
              </div>
              <div className="flex gap-1">
                {item.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
