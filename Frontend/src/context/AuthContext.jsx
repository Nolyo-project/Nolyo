import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import {
  hasPreviewSession,
  markPreviewExit,
  markPreviewPlan,
  markPreviewSession,
  peekPreviewPlan,
} from '../auth/previewSession'
import { hasWorkspaceAccess } from '../data/billing'

const AuthContext = createContext(null)
const TOKEN_KEY = 'nolio_token'

export { AuthContext }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(true)

  const persist = useCallback((nextToken, nextUser) => {
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken)
      if (nextUser?.preview) {
        markPreviewSession(true)
        markPreviewPlan(nextUser.previewPlan || nextUser.subscription?.plan || 'pro')
      } else markPreviewSession(false)
    } else {
      localStorage.removeItem(TOKEN_KEY)
      markPreviewSession(false)
    }
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const logout = useCallback(
    (exitTo) => {
      if (exitTo === 'subscribe' || exitTo === 'home') {
        const plan = user?.previewPlan || user?.subscription?.plan || peekPreviewPlan()
        markPreviewPlan(plan)
        markPreviewExit(exitTo)
      }
      persist(null, null)
    },
    [persist, user],
  )

  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    api('/api/auth/me', { token })
      .then((data) => {
        if (!cancelled) setUser(data.user)
      })
      .catch(() => {
        if (!cancelled) {
          if (hasPreviewSession()) {
            markPreviewExit('subscribe')
          }
          persist(null, null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, persist])

  const login = useCallback(
    async (email, password) => {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      persist(data.token, data.user)
      return data.user
    },
    [persist],
  )

  const register = useCallback(
    async ({ name, email, password, code }) => {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: { name, email, password, code },
      })
      persist(data.token, data.user)
      return data.user
    },
    [persist],
  )

  const startPreview = useCallback(async (plan = 'pro') => {
    const { getAnalyticsSessionId, gaEvent } = await import('../utils/analytics')
    const previewPlan = plan === 'essentiel' ? 'essentiel' : 'pro'
    const data = await api('/api/auth/preview', {
      method: 'POST',
      body: { plan: previewPlan, sessionId: getAnalyticsSessionId() },
    })
    gaEvent('preview_start', { plan: previewPlan })
    persist(data.token, data.user)
    return data.user
  }, [persist])

  const completeOnboarding = useCallback(async (body) => {
    const data = await api('/api/auth/onboarding', {
      method: 'POST',
      body,
    })
    setUser(data.user)
    return data.user
  }, [])

  const updateUser = useCallback((nextUser) => {
    setUser((current) => {
      if (!current?.preview) return nextUser
      return {
        ...nextUser,
        preview: true,
        previewPlan: current.previewPlan || nextUser.previewPlan || 'pro',
        previewExpiresAt: current.previewExpiresAt,
        subscription: {
          ...(nextUser.subscription || {}),
          plan: current.previewPlan || nextUser.previewPlan || nextUser.subscription?.plan || 'pro',
        },
      }
    })
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) return null
    const data = await api('/api/auth/me', { token })
    setUser(data.user)
    return data.user
  }, [token])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      startPreview,
      logout,
      updateUser,
      refreshUser,
      completeOnboarding,
      isPresident: user?.role === 'president',
      isPreview: Boolean(user?.preview),
      isSubscribed: hasWorkspaceAccess(user) && user?.role === 'member',
    }),
    [user, token, loading, login, register, startPreview, logout, updateUser, refreshUser, completeOnboarding],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
