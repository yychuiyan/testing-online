import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'

interface NavGroup {
  label: string
  children: { label: string; to: string }[]
}

const navGroups: NavGroup[] = [
  {
    label: '自动化练习',
    children: [
      { label: '登录表单', to: '/automation/login' },
      { label: '注册表单', to: '/automation/register' },
      { label: '数据表格', to: '/automation/table' },
      { label: '弹窗对话框', to: '/automation/modal' },
      { label: '文件上传', to: '/automation/upload' },
      { label: '动态元素', to: '/automation/dynamic' },
      { label: '拖拽操作', to: '/automation/dragdrop' },
    ],
  },
  {
    label: '性能测试',
    children: [
      { label: '大列表渲染', to: '/performance/large-list' },
      { label: '图片加载', to: '/performance/image-loading' },
      { label: 'DOM 复杂度', to: '/performance/dom-complexity' },
    ],
  },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const location = useLocation()

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="text-lg font-bold text-primary-600 tracking-tight">
          🧪 Test Online
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navGroups.map(group => (
            <div key={group.label} className="relative group">
              <button className="px-3 py-2 text-sm rounded-md hover:bg-gray-100 flex items-center gap-1">
                {group.label}
                <ChevronDown size={14} />
              </button>
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[160px]">
                {group.children.map(child => (
                  <Link
                    key={child.to}
                    to={child.to}
                    className={`block px-4 py-2 text-sm hover:bg-primary-50 ${
                      location.pathname === child.to
                        ? 'text-primary-600 bg-primary-50 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link
            to="/theory"
            className={`px-3 py-2 text-sm rounded-md ${
              location.pathname === '/theory'
                ? 'text-primary-600 bg-primary-50 font-medium'
                : 'hover:bg-gray-100'
            }`}
          >
            测试理论
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          data-testid="mobile-menu-toggle"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-white px-4 pb-4" data-testid="mobile-menu">
          {navGroups.map(group => (
            <div key={group.label} className="mt-2">
              <button
                className="w-full text-left py-2 text-sm font-medium text-gray-500 flex items-center justify-between"
                onClick={() => setExpanded(expanded === group.label ? null : group.label)}
              >
                {group.label}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    expanded === group.label ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expanded === group.label && (
                <div className="ml-2 space-y-1">
                  {group.children.map(child => (
                    <Link
                      key={child.to}
                      to={child.to}
                      onClick={() => setOpen(false)}
                      className={`block px-3 py-1.5 text-sm rounded ${
                        location.pathname === child.to
                          ? 'text-primary-600 bg-primary-50 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link
            to="/theory"
            onClick={() => setOpen(false)}
            className="block mt-2 py-2 text-sm font-medium text-gray-500"
          >
            测试理论
          </Link>
        </div>
      )}
    </nav>
  )
}
