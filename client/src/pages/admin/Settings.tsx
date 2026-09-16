import { Form, Input, InputNumber, Select, Switch, Button, Card, Typography, Divider } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useToast } from '../../lib/toast'

export default function Settings() {
  useDocumentTitle('系统设置')
  const { success } = useToast()
  const [form] = Form.useForm()

  const handleSave = () => {
    success('设置已保存', '系统配置已更新（当前为模拟保存）')
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={2} style={{ margin: 0 }}>⚙️ 系统设置</Typography.Title>
        <Typography.Text type="secondary">仅超级管理员可配置系统参数</Typography.Text>
      </div>

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{
          siteName: 'Admin Panel', logo: 'A', pageSize: '10', sessionTimeout: 3600,
          enableRegister: true, enableNotification: true, enableLog: true,
        }}>
          <Typography.Text strong>基本设置</Typography.Text>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <Form.Item name="siteName" label="系统名称">
              <Input />
            </Form.Item>
            <Form.Item name="logo" label="Logo 文字">
              <Input maxLength={2} />
            </Form.Item>
            <Form.Item name="pageSize" label="每页条数">
              <Select options={['10', '20', '50', '100'].map(n => ({ value: n, label: n }))} />
            </Form.Item>
            <Form.Item name="sessionTimeout" label="会话超时（秒）">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Divider />

          <Typography.Text strong>功能开关</Typography.Text>
          <div style={{ marginTop: 16 }}>
            <Form.Item name="enableRegister" label="允许注册" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="enableNotification" label="系统通知" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="enableLog" label="操作日志" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <Divider />

          <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>保存设置</Button>
        </Form>
      </Card>
    </div>
  )
}
