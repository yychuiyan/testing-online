import { App } from 'antd'

let modalApi: ReturnType<typeof App.useApp>['modal'] | null = null

/** 初始化 modal API，在 main.tsx 的初始化组件中调用 */
export function initModal(modal: ReturnType<typeof App.useApp>['modal']) {
  modalApi = modal
}

export function useModal() {
  // antd App.useApp 必须在 App 组件内部调用，这里用全局变量作为后备
  const { modal } = App.useApp()
  const m = modalApi || modal

  const alert = (title: string, description?: string): Promise<void> =>
    new Promise((resolve) => {
      m.info({
        title,
        content: description,
        onOk: () => resolve(),
        okText: '我知道了',
        centered: true,
      })
    })

  const confirm = (title: string, description?: string): Promise<boolean> =>
    new Promise((resolve) => {
      m.confirm({
        title,
        content: description,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
        okText: '确定',
        cancelText: '取消',
        centered: true,
      })
    })

  return { alert, confirm }
}
