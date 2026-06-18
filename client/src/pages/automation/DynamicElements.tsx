import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function DynamicElements() {
  const [delayedVisible, setDelayedVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadedContent, setLoadedContent] = useState('')
  const [counter, setCounter] = useState(0)
  const [addedItems, setAddedItems] = useState<number[]>([])
  const hiddenRef = useRef<HTMLDivElement>(null)

  // 延迟出现
  const showDelayed = () => {
    setDelayedVisible(false)
    setTimeout(() => setDelayedVisible(true), 2000)
  }

  // 加载内容
  const loadContent = async () => {
    setLoading(true)
    setLoadedContent('')
    await new Promise(r => setTimeout(r, 1500))
    setLoadedContent('内容加载完成！这是异步加载出来的文字。')
    setLoading(false)
  }

  // 添加列表项
  const addItem = () => {
    setAddedItems(prev => [...prev, prev.length + 1])
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ArrowLeft size={16} className="mr-1" /> 返回首页
      </Link>

      <div className="bg-white rounded-xl border p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">动态元素</h1>
          <p className="text-sm text-gray-500">
            延迟出现、异步加载、动态增删等场景 —— 练习 Playwright 自动等待和动态内容断言
          </p>
        </div>

        {/* 1. 延迟出现 */}
        <section>
          <h2 className="font-medium mb-3">⏱️ 延迟出现（2 秒后显示）</h2>
          <button
            onClick={showDelayed}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm"
            data-testid="dynamic-show-delayed-btn"
          >
            触发延迟显示
          </button>
          {delayedVisible && (
            <p
              className="mt-3 text-green-600 font-medium"
              data-testid="dynamic-delayed-text"
            >
              ✅ 我出现了！（已延迟 2 秒）
            </p>
          )}
        </section>

        {/* 2. 异步加载 */}
        <section>
          <h2 className="font-medium mb-3">🔄 异步加载内容</h2>
          <button
            onClick={loadContent}
            disabled={loading}
            className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
            data-testid="dynamic-load-btn"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> 加载中...
              </span>
            ) : (
              '加载内容'
            )}
          </button>
          {loadedContent && (
            <p
              className="mt-3 text-blue-600"
              data-testid="dynamic-loaded-content"
            >
              📦 {loadedContent}
            </p>
          )}
        </section>

        {/* 3. 动态列表 */}
        <section>
          <h2 className="font-medium mb-3">📋 动态添加列表项</h2>
          <button
            onClick={addItem}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm"
            data-testid="dynamic-add-item-btn"
          >
            添加一项
          </button>
          {addedItems.length > 0 && (
            <ul className="mt-3 space-y-1" data-testid="dynamic-list">
              {addedItems.map(item => (
                <li
                  key={item}
                  className="px-3 py-2 bg-gray-50 rounded text-sm"
                  data-testid={`dynamic-item-${item}`}
                >
                  列表项 #{item}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 4. 计数器 */}
        <section>
          <h2 className="font-medium mb-3">🔢 计数器（状态变化）</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCounter(c => c - 1)}
              className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 text-lg flex items-center justify-center"
              data-testid="dynamic-counter-minus"
            >
              −
            </button>
            <span
              className="text-2xl font-bold w-12 text-center"
              data-testid="dynamic-counter-value"
            >
              {counter}
            </span>
            <button
              onClick={() => setCounter(c => c + 1)}
              className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 text-lg flex items-center justify-center"
              data-testid="dynamic-counter-plus"
            >
              +
            </button>
          </div>
        </section>

        {/* 5. 隐藏元素 */}
        <section>
          <h2 className="font-medium mb-3">👻 隐藏/可见切换</h2>
          <button
            onClick={() => {
              if (hiddenRef.current) {
                hiddenRef.current.classList.toggle('hidden')
              }
            }}
            className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            data-testid="dynamic-toggle-hidden-btn"
          >
            切换隐藏/显示
          </button>
          <div ref={hiddenRef} data-testid="dynamic-toggleable-element">
            <p className="mt-3 text-gray-600 text-sm">
              🎯 这个元素可以被隐藏或显示！
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
