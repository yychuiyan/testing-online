import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { Form, Input, Select, Button, Card, Typography, Space } from 'antd'
import { api } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../lib/toast'
import { ROLES, type User } from '../../lib/types'

export default function UserForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  useDocumentTitle(isEdit ? '编辑用户' : '新增用户')

  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const { success, error } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) {
      api.users.detail(parseInt(id)).then(res => {
        if (res.success && res.data) {
          const u = res.data as User
          form.setFieldsValue({ username: u.username, email: u.email, role: u.role, status: u.status })
        }
      })
    }
  }, [id, form])

  const handleSubmit = async (values: Record<string, unknown>) => {
    const data: Record<string, unknown> = { ...values }
    if (isEdit && !data.password) delete data.password

    setSaving(true)
    const res = isEdit
      ? await api.users.update(parseInt(id!), data)
      : await api.users.create(data)
    setSaving(false)

    if (res.success) {
      success(isEdit ? '用户更新成功' : '用户创建成功')
      navigate('/admin/users')
    } else {
      error(res.message || '操作失败')
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <Link to="/admin/users" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16, color: '#8c8c8c', fontSize: 13 }}>
        <ArrowLeftOutlined /> 返回用户列表
      </Link>

      <Card>
        <Typography.Title level={4} style={{ marginBottom: 24 }}>{isEdit ? '编辑用户' : '新增用户'}</Typography.Title>

        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ role: 'user', status: 'active' }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="用户名" />
          </Form.Item>

          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input placeholder="user@example.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={isEdit ? [] : [{ required: true, message: '请设置密码' }]}
          >
            <Input.Password placeholder={isEdit ? '留空则不修改密码' : '设置密码'} />
          </Form.Item>

          {isAdmin && (
            <Form.Item name="role" label="角色">
              <Select options={ROLES.map(r => ({ value: r.value, label: r.label }))} />
            </Form.Item>
          )}

          <Form.Item name="status" label="状态">
            <Select options={[{ value: 'active', label: '正常' }, { value: 'disabled', label: '禁用' }]} />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>保存</Button>
            <Button onClick={() => navigate('/admin/users')}>取消</Button>
          </Space>
        </Form>
      </Card>
    </div>
  )
}
