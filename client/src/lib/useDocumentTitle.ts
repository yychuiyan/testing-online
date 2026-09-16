import { useEffect } from 'react'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} - 优选商城` : '优选商城'
    return () => {
      document.title = prev
    }
  }, [title])
}
