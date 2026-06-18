import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// 递归生成嵌套 DOM 树
function NestedBlock({ depth, maxDepth, branching }: {
  depth: number
  maxDepth: number
  branching: number
}) {
  if (depth >= maxDepth) return null

  return (
    <div
      className="ml-4 pl-3 border-l-2 border-gray-200"
      data-testid={`nest-depth-${depth}`}
    >
      <span className="text-xs text-gray-400">L{depth}</span>
      {Array.from({ length: branching }, (_, i) => (
        <NestedBlock
          key={i}
          depth={depth + 1}
          maxDepth={maxDepth}
          branching={branching}
        />
      ))}
    </div>
  )
}

export default function DomComplexity() {
  const [depth, setDepth] = useState(3)
  const [branching, setBranching] = useState(3)

  const estimatedNodes = useMemo(() => {
    // 粗略估算 DOM 节点数
    let total = 0
    for (let d = 0; d <= depth; d++) {
      total += Math.pow(branching, d)
    }
    return total
  }, [depth, branching])

  return (
    <div>
      <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ArrowLeft size={16} className="mr-1" /> 返回首页
      </Link>

      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h1 className="text-2xl font-bold mb-1">DOM 复杂度</h1>
          <p className="text-sm text-gray-500">
            生成深度嵌套的 DOM 树 —— 测试复杂 DOM 下的选择器性能、遍历效率和渲染性能
          </p>
        </div>

        {/* 控制栏 */}
        <div className="px-6 py-3 border-b bg-gray-50 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-20">嵌套深度：</span>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => setDepth(n)}
                className={`w-10 h-8 text-sm rounded-md transition-colors ${
                  depth === n
                    ? 'bg-primary-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-100'
                }`}
                data-testid={`depth-${n}`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-20">分支数：</span>
            {[2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setBranching(n)}
                className={`w-10 h-8 text-sm rounded-md transition-colors ${
                  branching === n
                    ? 'bg-primary-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-100'
                }`}
                data-testid={`branching-${n}`}
              >
                {n}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            预估 DOM 节点数：<span className="font-mono font-medium text-gray-600">{estimatedNodes.toLocaleString()}</span> 个
          </p>
        </div>

        {/* DOM 树 */}
        <div className="p-6 overflow-auto max-h-[600px]" data-testid="dom-tree-container">
          <NestedBlock depth={0} maxDepth={depth} branching={branching} />
        </div>
      </div>

      {/* 页面元素统计 */}
      <div className="mt-6 bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">📊 页面复杂度指标</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-700">{estimatedNodes.toLocaleString()}</p>
            <p className="text-xs text-gray-400">DOM 节点数（约）</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-700">{depth}</p>
            <p className="text-xs text-gray-400">最大嵌套深度</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-700">{branching}</p>
            <p className="text-xs text-gray-400">每层分支数</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-700">
              {depth > 4 || branching > 3 ? '⚠️ 高' : '✅ 低'}
            </p>
            <p className="text-xs text-gray-400">复杂度等级</p>
          </div>
        </div>
      </div>
    </div>
  )
}
