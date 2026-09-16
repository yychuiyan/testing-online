import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Result, Button, Space } from 'antd'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <Result
            status="500"
            title="页面出错了"
            subTitle={this.state.error?.message || '很抱歉，页面遇到了意外错误。'}
            extra={
              <Space>
                <Button
                  type="primary"
                  onClick={() => {
                    this.setState({ hasError: false, error: null })
                    window.location.reload()
                  }}
                >
                  刷新页面
                </Button>
                <Link to="/">
                  <Button>返回首页</Button>
                </Link>
              </Space>
            }
          />
        </div>
      )
    }

    return this.props.children
  }
}
