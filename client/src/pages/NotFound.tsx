import { Link } from 'react-router-dom'
import { Result, Button } from 'antd'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('404 页面不存在')

  return (
    <Result
      status="404"
      title="404"
      subTitle="页面不存在或已被移除"
      extra={
        <Link to="/admin/dashboard"><Button type="primary">返回首页</Button></Link>
      }
    />
  )
}
