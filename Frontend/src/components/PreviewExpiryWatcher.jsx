import { useContext, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

function PreviewExpiryWatcher() {
  const auth = useContext(AuthContext)
  const navigate = useNavigate()
  const endedRef = useRef(false)

  useEffect(() => {
    if (!auth) return undefined
    const { user, logout } = auth
    if (!user?.preview || !user.previewExpiresAt) {
      endedRef.current = false
      return undefined
    }

    const tick = () => {
      if (endedRef.current) return
      if (Date.now() >= new Date(user.previewExpiresAt).getTime()) {
        endedRef.current = true
        const plan = user.previewPlan === 'essentiel' ? 'essentiel' : 'pro'
        logout('subscribe')
        navigate(`/abonnement?plan=${plan}&essai=termine`, { replace: true })
      }
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [auth, navigate])

  return null
}

export default PreviewExpiryWatcher
