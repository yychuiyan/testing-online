import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage(`✅ ${data.message}，欢迎 ${data.data.username}`)
        setMessageType('success')
      } else {
        setMessage(`❌ ${data.message}`)
        setMessageType('error')
      }
    } catch {
      setMessage('❌ 网络错误，请检查服务是否启动')
      setMessageType('error')
    }
  }

  const credentials = [
    { label: '管理员', username: 'admin', password: 'admin123' },
    { label: '测试用户', username: 'testuser', password: 'test123' },
  ]

  return (
    <div className="max-w-md mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ArrowLeft size={16} className="mr-1" /> 返回首页
      </Link>

      <div className="bg-white rounded-xl border p-6">
        <h1 className="text-2xl font-bold mb-1">登录表单</h1>
        <p className="text-sm text-gray-500 mb-6">
          用于练习表单填写、提交、Cookie/登录态管理的自动化测试场景
        </p>

        {/* 提示 */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 text-sm">
          <p className="font-medium text-blue-700 mb-1">📌 可用账号</p>
          <div className="space-y-1">
            {credentials.map(c => (
              <p key={c.label} className="text-blue-600">
                {c.label}：<code className="bg-blue-100 px-1 rounded">{c.username}</code> / <code className="bg-blue-100 px-1 rounded">{c.password}</code>
              </p>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
          {/* 用户名 */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="请输入用户名"
              data-testid="login-username-input"
              required
            />
          </div>

          {/* 密码 */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="请输入密码"
              data-testid="login-password-input"
              required
            />
          </div>

          {/* 按钮 */}
          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            data-testid="login-submit-btn"
          >
            登 录
          </button>

          {/* 快捷登录 */}
          <div className="flex gap-2 pt-2">
            {credentials.map(c => (
              <button
                key={c.label}
                type="button"
                onClick={() => {
                  setUsername(c.username)
                  setPassword(c.password)
                }}
                className="flex-1 text-xs border border-gray-200 rounded-md py-1.5 hover:bg-gray-50 transition-colors"
                data-testid={`login-quick-${c.username}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </form>

        {/* 消息 */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              messageType === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
            data-testid="login-message"
            role="alert"
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
