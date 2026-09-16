import { useState, useEffect, useCallback } from 'react'
import { SearchOutlined, UserOutlined } from '@ant-design/icons'
import { Table, Input, Select, Tag, Typography, Card, Space } from 'antd'
import { api } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import type { LogEntry } from '../../lib/types'

const ACTION_MAP: Record<string, string> = {
  login: '登录', logout: '登出', create: '创建', update: '修改', delete: '删除',
  view: '查看', export: '导出', register: '注册',
}

const actionColor = (a: string) => {
  if (a === 'create') return 'green'
  if (a === 'delete') return 'red'
  if (a === 'update') return 'blue'
  return 'default'
}

export default function LogList() {
  useDocumentTitle('操作日志')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [usernameFilter, setUsernameFilter] = useState('')
  const [actionFilter, setActionFilter] = useState<string>()

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params: Record<string, string | number> = { page, pageSize: 5 }
    if (usernameFilter) params.username = usernameFilter
    if (actionFilter) params.action = actionFilter
    const res = await api.logs.list(params)
    if (res.success && res.data) {
      setLogs(res.data.items)
      setTotal(res.data.total)
    }
    setLoading(false)
  }, [page, usernameFilter, actionFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const columns = [
    { title: '时间', dataIndex: 'createdAt', render: (d: string) => new Date(d).toLocaleString('zh-CN') },
    { title: '用户', render: (_: unknown, l: LogEntry) => <Space><UserOutlined style={{ color: '#8c8c8c' }} />{l.username}</Space> },
    { title: '操作类型', render: (_: unknown, l: LogEntry) => <Tag color={actionColor(l.action)}>{ACTION_MAP[l.action] || l.action}</Tag> },
    { title: '模块', dataIndex: 'module' },
    { title: '详情', dataIndex: 'detail' },
    { title: 'IP', dataIndex: 'ip', render: (ip: string) => <Typography.Text type="secondary" style={{ fontSize: 12 }}>{ip}</Typography.Text> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Typography.Title level={2} style={{ margin: 0 }}>📝 操作日志</Typography.Title>
        <Typography.Text type="secondary">仅超级管理员可查看</Typography.Text>
      </div>

      <Card size="small">
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索用户名..."
            value={usernameFilter}
            onChange={e => { setUsernameFilter(e.target.value); setPage(1) }}
            style={{ width: 180 }}
            allowClear
          />
          <Select
            value={actionFilter}
            onChange={v => { setActionFilter(v); setPage(1) }}
            placeholder="全部操作"
            style={{ width: 130 }}
            allowClear
            options={Object.entries(ACTION_MAP).map(([k, v]) => ({ value: k, label: v }))}
          />
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          dataSource={logs}
          columns={columns}
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 5,
            onChange: setPage,
            showTotal: (t) => `共 ${t} 条`,
          }}
          locale={{ emptyText: '暂无日志数据' }}
        />
      </Card>
    </div>
  )
}
