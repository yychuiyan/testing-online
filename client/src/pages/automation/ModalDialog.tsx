import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'

export default function ModalDialog() {
  const [modalOpen, setModalOpen] = useState<string | null>(null)
  const [confirmResult, setConfirmResult] = useState<string | null>(null)

  const openModal = (name: string) => setModalOpen(name)
  const closeModal = () => setModalOpen(null)

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ArrowLeft size={16} className="mr-1" /> 返回首页
      </Link>

      <div className="bg-white rounded-xl border p-6">
        <h1 className="text-2xl font-bold mb-1">弹窗对话框</h1>
        <p className="text-sm text-gray-500 mb-6">
          包含 Alert、Confirm、Modal 三种弹窗 —— 练习弹窗定位、文字断言和关闭操作
        </p>

        <div className="space-y-3">
          {/* Alert */}
          <button
            onClick={() => openModal('alert')}
            className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
            data-testid="modal-trigger-alert"
          >
            <span className="font-medium">🔔 Alert 提示框</span>
            <span className="text-sm text-gray-400 ml-2">— 点击任意位置可关闭</span>
          </button>

          {/* Confirm */}
          <button
            onClick={() => openModal('confirm')}
            className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
            data-testid="modal-trigger-confirm"
          >
            <span className="font-medium">⚠️ Confirm 确认框</span>
            <span className="text-sm text-gray-400 ml-2">— 有确定/取消两个按钮</span>
          </button>

          {/* Nested Modal */}
          <button
            onClick={() => openModal('nested')}
            className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
            data-testid="modal-trigger-nested"
          >
            <span className="font-medium">📋 嵌套弹窗</span>
            <span className="text-sm text-gray-400 ml-2">— 弹窗中可以再打开弹窗</span>
          </button>

          {/* 确认结果 */}
          {confirmResult && (
            <div
              className="mt-3 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm border border-blue-200"
              data-testid="modal-confirm-result"
            >
              {confirmResult}
            </div>
          )}
        </div>
      </div>

      {/* === Alert Modal === */}
      {modalOpen === 'alert' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeModal}
          data-testid="modal-alert-overlay"
        >
          <div
            className="bg-white rounded-xl p-6 w-80 shadow-xl"
            onClick={e => e.stopPropagation()}
            data-testid="modal-alert-dialog"
            role="dialog"
          >
            <h2 className="font-semibold text-lg mb-2">提示</h2>
            <p className="text-gray-600 text-sm mb-4">这是一个 Alert 提示框，点击关闭或空白处关闭。</p>
            <button
              onClick={closeModal}
              className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors"
              data-testid="modal-alert-close-btn"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* === Confirm Modal === */}
      {modalOpen === 'confirm' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          data-testid="modal-confirm-overlay"
        >
          <div
            className="bg-white rounded-xl p-6 w-80 shadow-xl"
            data-testid="modal-confirm-dialog"
            role="dialog"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">确认操作</h2>
              <button onClick={closeModal} data-testid="modal-confirm-close-x">
                <X size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-4">确定要执行此操作吗？此操作不可撤销。</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setConfirmResult('已取消操作')
                  closeModal()
                }}
                className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                data-testid="modal-confirm-cancel-btn"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setConfirmResult('✅ 操作已确认执行')
                  closeModal()
                }}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
                data-testid="modal-confirm-ok-btn"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Nested Modal === */}
      {modalOpen === 'nested' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          data-testid="modal-nested-overlay"
        >
          <div
            className="bg-white rounded-xl p-6 w-80 shadow-xl"
            data-testid="modal-nested-dialog"
            role="dialog"
          >
            <h2 className="font-semibold text-lg mb-2">一级弹窗</h2>
            <p className="text-gray-600 text-sm mb-4">点击下方按钮打开二级弹窗。</p>
            <div className="flex gap-2">
              <button
                onClick={closeModal}
                className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                关闭
              </button>
              <button
                onClick={() => openModal('alert')}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 text-sm"
                data-testid="modal-open-nested"
              >
                打开二级弹窗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
