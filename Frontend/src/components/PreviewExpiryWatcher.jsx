import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function PreviewExpiryWatcher() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const endedRef = useRef(false)

  useEffect(() => {
    if (!user?.preview || !user.previewExpiresAt) {
      endedRef.current = false
      return undefined
    }

    const tick = () => {
      if (endedRef.current) return
      if (Date.now() >= new Date(user.previewExpiresAt).getTime()) {
        endedRef.current = true
        logout('subscribe')
        navigate('/abonnement?plan=pro&essai=termine', { replace: true })
      }
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [user?.preview, user?.previewExpiresAt, logout, navigate])

  return null
}

export default PreviewExpiryWatcher
