import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const IDLE_MS = 20 * 60 * 1000
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click', 'wheel']

/**
 * Déconnecte l’utilisateur après 20 minutes sans interaction (tous les comptes).
 */
export default function IdleSessionWatcher() {
  const { user, logout, loading } = useAuth()
  const timerRef = useRef(null)
  const lastActiveRef = useRef(Date.now())

  useEffect(() => {
    if (loading || !user) return undefined

    function clearTimer() {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    function arm() {
      clearTimer()
      timerRef.current = window.setTimeout(() => {
        logout()
        const path = window.location.pathname || ''
        if (path.startsWith('/dashboard') || path.startsWith('/president') || path === '/') {
          window.location.assign('/login?idle=1')
        }
      }, IDLE_MS)
    }

    function onActivity() {
      const now = Date.now()
      if (now - lastActiveRef.current < 1000) return
      lastActiveRef.current = now
      arm()
    }

    lastActiveRef.current = Date.now()
    arm()

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true })
    }
    document.addEventListener('visibilitychange', onActivity)

    return () => {
      clearTimer()
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity)
      }
      document.removeEventListener('visibilitychange', onActivity)
    }
  }, [user, loading, logout])

  return null
}
