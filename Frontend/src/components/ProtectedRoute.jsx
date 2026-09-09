import { Navigate, useLocation } from 'react-router-dom'
import { homeForUser, needsOnboarding } from '../auth/homeForUser'
import { consumePreviewExit, consumePreviewPlan } from '../auth/previewSession'
import { isAdminHost } from '../config/site'
import { useAuth } from '../context/AuthContext'
import { needsPayment } from '../data/billing'
import PageLoader from './PageLoader'

export function ProtectedRoute({ children, requireSubscription = false, requirePresident = false }) {
  const { user, loading, isSubscribed, isPresident } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (requirePresident) {
    if (!user) {
      if (isAdminHost()) return <Navigate to="/login" replace />
      return <Navigate to="/" replace />
    }
    if (!isPresident) return <Navigate to="/" replace />
    return children
  }

  if (!user) {
    const exit = consumePreviewExit()
    if (exit === 'subscribe') {
      const plan = consumePreviewPlan()
      return <Navigate to={`/abonnement?plan=${plan}&essai=termine`} replace />
    }
    if (exit === 'home') {
      return <Navigate to="/" replace />
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requireSubscription) {
    if (isPresident) return <Navigate to={homeForUser(user)} replace />
    if (needsPayment(user)) return <Navigate to="/facture" replace />
    if (!isSubscribed) return <Navigate to="/inscription" replace />
    const onOnboarding = location.pathname === '/onboarding'
    if (needsOnboarding(user) && !onOnboarding) {
      return <Navigate to="/onboarding" replace />
    }
    if (!needsOnboarding(user) && onOnboarding) {
      return <Navigate to="/dashboard" replace />
    }
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
