import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { homeForUser, needsOnboarding } from '../auth/homeForUser'
import { useAuth } from '../context/AuthContext'
import { adminOrigin, isAdminHost, publicSiteHref, siteOrigin } from '../config/site'

const fieldClass =
  'mt-1.5 w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none transition focus:border-copper'

function Login() {
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const admin = isAdminHost()

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setPending(true)

    try {
      const user = await login(form.email, form.password)
      if (isAdminHost() && user.role !== 'president') {
        logout()
        window.location.assign(`${siteOrigin()}/login`)
        return
      }
      if (user.role === 'president') {
        if (!isAdminHost() && adminOrigin()) {
          window.location.assign(`${adminOrigin()}/login`)
          return
        }
        navigate(homeForUser(user), { replace: true })
        return
      }
      const from = location.state?.from
      if (needsOnboarding(user)) {
        navigate('/onboarding', { replace: true })
        return
      }
      if (from && from !== '/president' && !String(from).startsWith('/president')) {
        navigate(from, { replace: true })
        return
      }
      navigate(homeForUser(user), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.22em] text-copper uppercase">
        {admin ? 'Fondateur' : 'Connexion'}
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        {admin ? 'Bureau Nolyo.' : 'Bon retour.'}
      </h1>
      {admin ? (
        <p className="mt-2 text-sm text-ink-soft">
          Espace fondateur.{' '}
          <a href={publicSiteHref('/')} className="font-semibold text-ink underline decoration-copper/50">
            Aller sur nolyo.fr
          </a>
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">
          Pas encore de code ?{' '}
          <Link to="/abonnement" className="font-semibold text-ink underline decoration-copper/50">
            Faire une demande
          </Link>
          {' · '}
          <Link to="/inscription" className="font-semibold text-ink underline decoration-copper/50">
            J’ai un code
          </Link>
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block text-sm font-medium">
          E-mail
          <input
            className={fieldClass}
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={update}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Mot de passe
          <input
            className={fieldClass}
            type="password"
            name="password"
            autoComplete="current-password"
            value={form.password}
            onChange={update}
            required
          />
        </label>

        {error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-moss py-3 text-sm font-semibold text-cream transition hover:bg-ink disabled:opacity-60"
        >
          {pending ? 'Connexion…' : 'Se connecter'}
        </button>
        {admin ? null : (
          <p className="text-center text-xs text-ink-soft">
            Mot de passe : NolioDemo2026!
            <br />
            Soins : ines@nolio.test
            <br />
            Développeur : adam@nolio.test
            <br />
            Photo : maya@nolio.test
            <br />
            Coiffure : leo@nolio.test
          </p>
        )}
      </form>
    </div>
  )
}

export default Login
