import { Navigate, useLocation } from 'react-router-dom'
import { homeForUser } from '../auth/homeForUser'
import { useAuth } from '../context/AuthContext'
import PageLoader from './PageLoader'

export function ProtectedRoute({ children, requireSubscription = false, requirePresident = false }) {
  const { user, loading, isSubscribed, isPresident } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requirePresident && !isPresident) {
    return <Navigate to={homeForUser(user)} replace />
  }

  if (requireSubscription) {
    if (isPresident) return <Navigate to="/president" replace />
    if (!isSubscribed) return <Navigate to="/inscription" replace />
  }

  return children
}

export function GuestOnly({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader />

  if (user) {
    return <Navigate to={homeForUser(user)} replace />
  }

  return children
}
