import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Layers, Target, Shield, BarChart3, Puzzle } from 'lucide-react';

const sections = [
  {
    id: 'pyramid',
    icon: Layers,
    title: '测试金字塔',
    content: `测试金字塔是 Mike Cohn 提出的经典测试策略模型，将测试分为三层：

- **单元测试（底层）**：数量最多、速度最快、成本最低。验证单个函数/模块逻辑。
- **集成/服务测试（中层）**：验证模块间交互、API 契约、数据库操作。
- **E2E 测试（顶层）**：数量最少、速度最慢、成本最高。验证完整用户流程。

**核心原则**：越底层的测试应该越多，越上层的测试越少。`,
  },
  {
    id: 'equivalence',
    icon: Target,
    title: '等价类划分',
    content: `等价类划分是黑盒测试中最重要的用例设计方法之一。

**核心思想**：将输入域划分为若干等价类，每个等价类中的数据对程序的行为是等价的。

**分类**：
- **有效等价类**：合理的、有意义的输入数据
- **无效等价类**：不合理的、无意义的输入数据

**示例（年龄输入 18-60）**：
| 类型 | 等价类 | 测试数据 |
|------|--------|---------|
| 有效 | [18, 60] | 25 |
| 无效 | < 18 | 15 |
| 无效 | > 60 | 65 |
| 无效 | 非数字 | "abc" |
| 无效 | 空值 | "" |`,
  },
  {
    id: 'boundary',
    icon: Shield,
    title: '边界值分析',
    content: `边界值分析是对等价类划分的补充，经验表明大多数缺陷集中在边界附近。

**测试原则**：对每个等价类的边界值，取「边界点、边界点±1」进行测试。

**示例（年龄 18-60）**：
- 上边界：17、18、19
- 下边界：59、60、61

**常见边界场景**：
- 数值上下限（最小值、最大值）
- 字符串长度限制
- 数组/列表为空、满
- 日期范围
- 循环的首次和最后一次迭代`,
  },
  {
    id: 'test-types',
    icon: BarChart3,
    title: '测试类型与策略',
    content: `| 测试类型 | 关注点 | 执行频率 | 工具示例 |
|---------|--------|---------|---------|
| 单元测试 | 函数/方法逻辑 | 每次提交 | Jest, Pytest |
| 接口测试 | API 契约 | 每次部署 | Postman, Supertest |
| UI自动化 | 用户操作流程 | 每日/每次发布 | Playwright, Selenium |
| 性能测试 | 响应时间/吞吐量 | 每次大版本 | JMeter, k6 |
| 安全测试 | 漏洞/权限 | 定期 | OWASP ZAP |
| 兼容性测试 | 多平台/浏览器 | 每次大版本 | BrowserStack |

**测试策略建议**：
1. 单元测试覆盖核心业务逻辑（目标 80%+）
2. API 测试覆盖所有接口的主要场景
3. UI 自动化覆盖核心用户旅程（冒烟测试级别）
4. 性能测试关注关键接口的 P95/P99 延迟`,
  },
  {
    id: 'design-patterns',
    icon: Puzzle,
    title: '自动化测试设计模式',
    content: `**POM（Page Object Model）**：将页面元素定位和操作封装为页面对象，是 UI 自动化最核心的设计模式。

**推荐结构**：
\`\`\`
tests/
├── pages/           # Page Object
│   ├── LoginPage.ts
│   └── HomePage.ts
├── components/      # 可复用组件
│   └── Header.ts
├── fixtures/        # 测试夹具
│   └── auth.ts
├── specs/           # 测试用例
│   └── login.spec.ts
└── utils/           # 工具函数
    └── data-generator.ts
\`\`\`

**核心原则**：
- 页面对象只负责定位和基础操作
- 测试用例负责业务逻辑和断言
- 数据与用例分离（参数化）
- 登录态等通用状态用 Fixture 管理`,
  },
];

export default function TheoryPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft size={16} className="mr-1" /> 返回首页
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">测试理论基础</h1>
        <p className="text-gray-500">从测试方法论到自动化设计模式 —— 理论与实践的结合</p>
      </div>

      {/* 导航 */}
      <div className="bg-white rounded-xl border p-4 mb-8">
        <h2 className="text-sm font-medium text-gray-400 mb-2">目录</h2>
        <div className="flex flex-wrap gap-2">
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-sm text-primary-600 hover:underline px-2 py-1"
            >
              {s.title}
            </a>
          ))}
        </div>
      </div>

      {/* 内容 */}
      <div className="space-y-6">
        {sections.map(section => (
          <section
            key={section.id}
            id={section.id}
            className="bg-white rounded-xl border p-6 scroll-mt-20"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                <section.icon size={20} />
              </div>
              <h2 className="text-xl font-semibold">{section.title}</h2>
            </div>
            <div
              className="prose prose-sm max-w-none text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: section.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n\n/g, '</p><p>')
                  .replace(/\n- /g, '<br/>• ')
                  .replace(/\|(.+)\|/g, match => {
                    // 简单处理表格
                    return '<br/>' + match + '<br/>';
                  })
                  .replace(/^(.+)$/gm, '<p>$1</p>')
                  .replace(
                    /```\n?([\s\S]*?)```/g,
                    '<pre class="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs"><code>$1</code></pre>'
                  ),
              }}
            />
          </section>
        ))}
      </div>

      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-700">
          💡 <strong>提示</strong>：更多详细教程请访问{' '}
          <a
            href="https://docs.yychuiyan.com/testing/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            炊烟小站 | 测试理论与实践
          </a>
        </p>
      </div>
    </div>
  );
}
