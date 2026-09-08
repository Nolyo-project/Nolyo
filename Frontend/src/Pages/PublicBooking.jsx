import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { homeForUser } from '../auth/homeForUser'
import { copyForTrade } from '../data/trades'
import { isQuoteService, publicPageStyle, servicePriceLabel } from '../data/pageTheme'
import { buildIcs, downloadIcs, googleCalendarUrl } from '../data/calendarEvent'
import Logo from '../components/Logo'
import { formatLongDate, formatMoney, formatTime } from './dashboard/format'
import { primaryBtn, quietBtn } from './dashboard/ui'

const emptyGuest = { firstName: '', lastName: '', email: '', phone: '' }
const pageFieldClass =
  'page-field mt-1.5 w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm outline-none transition focus:border-[var(--page-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--page-accent)_20%,transparent)]'

function PublicBooking() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const [page, setPage] = useState(null)
  const [services, setServices] = useState([])
  const [error, setError] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [days, setDays] = useState([])
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState(null)
  const [guest, setGuest] = useState(emptyGuest)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(null)
  const submittingRef = useRef(false)

  const service = services.find((item) => item._id === serviceId) || null
  const copy = copyForTrade(page?.trade)
  const isOwner = Boolean(user?.page?.slug) && user.page.slug === String(slug || '').toLowerCase()
  const selectedDay = days.find((item) => item.date === date)
  const quoteSelected = isQuoteService(service)

  useEffect(() => {
    setPage(null)
    setError('')
    setDone(null)
    api(`/api/public/pages/${slug}/booking`)
      .then((data) => {
        setPage(data.page)
        const next = data.services || []
        setServices(next)
        const wanted = params.get('service')
        const type = params.get('type')
        const match = wanted && next.find((item) => item._id === wanted)
        const quote = next.find((item) => isQuoteService(item))
        if (match) setServiceId(match._id)
        else if (type === 'devis' && quote) setServiceId(quote._id)
      })
      .catch((err) => setError(err.message))
  }, [slug, params])

  useEffect(() => {
    if (!serviceId) {
      setDays([])
      setDate('')
      setSlot(null)
      return undefined
    }
    let cancelled = false
    api(`/api/public/pages/${slug}/availability?service=${encodeURIComponent(serviceId)}`)
      .then((data) => {
        if (cancelled) return
        const nextDays = data.days || []
        setDays(nextDays)
        setDate((current) => (nextDays.some((item) => item.date === current) ? current : nextDays[0]?.date || ''))
        setSlot(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [serviceId, slug])

  const dayLabels = useMemo(
    () =>
      days.map((item) => {
        const [year, month, day] = item.date.split('-').map(Number)
        const value = new Date(year, month - 1, day)
        return {
          date: item.date,
          weekday: value.toLocaleDateString('fr-FR', { weekday: 'short' }),
          day: value.toLocaleDateString('fr-FR', { day: 'numeric' }),
          month: value.toLocaleDateString('fr-FR', { month: 'short' }),
        }
      }),
    [days],
  )

  function updateGuest(event) {
    setGuest((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!service || !slot || submittingRef.current) return
    submittingRef.current = true
    setError('')
    setPending(true)
    try {
      const data = await api(`/api/public/pages/${slug}/book`, {
        method: 'POST',
        body: {
          service: service._id,
          startAt: slot.startAt,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone,
        },
      })
      setDone({
        ...data,
        firstName: guest.firstName.trim(),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      submittingRef.current = false
      setPending(false)
    }
  }

  if (error && !page) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-paper px-5 text-center">
        <Logo />
        <p className="mt-8 font-display text-3xl">Réservation indisponible.</p>
        <p className="mt-2 text-sm text-ink-soft">{error}</p>
        <Link to={`/p/${slug}`} className="mt-6 text-sm underline">
          Retour à la page
        </Link>
      </div>
    )
  }

  if (!page) {
    return <p className="px-5 py-24 text-center text-ink-soft">Chargement…</p>
  }

  const initial = (page.title || page.name || 'N').slice(0, 1).toUpperCase()
  const themeStyle = publicPageStyle(page.theme)
  const quoteDone = done?.appointment?.kind === 'quote'
  const appointment = done?.appointment
  const calendarTitle = appointment
    ? `${appointment.serviceName || (quoteDone ? 'Rendez-vous' : 'Rendez-vous')} — ${page.name || page.title}`
    : ''
  const calendarDescription = quoteDone
    ? `Échange pour un devis avec ${page.name || page.title}.`
    : `Rendez-vous chez ${page.name || page.title}.`
  const calendarLocation = page.address || ''
  const icsPayload = appointment
    ? {
        title: calendarTitle,
        startAt: appointment.startAt,
        durationMinutes: appointment.durationMinutes,
        description: calendarDescription,
        location: calendarLocation,
        uid: `${slug}-${new Date(appointment.startAt).getTime()}@nolyo.app`,
      }
    : null
  const googleHref = icsPayload ? googleCalendarUrl(icsPayload) : ''

  function addToCalendar() {
    if (!icsPayload) return
    downloadIcs(buildIcs(icsPayload), 'rendez-vous.ics')
  }

  if (done) {
    return (
      <div className="public-page min-h-svh" style={themeStyle}>
        <div className="mx-auto flex min-h-svh max-w-lg flex-col px-5 py-8 sm:px-8">
          <header className="flex items-center justify-between gap-3">
            <Link to={`/p/${slug}`} className="min-w-0 truncate text-[11px] font-semibold tracking-[0.26em] uppercase opacity-70">
              {page.name}
            </Link>
            <Logo />
          </header>

          <div className="flex flex-1 items-center justify-center py-10">
            <section className="page-card w-full rounded-[2rem] px-6 py-10 text-center ring-1 ring-ink/8 sm:px-10">
              <span className="page-cta mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl" aria-hidden>
                ✓
              </span>
              <p className="page-accent mt-6 text-[11px] font-semibold tracking-[0.2em] uppercase">
                {quoteDone ? 'Rendez-vous confirmé' : 'Réservation confirmée'}
              </p>
              <h1 className="mt-3 font-display text-4xl tracking-tight">
                Merci{done.firstName ? `, ${done.firstName}` : ''}.
              </h1>
              <p className="page-muted mx-auto mt-4 max-w-sm text-base leading-relaxed">
                {quoteDone
                  ? 'Votre créneau est gardé pour parler du projet. Le devis se prépare après cet échange.'
                  : 'Votre place est gardée. On a hâte de vous recevoir.'}
              </p>
              <div className="mx-auto mt-7 max-w-sm rounded-2xl bg-[color-mix(in_srgb,var(--page-bg)_70%,transparent)] px-5 py-4 text-left">
                <p className="font-medium">{appointment?.serviceName}</p>
                <p className="page-muted mt-1 text-sm">
                  {formatLongDate(appointment?.startAt)} à {formatTime(appointment?.startAt)}
                  {appointment?.durationMinutes ? ` · ${appointment.durationMinutes} min` : ''}
                </p>
                {calendarLocation ? <p className="page-muted mt-1 text-sm">{calendarLocation}</p> : null}
                {!quoteDone && appointment?.servicePrice ? (
                  <p className="mt-2 font-display">{formatMoney(appointment.servicePrice)}</p>
                ) : null}
              </div>
              <div className="mt-8 space-y-3">
                <button type="button" onClick={addToCalendar} className={`${primaryBtn} page-cta w-full border-0`}>
                  Ajouter à l’agenda
                </button>
                {googleHref ? (
                  <a href={googleHref} target="_blank" rel="noreferrer" className={`${quietBtn} block text-sm`}>
                    Ouvrir dans Google Agenda
                  </a>
                ) : null}
                <p className="page-muted text-xs">iPhone, Android, Google Agenda.</p>
              </div>
              <Link to={`/p/${slug}`} className="page-muted mt-8 inline-block text-sm underline decoration-ink/20 underline-offset-4">
                Retour à la page
              </Link>
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="public-page min-h-svh" style={themeStyle}>
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link to={`/p/${slug}`} className="min-w-0 truncate text-[11px] font-semibold tracking-[0.26em] text-ink-soft uppercase">
            {page.name}
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            {isOwner ? (
              <Link
                to={homeForUser(user)}
                className="rounded-full bg-cream px-4 py-2 text-sm font-semibold ring-1 ring-ink/8"
              >
                Tableau de bord
              </Link>
            ) : null}
            <Logo />
          </div>
        </header>

        <div className="mt-10 flex items-center gap-4">
          {page.avatar ? (
            <img src={page.avatar} alt="" className="h-16 w-16 rounded-full object-cover ring-4 ring-cream" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--page-accent)] font-display text-2xl text-[var(--page-accent-ink)]">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="page-accent text-[11px] font-semibold tracking-[0.2em] uppercase">
              {quoteSelected ? copy.quoteCta : copy.bookingCta}
            </p>
            <h1 className="font-display text-3xl tracking-tight">{page.title}</h1>
          </div>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-8">
            <section className="page-card rounded-[1.6rem] px-6 py-7 ring-1 ring-ink/8 sm:px-8">
              <h2 className="font-display text-2xl">Prestation</h2>
              {services.length === 0 ? (
                <p className="page-muted mt-3 text-sm">Les réservations en ligne ne sont pas encore ouvertes.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {services.map((item) => {
                    const active = item._id === serviceId
                    return (
                      <li key={item._id}>
                        <button
                          type="button"
                          onClick={() => setServiceId(item._id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left ring-1 transition ${
                            active
                              ? 'page-chip-active ring-[var(--page-accent)]'
                              : 'page-chip ring-ink/8 hover:ring-[var(--page-accent)]'
                          }`}
                        >
                          <span>
                            <span className="block font-medium">{item.name}</span>
                            <span className={`mt-0.5 block text-xs ${active ? 'opacity-75' : 'page-muted'}`}>
                              {item.durationMinutes} min
                              {isQuoteService(item) ? ' · pour cadrer le projet' : ''}
                            </span>
                          </span>
                          <span className="shrink-0 font-display text-lg">{servicePriceLabel(item, formatMoney)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {service ? (
              <section className="page-card rounded-[1.6rem] px-6 py-7 ring-1 ring-ink/8 sm:px-8">
                <h2 className="font-display text-2xl">Date et horaire</h2>
                {quoteSelected ? (
                  <p className="page-muted mt-2 text-sm">
                    Un créneau pour parler du projet. Le devis se fait ensuite, après ce rendez-vous.
                  </p>
                ) : null}
                {days.length === 0 ? (
                  <p className="page-muted mt-3 text-sm">Aucun créneau libre sur les trois prochaines semaines.</p>
                ) : (
                  <>
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                      {dayLabels.map((item) => {
                        const active = item.date === date
                        return (
                          <button
                            key={item.date}
                            type="button"
                            onClick={() => {
                              setDate(item.date)
                              setSlot(null)
                            }}
                            className={`min-w-16 rounded-2xl px-3 py-3 text-center ${
                              active ? 'page-chip-active' : 'page-chip ring-1 ring-ink/8'
                            }`}
                          >
                            <span className={`block text-[11px] uppercase ${active ? 'opacity-75' : 'page-muted'}`}>
                              {item.weekday}
                            </span>
                            <span className="mt-0.5 block text-sm font-semibold">{item.day}</span>
                            <span className={`block text-[11px] ${active ? 'opacity-75' : 'page-muted'}`}>
                              {item.month}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(selectedDay?.slots || []).map((item) => {
                        const active = slot?.startAt === item.startAt
                        return (
                          <button
                            key={item.startAt}
                            type="button"
                            onClick={() => setSlot(item)}
                            className={`rounded-full px-4 py-2 text-sm ${
                              active ? 'page-chip-active' : 'page-chip ring-1 ring-ink/10 hover:ring-[var(--page-accent)]'
                            }`}
                          >
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </section>
            ) : null}

            {slot ? (
              <section className="page-card rounded-[1.6rem] px-6 py-7 ring-1 ring-ink/8 sm:px-8">
                <h2 className="font-display text-2xl">Vos informations</h2>
                <p className="page-muted mt-1 text-sm">
                  {service.name} · {formatLongDate(slot.startAt)} à {formatTime(slot.startAt)}
                  {quoteSelected ? '' : ` · ${formatMoney(service.price)}`}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Prénom
                    <input className={pageFieldClass} name="firstName" value={guest.firstName} onChange={updateGuest} required />
                  </label>
                  <label className="block text-sm font-medium">
                    Nom
                    <input className={pageFieldClass} name="lastName" value={guest.lastName} onChange={updateGuest} required />
                  </label>
                  <label className="block text-sm font-medium sm:col-span-2">
                    E-mail
                    <input className={pageFieldClass} type="email" name="email" value={guest.email} onChange={updateGuest} required />
                  </label>
                  <label className="block text-sm font-medium sm:col-span-2">
                    Téléphone
                    <input className={pageFieldClass} name="phone" value={guest.phone} onChange={updateGuest} placeholder="Optionnel" />
                  </label>
                </div>
                {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button type="submit" disabled={pending} className={`${primaryBtn} page-cta border-0`}>
                    {pending ? 'Confirmation…' : quoteSelected ? 'Confirmer le rendez-vous' : 'Confirmer le rendez-vous'}
                  </button>
                  <button type="button" className={quietBtn} onClick={() => setSlot(null)}>
                    Changer d’horaire
                  </button>
                </div>
              </section>
            ) : error && page ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
            ) : null}
          </form>

        <p className="mt-10 text-center text-xs text-ink-soft">
          <Link to={`/p/${slug}`} className="underline decoration-ink/20 underline-offset-2 hover:text-ink">
            Retour à la page
          </Link>
        </p>
      </div>
    </div>
  )
}

export default PublicBooking
