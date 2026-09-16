import { Link } from 'react-router-dom'
import { Result, Button, Space } from 'antd'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function Forbidden() {
  useDocumentTitle('403 无权限')

  return (
    <Result
      status="403"
      title="403"
      subTitle="抱歉，您没有权限访问此页面"
      extra={
        <Space>
          <Link to="/admin/dashboard"><Button type="primary">返回首页</Button></Link>
          <Link to="/login"><Button>切换账号</Button></Link>
        </Space>
      }
    />
  )
}
