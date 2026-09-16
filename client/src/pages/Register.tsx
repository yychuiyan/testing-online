import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Radio, Checkbox, Divider } from 'antd'
import { useToast } from '../lib/toast'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function Register() {
  useDocumentTitle('注册 - 后台管理系统')
  const [loading, setLoading] = useState(false)
  const { success } = useToast()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const handleSubmit = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    setLoading(false)
    success('注册成功', '请使用演示账号登录')
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, backgroundColor: '#2563eb', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Typography.Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff' }}>A</Typography.Text>
          </div>
          <Typography.Title level={2} style={{ color: '#fff', margin: 0 }}>创建账号</Typography.Title>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>注册后台管理系统账号</Typography.Text>
        </div>

        <Card>
          <Form form={form} onFinish={handleSubmit} layout="vertical" size="middle">
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少 3 个字符' },
                { pattern: /^[a-zA-Z0-9_一-龥]+$/, message: '只能包含字母、数字、下划线和中文' },
              ]}
            >
              <Input placeholder="至少 3 个字符" maxLength={20} />
            </Form.Item>

            <Form.Item name="gender" label="性别">
              <Radio.Group>
                <Radio value="男">男</Radio>
                <Radio value="女">女</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="hobbies" label="爱好">
              <Checkbox.Group options={['运动', '阅读', '音乐', '旅行', '美食', '游戏']} />
            </Form.Item>

            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '邮箱格式不正确' },
              ]}
            >
              <Input placeholder="example@admin.com" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="手机号"
              rules={[{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]}
            >
              <Input placeholder="选填" maxLength={11} />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少 6 个字符' },
                { max: 20, message: '密码最多 20 个字符' },
              ]}
            >
              <Input.Password placeholder="6-20 个字符" maxLength={20} />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认密码"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('两次密码输入不一致'))
                  },
                }),
              ]}
            >
              <Input.Password placeholder="再次输入密码" maxLength={20} />
            </Form.Item>

            <Form.Item
              name="agreed"
              valuePropName="checked"
              rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请同意用户协议和隐私政策')) }]}
            >
              <Checkbox>我已阅读并同意 <Typography.Link>用户协议</Typography.Link> 和 <Typography.Link>隐私政策</Typography.Link></Checkbox>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                注 册
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '12px 0' }} />
          <Typography.Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', display: 'block' }}>
            已有账号？
            <Link to="/login">去登录</Link>
          </Typography.Text>
        </Card>
      </div>
    </div>
  )
}
