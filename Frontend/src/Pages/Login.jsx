import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { homeForUser } from '../auth/homeForUser'
import { useAuth } from '../context/AuthContext'

const fieldClass =
  'mt-1.5 w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none transition focus:border-copper'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setPending(true)

    try {
      const user = await login(form.email, form.password)
      const from = location.state?.from
      if (from) {
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
      <p className="text-xs font-semibold tracking-[0.22em] text-copper uppercase">Connexion</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Bon retour.</h1>
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
        <p className="text-center text-xs text-ink-soft">
          Pro : lea@nolio.test · NolioDemo2026!
          <br />
          Essentiel : nora@nolio.test · NolioDemo2026!
        </p>
      </form>
    </div>
  )
}

export default Login
