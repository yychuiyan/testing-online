import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface FormData {
  username: string
  email: string
  password: string
  confirmPassword: string
  gender: string
  age: string
  agreeTerms: boolean
}

interface FieldErrors {
  [key: string]: string
}

export default function RegisterForm() {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    age: '',
    agreeTerms: false,
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const validate = (): boolean => {
    const newErrors: FieldErrors = {}

    if (!formData.username || formData.username.length < 3) {
      newErrors.username = '用户名至少 3 个字符'
    }
    if (!formData.email || !formData.email.includes('@')) {
      newErrors.email = '请输入有效的邮箱地址'
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = '密码至少 6 个字符'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次密码不一致'
    }
    if (!formData.gender) {
      newErrors.gender = '请选择性别'
    }
    if (!formData.age || parseInt(formData.age) < 18 || parseInt(formData.age) > 120) {
      newErrors.age = '年龄需在 18-120 之间'
    }
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = '请同意用户协议'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(false)

    if (validate()) {
      setSubmitted(true)
      setErrors({})
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ArrowLeft size={16} className="mr-1" /> 返回首页
      </Link>

      <div className="bg-white rounded-xl border p-6">
        <h1 className="text-2xl font-bold mb-1">注册表单</h1>
        <p className="text-sm text-gray-500 mb-6">
          包含多种表单控件和前端验证 —— 用于练习复杂表单的自动化填写和错误断言
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form" noValidate>
          {/* 用户名 */}
          <div>
            <label htmlFor="reg-username" className="block text-sm font-medium text-gray-700 mb-1">
              用户名 <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.username ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="至少 3 个字符"
              data-testid="register-username"
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1" data-testid="register-username-error" role="alert">
                {errors.username}
              </p>
            )}
          </div>

          {/* 邮箱 */}
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">
              邮箱 <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.email ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="example@test.com"
              data-testid="register-email"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1" data-testid="register-email-error" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          {/* 密码 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
                密码 <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.password ? 'border-red-400' : 'border-gray-300'
                }`}
                placeholder="至少 6 个字符"
                data-testid="register-password"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1" data-testid="register-password-error" role="alert">
                  {errors.password}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700 mb-1">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-confirm"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.confirmPassword ? 'border-red-400' : 'border-gray-300'
                }`}
                placeholder="再次输入密码"
                data-testid="register-confirm-password"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1" data-testid="register-confirm-error" role="alert">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* 性别 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              性别 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-6">
              {['male', 'female', 'other'].map(g => (
                <label key={g} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={formData.gender === g}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-600"
                    data-testid={`register-gender-${g}`}
                  />
                  <span className="text-sm text-gray-700">
                    {g === 'male' ? '男' : g === 'female' ? '女' : '其他'}
                  </span>
                </label>
              ))}
            </div>
            {errors.gender && (
              <p className="text-red-500 text-xs mt-1" role="alert">{errors.gender}</p>
            )}
          </div>

          {/* 年龄 */}
          <div>
            <label htmlFor="reg-age" className="block text-sm font-medium text-gray-700 mb-1">
              年龄 <span className="text-red-500">*</span>
            </label>
            <select
              id="reg-age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className={`w-full border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.age ? 'border-red-400' : 'border-gray-300'
              }`}
              data-testid="register-age"
            >
              <option value="">请选择</option>
              {Array.from({ length: 50 }, (_, i) => i + 18).map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            {errors.age && (
              <p className="text-red-500 text-xs mt-1" role="alert">{errors.age}</p>
            )}
          </div>

          {/* 协议 */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleChange}
              className="w-4 h-4 mt-0.5 text-primary-600 rounded"
              data-testid="register-agree-terms"
            />
            <span className="text-sm text-gray-600">
              我已阅读并同意 <span className="text-primary-600">用户协议</span> 和 <span className="text-primary-600">隐私政策</span>
            </span>
          </label>
          {errors.agreeTerms && (
            <p className="text-red-500 text-xs" role="alert">{errors.agreeTerms}</p>
          )}

          {/* 提交 */}
          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            data-testid="register-submit-btn"
          >
            注 册
          </button>

          {/* 成功消息 */}
          {submitted && (
            <div
              className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 text-sm"
              data-testid="register-success-message"
              role="alert"
            >
              ✅ 注册成功！当前仅做前端校验，实际未写入数据库。
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
