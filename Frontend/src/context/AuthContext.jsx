import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)
const TOKEN_KEY = 'nolio_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(true)

  const persist = useCallback((nextToken, nextUser) => {
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const logout = useCallback(() => {
    persist(null, null)
  }, [persist])

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
        if (!cancelled) persist(null, null)
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

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      updateUser,
      isPresident: user?.role === 'president',
      isSubscribed: user?.role === 'member' && user?.subscription?.status === 'active',
    }),
    [user, token, loading, login, register, logout, updateUser],
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
