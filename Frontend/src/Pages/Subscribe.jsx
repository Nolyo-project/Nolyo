import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { formatPrice, plans as catalog } from '../data/plans'

const fieldClass =
  'mt-1.5 w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none transition focus:border-copper'

function Subscribe() {
  const [params, setParams] = useSearchParams()
  const [plans, setPlans] = useState(catalog)
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  const planFromUrl = params.get('plan')
  const plan = planFromUrl === 'pro' || planFromUrl === 'essentiel' ? planFromUrl : 'essentiel'

  useEffect(() => {
    if (planFromUrl !== 'pro' && planFromUrl !== 'essentiel') {
      setParams({ plan: 'essentiel' }, { replace: true })
    }
  }, [planFromUrl, setParams])

  useEffect(() => {
    api('/api/requests/plans')
      .then((data) => {
        if (Array.isArray(data.plans) && data.plans.length) setPlans(data.plans)
      })
      .catch(() => {})
  }, [])

  const selected = useMemo(
    () => plans.find((item) => item.id === plan) || plans[0],
    [plan, plans],
  )

  function choosePlan(id) {
    setParams({ plan: id }, { replace: true })
  }

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setPending(true)

    try {
      await api('/api/requests', {
        method: 'POST',
        body: {
          ...form,
          plan: selected.id,
          teamSize: '2',
        },
      })
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div>
        <p className="text-xs font-semibold tracking-[0.22em] text-copper uppercase">Demande reçue</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Merci, {form.name.split(' ')[0]}.
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Votre demande pour l’offre {selected.name} a été transmise au président. Après devis
          signé et paiement, vous recevrez votre code unique.
        </p>
        <Link
          to="/login"
          className="mt-8 flex w-full items-center justify-center rounded-full bg-moss py-3 text-sm font-semibold text-cream transition hover:bg-ink"
        >
          Se connecter
        </Link>
        <p className="mt-4 text-center text-xs text-ink-soft">
          Vous avez déjà un code ?{' '}
          <Link to="/inscription" className="font-semibold text-ink">
            S’inscrire
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.22em] text-copper uppercase">
        Demande d’abonnement
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Envoyez votre demande.</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Déjà un code ?{' '}
        <Link to="/inscription" className="font-semibold text-ink underline decoration-copper/50">
          S’inscrire
        </Link>
        {' · '}
        <Link to="/login" className="font-semibold text-ink underline decoration-copper/50">
          Se connecter
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <fieldset>
          <legend className="text-sm font-medium">Offre</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {plans.map((item) => {
              const active = item.id === selected.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => choosePlan(item.id)}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? 'border-copper bg-cream shadow-sm shadow-copper/10'
                      : 'border-ink/10 bg-cream/70 hover:border-ink/20'
                  }`}
                >
                  <p className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
                    {item.id === 'pro' ? 'Pro' : 'Essentiel'}
                  </p>
                  <p className="mt-1 font-display text-xl leading-tight">
                    {formatPrice(item.price)}
                    <span className="ml-0.5 text-sm text-ink-soft"> / {item.period}</span>
                  </p>
                  {item.trial ? <p className="mt-1 text-[11px] text-moss">{item.trial}</p> : null}
                </button>
              )
            })}
          </div>
        </fieldset>

        <label className="block text-sm font-medium">
          Nom
          <input className={fieldClass} name="name" value={form.name} onChange={update} required />
        </label>
        <label className="block text-sm font-medium">
          E-mail
          <input
            className={fieldClass}
            type="email"
            name="email"
            value={form.email}
            onChange={update}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Société ou activité
          <input
            className={fieldClass}
            name="company"
            value={form.company}
            onChange={update}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Message (optionnel)
          <textarea
            className={`${fieldClass} min-h-24 resize-y`}
            name="message"
            value={form.message}
            onChange={update}
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
          {pending ? 'Envoi…' : `Envoyer ma demande · ${selected.name}`}
        </button>
      </form>
    </div>
  )
}

export default Subscribe
