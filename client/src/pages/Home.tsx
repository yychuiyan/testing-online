import { Link } from 'react-router-dom'
import { MousePointerClick, Zap, BookOpen, ArrowRight } from 'lucide-react'

const sections = [
  {
    title: '自动化练习',
    icon: MousePointerClick,
    color: 'bg-blue-50 text-blue-600',
    description: '包含登录表单、注册表单、数据表格、弹窗、文件上传、动态元素、拖拽等常见 UI 场景，适合用于 Playwright / Selenium 自动化测试练习。',
    links: [
      { to: '/automation/login', label: '登录表单' },
      { to: '/automation/register', label: '注册表单' },
      { to: '/automation/table', label: '数据表格' },
      { to: '/automation/modal', label: '弹窗对话框' },
      { to: '/automation/upload', label: '文件上传' },
      { to: '/automation/dynamic', label: '动态元素' },
      { to: '/automation/dragdrop', label: '拖拽操作' },
    ],
  },
  {
    title: '性能测试',
    icon: Zap,
    color: 'bg-amber-50 text-amber-600',
    description: '包含大列表渲染、图片加载、DOM 复杂度等场景，可用于性能基准测试、Lighthouse 分析和前端性能优化练习。',
    links: [
      { to: '/performance/large-list', label: '大列表渲染' },
      { to: '/performance/image-loading', label: '图片加载' },
      { to: '/performance/dom-complexity', label: 'DOM 复杂度' },
    ],
  },
  {
    title: '测试理论',
    icon: BookOpen,
    color: 'bg-green-50 text-green-600',
    description: '测试金字塔、等价类划分、边界值分析等测试理论基础，理论与实践结合。',
    links: [{ to: '/theory', label: '浏览理论' }],
  },
]

const apiEndpoints = [
  { method: 'POST', path: '/api/auth/login', desc: '用户登录' },
  { method: 'GET', path: '/api/auth/me', desc: '获取当前登录用户' },
  { method: 'POST', path: '/api/auth/logout', desc: '用户登出' },
  { method: 'GET', path: '/api/users?page=1&pageSize=10', desc: '用户列表（分页）' },
  { method: 'POST', path: '/api/users', desc: '新增用户' },
  { method: 'PUT', path: '/api/users/:id', desc: '修改用户' },
  { method: 'DELETE', path: '/api/users/:id', desc: '删除用户' },
  { method: 'GET', path: '/api/mock/timeout?delay=5000', desc: '模拟超时' },
  { method: 'GET', path: '/api/mock/status/:code', desc: '返回指定状态码' },
  { method: 'GET', path: '/api/mock/random', desc: '随机成功/失败' },
  { method: 'GET', path: '/api/perf/large?rows=1000', desc: '大数据量响应' },
  { method: 'GET', path: '/api/perf/slow?delay=3000', desc: '慢接口' },
]

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          🧪 Test Online
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          一个专为测试工程师打造的在线练习平台 ——
          包含自动化测试靶场、性能测试场景和测试理论基础，可用于 Playwright、Selenium、JMeter 等工具的实战练习。
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/automation/login"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 transition-colors"
            data-testid="hero-start-btn"
          >
            开始练习 <ArrowRight size={16} />
          </Link>
          <a
            href="#api-section"
            className="inline-flex items-center gap-2 border border-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            API 列表
          </a>
        </div>
      </div>

      {/* 三大模块 */}
      <div className="grid md:grid-cols-3 gap-6">
        {sections.map(section => (
          <div key={section.title} className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-lg ${section.color} flex items-center justify-center mb-4`}>
              <section.icon size={20} />
            </div>
            <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">{section.description}</p>
            <ul className="space-y-1">
              {section.links.map(link => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-primary-600 hover:underline"
                    data-testid={`home-link-${link.label}`}
                  >
                    {link.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* API 列表 */}
      <div id="api-section" className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold">📡 可用 API 接口</h2>
          <p className="text-sm text-gray-500 mt-1">
            用于练习 API 测试（request context / APIRequestContext）
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-6 py-2 font-medium text-gray-500 w-16">方法</th>
                <th className="text-left px-6 py-2 font-medium text-gray-500">路径</th>
                <th className="text-left px-6 py-2 font-medium text-gray-500">说明</th>
              </tr>
            </thead>
            <tbody>
              {apiEndpoints.map(ep => (
                <tr key={ep.path + ep.method} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${
                      ep.method === 'GET' ? 'bg-green-100 text-green-700' :
                      ep.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                      ep.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 font-mono text-gray-700">{ep.path}</td>
                  <td className="px-6 py-2.5 text-gray-500">{ep.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
