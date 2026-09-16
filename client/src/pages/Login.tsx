import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Divider, Spin } from 'antd'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const demoAccounts = [
  { label: '管理员', username: '炊烟1号', password: 'admin123', role: 'admin' },
  { label: '普通用户', username: '炊烟2号', password: 'user123', role: 'user' },
]

export default function Login() {
  useDocumentTitle('登录 - 后台管理系统')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form] = Form.useForm()

  if (isAuthenticated) {
    navigate(searchParams.get('redirect') || '/admin/dashboard', { replace: true })
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>
  }

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true)
    const result = await login(values.username, values.password)
    setLoading(false)
    if (result.ok) {
      success('登录成功')
      navigate(searchParams.get('redirect') || '/admin/dashboard', { replace: true })
    } else {
      error('登录失败', result.message || '用户名或密码错误')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, backgroundColor: '#2563eb', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Typography.Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff' }}>A</Typography.Text>
          </div>
          <Typography.Title level={2} style={{ color: '#fff', margin: 0 }}>后台管理系统</Typography.Title>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>请登录您的账号</Typography.Text>
        </div>

        <Card>
          {/* 演示账号 */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 20 }}>
            <Typography.Text style={{ fontSize: 12, color: '#94a3b8' }}>📌 演示账号</Typography.Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 8 }}>
              {demoAccounts.map(acc => (
                <Button
                  key={acc.username}
                  size="small"
                  block
                  onClick={() => form.setFieldsValue({ username: acc.username, password: acc.password })}
                  style={{ textAlign: 'left' }}
                >
                  <Typography.Text strong style={{ fontSize: 12 }}>{acc.label}</Typography.Text>
                  <Typography.Text style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>{acc.username}</Typography.Text>
                </Button>
              ))}
            </div>
          </div>

          <Form form={form} onFinish={handleSubmit} layout="vertical" data-testid="login-form">
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                placeholder="请输入用户名"
                autoComplete="username"
                data-testid="login-username-input"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                placeholder="请输入密码"
                autoComplete="current-password"
                data-testid="login-password-input"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                data-testid="login-submit-btn"
              >
                登 录
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '12px 0' }} />
          <Typography.Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', display: 'block' }}>
            还没有账号？
            <Link to="/register">立即注册</Link>
          </Typography.Text>
        </Card>
      </div>
    </div>
  )
}
