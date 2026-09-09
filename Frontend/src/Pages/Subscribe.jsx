import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { consumePreviewExit, peekPreviewPlan } from '../auth/previewSession'
import { formatPrice, paymentNote, plans as catalog } from '../data/plans'

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
  const trialEnded = params.get('essai') === 'termine'
  const plan = planFromUrl === 'pro' || planFromUrl === 'essentiel' ? planFromUrl : 'essentiel'

  useEffect(() => {
    consumePreviewExit()
  }, [])

  useEffect(() => {
    if (planFromUrl === 'pro' || planFromUrl === 'essentiel') return
    const fallback = trialEnded ? peekPreviewPlan() : 'essentiel'
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('plan', fallback)
        return next
      },
      { replace: true },
    )
  }, [planFromUrl, setParams, trialEnded])

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
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('plan', id)
        return next
      },
      { replace: true },
    )
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
          Un e-mail de confirmation vous a été envoyé. Nous vous adressons un devis. Dès qu’il est signé, vous recevez
          votre code unique. Le premier mois est offert.
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
      {trialEnded ? (
        <p className="mt-4 rounded-2xl bg-moss px-4 py-3 text-sm text-cream">
          L’essai est terminé. Vous avez testé{' '}
          {plan === 'essentiel' ? 'Nolyo Essentiel' : 'Nolyo Pro'} — demandez la formule qui vous convient. Le premier
          mois est offert.
        </p>
      ) : null}
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
      <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft ring-1 ring-ink/8">{paymentNote}</p>

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
                  <p className="mt-2 inline-flex rounded-full bg-copper px-2.5 py-0.5 text-[11px] font-semibold text-cream">
                    1er mois offert
                  </p>
                </button>
              )
            })}
          </div>
        </fieldset>

        <label className="block text-sm font-medium">
          Nom et prénom
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
