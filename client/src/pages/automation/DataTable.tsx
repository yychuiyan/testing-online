import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'

interface User {
  id: number
  name: string
  email: string
  role: string
  status: string
  createdAt: string
}

export default function DataTable() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '10' })
      if (keyword) params.set('keyword', keyword)

      const res = await fetch(`/api/users?${params}`)
      const data = await res.json()
      if (data.success) {
        setUsers(data.data.items)
        setTotalPages(data.data.totalPages)
      }
    } catch {
      // 接口未启动时的降级处理
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [page, keyword])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = () => {
    setKeyword(searchInput)
    setPage(1)
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' })
      fetchUsers()
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ArrowLeft size={16} className="mr-1" /> 返回首页
      </Link>

      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h1 className="text-2xl font-bold mb-1">数据表格</h1>
          <p className="text-sm text-gray-500">
            包含分页、搜索、CRUD 操作 —— 用于练习表格遍历、分页点击、行定位和数据验证
          </p>
        </div>

        {/* 搜索栏 */}
        <div className="px-6 py-3 border-b bg-gray-50 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索用户名或邮箱..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            data-testid="table-search-input"
          />
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-1 bg-primary-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-primary-700 transition-colors"
            data-testid="table-search-btn"
          >
            <Search size={14} /> 搜索
          </button>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="user-table">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-6 py-2 font-medium text-gray-500 w-12">ID</th>
                <th className="text-left px-6 py-2 font-medium text-gray-500">用户名</th>
                <th className="text-left px-6 py-2 font-medium text-gray-500">邮箱</th>
                <th className="text-left px-6 py-2 font-medium text-gray-500">角色</th>
                <th className="text-left px-6 py-2 font-medium text-gray-500">状态</th>
                <th className="text-left px-6 py-2 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    加载中...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr
                    key={user.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                    data-testid={`table-row-${user.id}`}
                  >
                    <td className="px-6 py-2.5 text-gray-500">{user.id}</td>
                    <td className="px-6 py-2.5 font-medium">{user.name}</td>
                    <td className="px-6 py-2.5 text-gray-500">{user.email}</td>
                    <td className="px-6 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-2.5">
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                        data-testid={`table-delete-${user.id}`}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="px-6 py-3 border-t flex items-center justify-between" data-testid="table-pagination">
          <span className="text-sm text-gray-500">共 {totalPages} 页</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              data-testid="table-prev-page"
            >
              上一页
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              // 简单分页显示逻辑
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const pageNum = i + start
              if (pageNum > totalPages) return null
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1 text-sm border rounded ${
                    page === pageNum
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'hover:bg-gray-50'
                  }`}
                  data-testid={`table-page-${pageNum}`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              data-testid="table-next-page"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
