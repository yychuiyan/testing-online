import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import ErrorBoundary from './lib/ErrorBoundary'
import { AuthProvider } from './lib/auth'
import { initMessage } from './lib/toast'
import { initModal } from './lib/modal'
import App from './App'

/** 初始化 toast/modal 的全局 API */
function InitProviders() {
  const { message, modal } = AntApp.useApp()
  useEffect(() => { initMessage(message) }, [message])
  useEffect(() => { initModal(modal) }, [modal])
  return null
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <ConfigProvider
          locale={zhCN}
          theme={{
            token: {
              colorPrimary: '#2563eb',
              borderRadius: 8,
            },
          }}
        >
          <AntApp>
            <InitProviders />
            <AuthProvider>
              <App />
            </AuthProvider>
          </AntApp>
        </ConfigProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
)
