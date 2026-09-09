import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { isProPlan } from '../data/plans'
import Logo from '../components/Logo'
import { TRADE_LIST, WORK_MODES, copyForTrade } from '../data/trades'
import { formatMoney } from './dashboard/format'

const fieldClass =
  'mt-1.5 w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none transition focus:border-copper'

function slugPreview(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function firstNameOf(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'Vous'
}

function cardClass(selected) {
  return `rounded-[1.4rem] border px-4 py-4 text-left transition ${
    selected
      ? 'border-copper bg-cream shadow-sm ring-1 ring-copper/30'
      : 'border-ink/10 bg-cream/60 hover:border-copper/40 hover:bg-cream'
  }`
}

function Onboarding() {
  const { user, completeOnboarding, logout } = useAuth()
  const navigate = useNavigate()
  const firstName = firstNameOf(user.name)
  const [step, setStep] = useState(0)
  const [catalog, setCatalog] = useState([])
  const [preparePage, setPreparePage] = useState(() => isProPlan(user))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [copyDirty, setCopyDirty] = useState(false)
  const [form, setForm] = useState({
    trade: '',
    tradeLabel: '',
    company: user.subscription?.company || '',
    city: user.business?.city || '',
    workMode: '',
    displayAs: 'company',
    title: '',
    description: '',
    services: [],
  })

  const stepIds = preparePage
    ? ['trade', 'identity', 'rhythm', 'page', 'services', 'billing']
    : ['trade', 'identity', 'rhythm', 'services', 'billing']
  const current = stepIds[step] || 'trade'
  const lastIndex = stepIds.length - 1

  useEffect(() => {
    api('/api/auth/onboarding')
      .then((data) => {
        setCatalog(data.trades || [])
        if (typeof data.preparePage === 'boolean') setPreparePage(data.preparePage)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.trade || !catalog.length) return
    const names = (catalog.find((item) => item.id === form.trade)?.services || []).map((item) => item.name)
    setForm((currentForm) => {
      if (currentForm.services.length || !names.length) return currentForm
      return { ...currentForm, services: names }
    })
  }, [catalog, form.trade])

  const tradeCopy = copyForTrade(form.trade)
  const suggested = catalog.find((item) => item.id === form.trade)?.services || []

  const title = copyDirty
    ? form.title
    : form.company.trim().length >= 2
      ? tradeCopy.pageTitle(form.company.trim(), form.city.trim())
      : ''
  const description = copyDirty
    ? form.description
    : form.company.trim().length >= 2
      ? tradeCopy.pageDescription(firstName, form.company.trim(), form.city.trim())
      : ''

  const slug = slugPreview(form.company)

  function setField(name, value) {
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function chooseTrade(id) {
    const services = (catalog.find((item) => item.id === id)?.services || []).map((item) => item.name)
    setCopyDirty(false)
    setForm((currentForm) => ({
      ...currentForm,
      trade: id,
      tradeLabel: id === 'other' ? currentForm.tradeLabel : '',
      services,
    }))
  }

  function toggleService(name) {
    setForm((currentForm) => {
      const has = currentForm.services.includes(name)
      return {
        ...currentForm,
        services: has ? currentForm.services.filter((item) => item !== name) : [...currentForm.services, name],
      }
    })
  }

  const canNext = useMemo(() => {
    if (current === 'trade') return Boolean(form.trade)
    if (current === 'identity') {
      if (form.company.trim().length < 2) return false
      if (form.trade === 'other' && form.tradeLabel.trim().length < 2) return false
      return true
    }
    if (current === 'rhythm') return Boolean(form.workMode)
    if (current === 'page') return title.trim().length >= 2
    return true
  }, [current, form, title])

  function goNext() {
    setError('')
    if (!canNext) return
    setStep((index) => Math.min(lastIndex, index + 1))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (step < lastIndex) {
      goNext()
      return
    }
    setError('')
    setPending(true)
    try {
      await completeOnboarding({
        trade: form.trade,
        tradeLabel: form.tradeLabel.trim(),
        company: form.company.trim(),
        city: form.city.trim(),
        workMode: form.workMode,
        displayAs: form.displayAs,
        title: preparePage ? title.trim() : '',
        description: preparePage ? description.trim() : '',
        services: form.services,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-svh bg-paper text-ink">
      <div className="mx-auto flex min-h-svh max-w-2xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <Logo to="/" />
          <button type="button" onClick={logout} className="text-sm text-ink-soft hover:text-ink">
            Déconnexion
          </button>
        </header>

        <div className="mt-8 flex gap-2" aria-hidden>
          {stepIds.map((id, index) => (
            <span
              key={id}
              className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-copper' : 'bg-ink/10'}`}
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">
          {step + 1} / {stepIds.length}
          {preparePage ? ' · Nolyo Pro' : ' · Nolyo Essentiel'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          {current === 'trade' ? (
            <section className="mt-4">
              <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Quel est votre métier ?</h1>
              <p className="mt-3 text-ink-soft">
                Agenda, acomptes, mots de l’espace : Nolyo se règle sur votre façon de travailler.
                {preparePage ? ' On prépare aussi votre page professionnelle.' : ''}
              </p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {TRADE_LIST.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => chooseTrade(item.id)}
                      className={`${cardClass(form.trade === item.id)} w-full`}
                    >
                      <span className="block font-medium">{item.label}</span>
                      <span className="mt-1 block text-sm text-ink-soft">{item.hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {current === 'identity' ? (
            <section className="mt-4">
              <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Comment vous présente-t-on ?</h1>
              <p className="mt-3 text-ink-soft">
                {preparePage
                  ? 'Ce nom apparaîtra sur votre page et dans votre espace.'
                  : 'Ce nom apparaîtra dans votre espace.'}
              </p>
              <div className="mt-8 space-y-4">
                {form.trade === 'other' ? (
                  <label className="block text-sm font-medium">
                    Votre métier
                    <input
                      className={fieldClass}
                      value={form.tradeLabel}
                      onChange={(event) => setField('tradeLabel', event.target.value)}
                      placeholder="Céramiste, architecte d’intérieur…"
                      required
                    />
                  </label>
                ) : null}
                <label className="block text-sm font-medium">
                  Nom de l’activité
                  <input
                    className={fieldClass}
                    value={form.company}
                    onChange={(event) => setField('company', event.target.value)}
                    placeholder="Maison Sève, Atelier Lina…"
                    required
                  />
                </label>
                <label className="block text-sm font-medium">
                  Ville <span className="font-normal text-ink-soft">(facultatif)</span>
                  <input
                    className={fieldClass}
                    value={form.city}
                    onChange={(event) => setField('city', event.target.value)}
                    placeholder="Lyon"
                  />
                </label>
                <div>
                  <p className="text-sm font-medium">Affiché dans votre espace</p>
                  <p className="mt-1 text-sm text-ink-soft">Vous pourrez changer ça dans les paramètres.</p>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    <li>
                      <button
                        type="button"
                        onClick={() => setField('displayAs', 'company')}
                        className={`${cardClass(form.displayAs === 'company')} w-full`}
                      >
                        <span className="block font-medium">Nom de l’activité</span>
                        <span className="mt-1 block text-sm text-ink-soft">
                          {form.company.trim() || 'Maison Sève, Atelier Lina…'}
                        </span>
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => setField('displayAs', 'person')}
                        className={`${cardClass(form.displayAs === 'person')} w-full`}
                      >
                        <span className="block font-medium">Prénom et nom</span>
                        <span className="mt-1 block text-sm text-ink-soft">{user.name}</span>
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          ) : null}

          {current === 'rhythm' ? (
            <section className="mt-4">
              <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Une semaine type ?</h1>
              <p className="mt-3 text-ink-soft">On règle l’agenda et les acomptes en fonction.</p>
              <ul className="mt-8 space-y-3">
                {WORK_MODES.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setField('workMode', item.id)}
                      className={`${cardClass(form.workMode === item.id)} w-full`}
                    >
                      <span className="block font-medium">{item.label}</span>
                      <span className="mt-1 block text-sm text-ink-soft">{item.hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {current === 'page' ? (
            <section className="mt-4">
              <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Votre page professionnelle</h1>
              <p className="mt-3 text-ink-soft">
                Un texte de départ, à votre main. Visible ensuite à{' '}
                <span className="font-medium text-ink">/p/{slug || '…'}</span>
              </p>
              <div className="mt-8 space-y-4">
                <label className="block text-sm font-medium">
                  Titre
                  <input
                    className={fieldClass}
                    value={title}
                    onChange={(event) => {
                      setCopyDirty(true)
                      setField('title', event.target.value)
                    }}
                    required
                  />
                </label>
                <label className="block text-sm font-medium">
                  Présentation
                  <textarea
                    className={`${fieldClass} min-h-40 resize-y`}
                    value={description}
                    onChange={(event) => {
                      setCopyDirty(true)
                      setField('description', event.target.value)
                    }}
                    maxLength={800}
                  />
                </label>
              </div>
            </section>
          ) : null}

          {current === 'services' ? (
            <section className="mt-4">
              <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Des prestations pour commencer</h1>
              <p className="mt-3 text-ink-soft">
                {preparePage
                  ? 'Elles apparaîtront sur votre page de réservation. Vous pourrez tout modifier ensuite.'
                  : 'Elles serviront dans l’agenda. Vous pourrez tout modifier ensuite.'}
              </p>
              {suggested.length ? (
                <ul className="mt-8 space-y-3">
                  {suggested.map((item) => {
                    const checked = form.services.includes(item.name)
                    return (
                      <li key={item.name}>
                        <label className={`${cardClass(checked)} flex cursor-pointer items-center justify-between gap-4`}>
                          <span>
                            <span className="block font-medium">{item.name}</span>
                            <span className="mt-1 block text-sm text-ink-soft">{item.durationMinutes} min</span>
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="font-display text-lg">
                              {item.kind === 'quote' && !(Number(item.price) > 0)
                                ? 'Sur rendez-vous'
                                : formatMoney(item.price)}
                            </span>
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-copper"
                              checked={checked}
                              onChange={() => toggleService(item.name)}
                            />
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-8 rounded-[1.4rem] border border-dashed border-ink/12 bg-cream/50 px-5 py-8 text-sm text-ink-soft">
                  Pas de catalogue pour ce métier. Vous ajouterez vos prestations dans Paramètres.
                </p>
              )}
            </section>
          ) : null}

          {current === 'billing' ? (
            <section className="mt-4">
              <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Votre mois offert, puis la suite</h1>
              <p className="mt-3 text-ink-soft">
                Pendant 30 jours, Nolyo est gratuit. Deux jours avant la fin, une fenêtre s’ouvre pour choisir comment
                continuer — ainsi vous n’êtes pas surpris le jour de la facture.
              </p>
              <ul className="mt-8 space-y-4">
                <li className="rounded-[1.4rem] border border-ink/10 bg-cream/70 px-5 py-4">
                  <p className="font-medium">Prélèvement automatique</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Vous enregistrez votre carte. Stripe prélève chaque mois. Rien à faire le jour J — l’espace reste
                    ouvert.
                  </p>
                </li>
                <li className="rounded-[1.4rem] border border-ink/10 bg-cream/70 px-5 py-4">
                  <p className="font-medium">Payer chaque mois vous-même</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Vous préférez valider à la main : un lien Stripe vous est envoyé à chaque échéance.
                  </p>
                </li>
                <li className="rounded-[1.4rem] border border-ink/10 bg-cream/70 px-5 py-4">
                  <p className="font-medium">Arrêter Nolyo</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Vous pouvez aussi demander à partir. Le fondateur reçoit la demande ; s’il accepte, le compte est
                    supprimé automatiquement.
                  </p>
                </li>
              </ul>
              <p className="mt-6 text-sm text-ink-soft">
                Vous pourrez aussi enregistrer une carte plus tôt dans Paramètres → Abonnement.
              </p>
            </section>
          ) : null}

          {error ? (
            <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : null}

          <div className="mt-auto flex items-center justify-between gap-3 pt-10 pb-4">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep((index) => index - 1)
                }}
                className="rounded-full px-5 py-3 text-sm font-medium text-ink-soft hover:text-ink"
              >
                Retour
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={!canNext || pending}
              className="rounded-full bg-moss px-6 py-3 text-sm font-semibold text-cream transition hover:bg-ink disabled:opacity-60"
            >
              {pending ? 'Préparation…' : step === lastIndex ? 'Ouvrir mon espace' : 'Continuer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Onboarding
