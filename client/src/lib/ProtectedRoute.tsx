import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import { PageSkeleton } from './LoadingSkeleton'
import type { Role } from './types'

interface Props {
  children: React.ReactNode
  requiredRole?: Role | Role[]
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { isAuthenticated, isLoading, hasRole } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageSkeleton />

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!hasRole(...roles)) {
      return <Navigate to="/403" replace />
    }
  }

  return <>{children}</>
}
