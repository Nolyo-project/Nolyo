import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const variants = {
  hero: 'rounded-full bg-copper px-6 py-3 text-sm font-semibold text-cream shadow-lg shadow-ink/20 transition hover:bg-copper-dark disabled:opacity-60',
  header:
    'rounded-full bg-moss px-4 py-2 text-sm font-semibold text-cream shadow-sm transition hover:bg-ink disabled:opacity-60',
  ghost:
    'rounded-full border border-cream/20 px-6 py-3 text-sm font-semibold text-cream transition hover:border-cream/40 hover:bg-cream/5 disabled:opacity-60',
  mobile:
    'mt-2 rounded-xl bg-moss px-3 py-2.5 text-center text-sm font-semibold text-cream disabled:opacity-60',
}

function TryPreviewButton({ variant = 'hero', className = '', children, onStarted, plan = 'pro' }) {
  const { user, startPreview, loading } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const styles = `${variants[variant] || variants.hero} ${className}`.trim()
  const previewPlan = plan === 'essentiel' ? 'essentiel' : 'pro'

  if (loading) return null

  if (user && !user.preview) {
    return (
      <Link to="/dashboard" className={styles}>
        Tableau de bord
      </Link>
    )
  }

  if (user?.preview) {
    return (
      <Link to="/dashboard" className={styles}>
        Continuer l’essai
      </Link>
    )
  }

  async function handleClick() {
    setError('')
    setPending(true)
    try {
      await startPreview(previewPlan)
      onStarted?.()
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <button type="button" disabled={pending} onClick={handleClick} className={styles}>
        {pending ? 'Ouverture…' : children || 'Essayer 5 minutes'}
      </button>
      {error ? (
        <span className={`max-w-xs text-xs ${variant === 'hero' || variant === 'ghost' ? 'text-red-200' : 'text-red-800'}`}>
          {error}
        </span>
      ) : null}
    </span>
  )
}

export default TryPreviewButton
