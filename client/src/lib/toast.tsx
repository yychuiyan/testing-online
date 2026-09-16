import { App } from 'antd'

let messageApi: ReturnType<typeof App.useApp>['message'] | null = null

/** 初始化 message API，在 main.tsx 的初始化组件中调用 */
export function initMessage(message: ReturnType<typeof App.useApp>['message']) {
  messageApi = message
}

export function useToast() {
  const { message } = App.useApp()
  const m = messageApi || message

  return {
    success: (title: string, description?: string) =>
      m.success(description ? `${title}: ${description}` : title),
    error: (title: string, description?: string) =>
      m.error(description ? `${title}: ${description}` : title),
    warning: (title: string, description?: string) =>
      m.warning(description ? `${title}: ${description}` : title),
    info: (title: string, description?: string) =>
      m.info(description ? `${title}: ${description}` : title),
  }
}
