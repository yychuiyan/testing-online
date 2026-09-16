import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons'
import { Table, Input, Select, Button, Space, Tag, Typography, Card } from 'antd'
import { api } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../lib/toast'
import { useModal } from '../../lib/modal'
import { ROLES, type User } from '../../lib/types'

const PROTECTED_IDS = [1, 2, 3, 4]

export default function UserList() {
  useDocumentTitle('用户管理')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>()
  const { hasPermission, hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const { success, error } = useToast()
  const { confirm } = useModal()
  const canEdit = hasPermission('users.write')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params: Record<string, string | number> = { page, pageSize: 5 }
    if (keyword) params.keyword = keyword
    if (roleFilter) params.role = roleFilter
    const res = await api.users.list(params)
    if (res.success && res.data) {
      setUsers(res.data.items)
      setTotal(res.data.total)
    }
    setLoading(false)
  }, [page, keyword, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleDelete = async (id: number, username: string) => {
    if (!isAdmin) { error('无权限', '仅超级管理员可删除用户'); return }
    const ok = await confirm('删除用户', `确定要删除用户 "${username}" 吗？此操作不可撤销。`)
    if (!ok) return
    const res = await api.users.remove(id)
    if (res.success) { success('用户已删除'); fetchUsers() }
    else { error(res.message || '删除失败') }
  }

  const handleRoleChange = async (id: number, role: string, username: string) => {
    if (!isAdmin) { error('无权限'); return }
    const ok = await confirm('修改角色', `确定将 "${username}" 的角色修改为 ${ROLES.find(r => r.value === role)?.label} 吗？`)
    if (!ok) return
    const res = await api.users.updateRole(id, role)
    if (res.success) { success('角色修改成功'); fetchUsers() }
    else { error(res.message || '修改失败') }
  }

  const columns = [
    {
      title: 'ID', dataIndex: 'id', width: 80,
      render: (id: number) => <Space>{id}{PROTECTED_IDS.includes(id) && <LockOutlined style={{ color: '#faad14', fontSize: 10 }} />}</Space>,
    },
    { title: '用户名', dataIndex: 'username', render: (u: string) => <Typography.Text strong>{u}</Typography.Text> },
    { title: '邮箱', dataIndex: 'email', render: (e: string) => <Typography.Text type="secondary">{e}</Typography.Text> },
    {
      title: '角色', render: (_: unknown, u: User) => {
        const protected_ = PROTECTED_IDS.includes(u.id)
        if (isAdmin) {
          return (
            <Select
              size="small"
              value={u.role}
              onChange={v => handleRoleChange(u.id, v, u.username)}
              disabled={protected_}
              style={{ width: 100 }}
              options={ROLES.map(r => ({ value: r.value, label: r.label }))}
            />
          )
        }
        return <Tag color={ROLES.find(r => r.value === u.role)?.color}>{ROLES.find(r => r.value === u.role)?.label}</Tag>
      },
    },
    { title: '状态', render: (_: unknown, u: User) => <Tag color={u.status === 'active' ? 'green' : 'red'}>{u.status === 'active' ? '正常' : '禁用'}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', render: (d: string) => new Date(d).toLocaleDateString('zh-CN') },
    {
      title: '操作', width: 150, render: (_: unknown, u: User) => {
        const protected_ = PROTECTED_IDS.includes(u.id)
        return (
          <Space>
            {canEdit && !protected_ && <Link to={`/admin/users/${u.id}`}><Button size="small" type="text" icon={<EditOutlined />} /></Link>}
            {isAdmin && !protected_ && <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(u.id, u.username)} />}
            {protected_ && <Typography.Text type="secondary" style={{ fontSize: 12 }}>受保护</Typography.Text>}
          </Space>
        )
      },
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>👥 用户管理</Typography.Title>
          <Typography.Text type="secondary">管理系统用户及角色权限</Typography.Text>
        </div>
        {canEdit && (
          <Link to="/admin/users/new"><Button type="primary" icon={<PlusOutlined />}>新增用户</Button></Link>
        )}
      </div>

      <Card size="small">
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索用户名或邮箱..."
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(1) }}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            value={roleFilter}
            onChange={v => { setRoleFilter(v); setPage(1) }}
            placeholder="全部角色"
            style={{ width: 140 }}
            allowClear
            options={ROLES.map(r => ({ value: r.value, label: r.label }))}
          />
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          dataSource={users}
          columns={columns}
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 5,
            onChange: setPage,
            showTotal: (t) => `共 ${t} 条`,
          }}
          locale={{ emptyText: '暂无用户数据' }}
        />
      </Card>
    </div>
  )
}
