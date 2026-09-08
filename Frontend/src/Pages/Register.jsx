import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { homeForUser } from '../auth/homeForUser'
import { useAuth } from '../context/AuthContext'

const fieldClass =
  'mt-1.5 w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none transition focus:border-copper'

function Register() {
  const { user, loading, register } = useAuth()
  const [params] = useSearchParams()
  const [form, setForm] = useState({
    code: params.get('code') || '',
    name: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setPending(true)
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        code: form.code,
      })
    } catch (err) {
      setError(err.message)
      setPending(false)
    }
  }

  if (!loading && user) {
    return <Navigate to={homeForUser(user)} replace />
  }

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.22em] text-copper uppercase">Inscription</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Entrez votre code.</h1>
      <p className="mt-2 text-sm text-ink-soft">
        L’inscription n’est possible qu’avec le code unique remis par le président, après devis
        signé et paiement.{' '}
        <Link to="/abonnement" className="font-semibold text-ink underline decoration-copper/50">
          Faire une demande
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block text-sm font-medium">
          Code unique
          <input
            className={`${fieldClass} font-mono tracking-wide uppercase`}
            name="code"
            value={form.code}
            onChange={update}
            placeholder="NOLYO-XXXX-XXXX"
            autoComplete="off"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Nom
          <input
            className={fieldClass}
            type="text"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={update}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          E-mail de la demande
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
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={update}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Confirmer le mot de passe
          <input
            className={fieldClass}
            type="password"
            name="confirm"
            autoComplete="new-password"
            value={form.confirm}
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
          {pending ? 'Création…' : 'Ouvrir mon espace'}
        </button>
        <p className="text-center text-xs text-ink-soft">
          Déjà un espace ?{' '}
          <Link to="/login" className="font-semibold text-ink">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Register
