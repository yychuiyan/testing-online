import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api, setUnauthorizedHandler, setToken, clearToken, getToken } from './api'
import type { AuthUser, Role } from './types'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>
  register: (username: string, email: string, password: string) => Promise<{ ok: boolean; message?: string }>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false)
      return
    }
    api.auth.me().then(res => {
      if (res.success && res.data) {
        setUser(res.data)
      } else {
        clearToken()
      }
    }).finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken()
      setUser(null)
    })
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.auth.login(username, password)
    if (res.success && res.data?.token) {
      setToken(res.data.token)
      setUser(res.data)
      return { ok: true }
    }
    return { ok: false, message: res.message || '登录失败' }
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await api.auth.register(username, email, password)
    if (res.success) {
      return { ok: true, message: res.message }
    }
    return { ok: false, message: res.message || '注册失败' }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.auth.logout()
    } finally {
      clearToken()
      setUser(null)
    }
  }, [])

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false
    if (user.permissions.includes('*')) return true
    return user.permissions.includes(permission)
  }, [user])

  const hasRole = useCallback((...roles: Role[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
