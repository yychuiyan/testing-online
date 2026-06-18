import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, GripVertical } from 'lucide-react'

interface Item {
  id: number
  text: string
}

const initialItems: Item[] = [
  { id: 1, text: '🍎 苹果' },
  { id: 2, text: '🍊 橘子' },
  { id: 3, text: '🍋 柠檬' },
  { id: 4, text: '🍇 葡萄' },
  { id: 5, text: '🍑 桃子' },
]

export default function DragDropDemo() {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropZoneItems, setDropZoneItems] = useState<Item[]>([])
  const [dropOver, setDropOver] = useState(false)

  // ===== 列表排序拖拽 =====
  const handleSortDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleSortDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newItems = [...items]
    const dragged = newItems[draggedIndex]
    newItems.splice(draggedIndex, 1)
    newItems.splice(index, 0, dragged)
    setItems(newItems)
    setDraggedIndex(index)
  }

  const handleSortDragEnd = () => {
    setDraggedIndex(null)
  }

  // ===== 拖到目标区域 =====
  const handleTargetDragStart = useCallback((e: React.DragEvent, item: Item, index: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ item, index }))
  }, [])

  const handleTargetDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDropOver(true)
  }

  const handleTargetDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDropOver(false)
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      const newItems = items.filter((_, i) => i !== data.index)
      setItems(newItems)
      setDropZoneItems(prev => [...prev, data.item])
    } catch {
      // ignore
    }
  }

  const resetAll = () => {
    setItems(initialItems)
    setDropZoneItems([])
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ArrowLeft size={16} className="mr-1" /> 返回首页
      </Link>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">拖拽操作</h1>
            <p className="text-sm text-gray-500">
              列表排序拖拽 + 目标区域放置 —— 练习 drag and drop 自动化
            </p>
          </div>
          <button
            onClick={resetAll}
            className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            data-testid="dragdrop-reset-btn"
          >
            重置
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 左侧：可排序列表 */}
          <div>
            <h2 className="font-medium text-sm text-gray-500 mb-2">📋 拖拽排序列表</h2>
            <div className="space-y-1" data-testid="sortable-list">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleSortDragStart(index)}
                  onDragOver={e => handleSortDragOver(e, index)}
                  onDragEnd={handleSortDragEnd}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-move transition-colors ${
                    draggedIndex === index
                      ? 'border-primary-500 bg-primary-50 opacity-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  data-testid={`sortable-item-${item.id}`}
                >
                  <GripVertical size={14} className="text-gray-300" />
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：目标区域 */}
          <div>
            <h2 className="font-medium text-sm text-gray-500 mb-2">🎯 拖放目标区</h2>
            <div
              className={`border-2 border-dashed rounded-xl min-h-[200px] flex flex-col items-center justify-center transition-colors ${
                dropOver
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
              onDragOver={handleTargetDragOver}
              onDragLeave={() => setDropOver(false)}
              onDrop={handleTargetDrop}
              data-testid="drop-target-zone"
            >
              {dropZoneItems.length === 0 ? (
                <p className="text-sm text-gray-300">将列表项拖到这里</p>
              ) : (
                <div className="w-full p-3 space-y-1">
                  {dropZoneItems.map(item => (
                    <div
                      key={item.id}
                      className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm"
                      data-testid={`dropped-item-${item.id}`}
                    >
                      ✅ {item.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
