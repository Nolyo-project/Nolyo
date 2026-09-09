import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { isAdminHost } from '../config/site'
import { useAuth } from '../context/AuthContext'
import PageLoader from './PageLoader'
import ComingSoonPage from '../Pages/ComingSoonPage'

const ALLOWED_PREFIXES = [
  '/login',
  '/dashboard',
  '/onboarding',
  '/facture',
  '/inscription',
  '/president',
  '/mentions-legales',
  '/cgv',
  '/politique-confidentialite',
]

function pathAllowed(pathname) {
  return ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isLocalHost(hostname = window.location.hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')
}

/** Affiche la page bientôt / maintenance sur le site public si le fondateur l’active. */
export default function SiteStatusGate({ children }) {
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // En local : toujours le site complet (pour développer / filmer)
    if (isAdminHost() || isLocalHost()) {
      setStatus({ mode: 'live', active: false })
      setLoading(false)
      return undefined
    }
    let cancelled = false
    api('/api/public/site-status')
      .then((data) => {
        if (!cancelled) setStatus(data.status || { mode: 'live', active: false })
      })
      .catch(() => {
        if (!cancelled) setStatus({ mode: 'live', active: false })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  if (isAdminHost() || isLocalHost()) return children
  if (loading || authLoading) return <PageLoader />

  const gated = Boolean(status?.active)
  if (!gated) return children

  // Fondateur connecté : voit tout le site (y compris la landing)
  if (user?.role === 'president') return children

  // Membres : espaces privés uniquement
  if (user && pathAllowed(location.pathname)) return children
  if (!user && pathAllowed(location.pathname)) return children

  return <ComingSoonPage status={status} />
}
