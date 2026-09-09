import { useContext, useEffect, useRef } from 'react'
import { AuthContext } from '../context/AuthContext'

function subscribeUrl(plan) {
  const safe = plan === 'essentiel' ? 'essentiel' : 'pro'
  return `/abonnement?plan=${safe}&essai=termine`
}

function PreviewExpiryWatcher() {
  const auth = useContext(AuthContext)
  const endedRef = useRef(false)

  useEffect(() => {
    if (!auth) return undefined
    const { user, logout } = auth
    if (!user?.preview || !user.previewExpiresAt) {
      endedRef.current = false
      return undefined
    }

    const endPreview = () => {
      if (endedRef.current) return
      endedRef.current = true
      const plan = user.previewPlan === 'essentiel' ? 'essentiel' : 'pro'
      logout('subscribe')
      // Redirection dure : après logout, le dashboard protégé ne doit pas intercepter
      window.location.replace(subscribeUrl(plan))
    }

    const tick = () => {
      if (Date.now() >= new Date(user.previewExpiresAt).getTime()) endPreview()
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [auth])

  return null
}

export default PreviewExpiryWatcher
